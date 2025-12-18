import { generateProposalWithFallback } from '../../../lib/agents/generateProposal.js'
import { sendReply, validatePlatformCredentials } from '../../../lib/integrations/replyAdapters.js'

export const config = {
    type: 'api',
    name: 'CreatorActions',
    path: '/api/deals/:dealId/actions/reply',
    method: 'POST',
    emits: ['deal.reply_sent', 'deal.declined'],
    description: 'Handles creator actions: send proposal, edit & send, or decline brand inquiries (Facebook Messenger or Email)',
    flows: ['dashboard', 'dealflow']
}

export const handler = async (req, ctx) => {
    const { dealId } = req.pathParams || {}
    const { action, customMessage } = req.body || {}

    ctx.logger.info('='.repeat(80))
    ctx.logger.info('Creator Action Request', {
        dealId,
        action,
        hasCustomMessage: !!customMessage,
        traceId: ctx.traceId
    })
    ctx.logger.info('='.repeat(80))

    // Validate request
    if (!dealId) {
        return {
            status: 400,
            body: { success: false, error: 'dealId is required' }
        }
    }

    if (!action || !['send_proposal', 'edit_send', 'decline'].includes(action)) {
        return {
            status: 400,
            body: {
                success: false,
                error: 'Invalid action. Must be one of: send_proposal, edit_send, decline'
            }
        }
    }

    if (action === 'edit_send' && !customMessage) {
        return {
            status: 400,
            body: { success: false, error: 'customMessage is required for edit_send action' }
        }
    }

    try {
        // Fetch deal
        const deal = await ctx.state.get('deals', dealId)
        if (!deal) {
            ctx.logger.warn('Deal not found', { dealId })
            return {
                status: 404,
                body: { success: false, error: 'Deal not found' }
            }
        }

        // Prevent duplicate sends
        if (deal.creatorReplySent) {
            ctx.logger.warn('Creator already sent a reply for this deal', {
                dealId,
                previousAction: deal.creatorReplyAction,
                previousReplyAt: deal.creatorReplyAt
            })
            return {
                status: 409,
                body: {
                    success: false,
                    error: 'Creator has already sent a reply for this deal',
                    previousAction: deal.creatorReplyAction
                }
            }
        }

        const platform = deal.platform || 'facebook'

        // Validate platform credentials
        const platformValidation = validatePlatformCredentials(platform)
        if (!platformValidation.valid) {
            ctx.logger.error(`${platform} credentials missing`, {
                error: platformValidation.error
            })
            return {
                status: 500,
                body: {
                    success: false,
                    error: `${platform} integration not configured properly: ${platformValidation.error}`
                }
            }
        }

        // Validate recipient information exists
        const recipientId = platform === 'email' 
            ? (deal.brand?.email || deal.brand?.platformAccountId)
            : (deal.brand?.platformAccountId || deal.brand?.senderId)
        
        if (!recipientId) {
            ctx.logger.error(`Recipient ${platform === 'email' ? 'email' : 'PSID'} not found in deal`, {
                dealId,
                platform,
                brandData: deal.brand
            })
            return {
                status: 400,
                body: {
                    success: false,
                    error: `Cannot send message: recipient information missing from deal (platform: ${platform})`
                }
            }
        }

        const timestamp = new Date().toISOString()
        let messageToSend = ''
        let newStatus = deal.status

        // Generate message based on action type
        if (action === 'send_proposal') {
            ctx.logger.info('Generating AI proposal', { dealId })

            // Default creator profile (could be fetched from state/context later)
            const creatorProfile = {
                id: 'default-creator',
                minRate: 15000,
                maxRate: 50000,
                preferredDeliverables: ['instagram_reel', 'youtube_video']
            }

            // Generate proposal with AI (context-aware)
            messageToSend = await generateProposalWithFallback(
                deal,
                creatorProfile,
                `Hi ${deal.brand?.contactPerson || deal.brand?.name || 'there'}, thank you for reaching out! I'll get back to you soon.`,
                ctx.logger,
                { action: 'send_proposal' }
            )

            newStatus = 'awaiting_response'

        } else if (action === 'edit_send') {
            ctx.logger.info('Using custom message from creator', {
                dealId,
                messageLength: customMessage.length
            })

            messageToSend = customMessage
            newStatus = 'awaiting_response'

        } else if (action === 'decline') {
            ctx.logger.info('Generating AI decline message', { dealId })

            const creatorProfile = {
                id: 'default-creator',
                minRate: 15000,
                maxRate: 50000,
                preferredDeliverables: ['instagram_reel', 'youtube_video']
            }

            // Generate context-aware decline message using AI
            messageToSend = await generateProposalWithFallback(
                deal,
                creatorProfile,
                `Hi ${deal.brand?.contactPerson || deal.brand?.name || 'there'}, thank you so much for considering me for this collaboration! I really appreciate you reaching out. Unfortunately, I'm unable to take on this project at the moment due to my current commitments. I wish you all the best with your campaign, and I hope we can work together in the future!`,
                ctx.logger,
                { action: 'decline' }
            )

            newStatus = 'declined'
        }

        // Send message using platform adapter
        ctx.logger.info(`Sending message via ${platform}`, {
            dealId,
            recipientId,
            action,
            messageLength: messageToSend.length
        })

        let replyResponse
        try {
            // Prepare email-specific options if needed
            const replyOptions = {}
            if (platform === 'email') {
                // Preserve email threading if available
                replyOptions.inReplyTo = deal.brand?.lastEmailId || null
                replyOptions.references = deal.brand?.emailReferences || null
            }

            replyResponse = await sendReply(
                platform,
                deal,
                messageToSend,
                replyOptions,
                ctx.logger
            )

            ctx.logger.info(`✅ Message successfully sent via ${platform}`, {
                dealId,
                messageId: replyResponse.messageId || replyResponse.emailId,
                action,
                platform
            })

        } catch (replyError) {
            ctx.logger.error(`❌ Failed to send message via ${platform}`, {
                dealId,
                error: replyError.message,
                stack: replyError.stack,
                platform
            })

            return {
                status: 500,
                body: {
                    success: false,
                    error: `Failed to send message via ${platform}: ${replyError.message}`
                }
            }
        }

        // Update deal with reply information
        const updatedDeal = {
            ...deal,
            status: newStatus,
            creatorReplySent: true,
            creatorReplyAt: timestamp,
            creatorReplyMessage: messageToSend,
            creatorReplyAction: action,
            history: [
                ...(deal.history || []),
                {
                    timestamp,
                    event: action === 'decline' ? 'deal_declined' : 'creator_reply_sent',
                    data: {
                        action,
                        message: messageToSend,
                        platform: platform,
                        messageId: replyResponse.messageId || replyResponse.emailId,
                        ...(platform === 'facebook' ? { facebookMessageId: replyResponse.messageId } : {}),
                        ...(platform === 'email' ? { emailId: replyResponse.emailId, subject: replyResponse.subject } : {}),
                        sentFrom: 'dashboard_creator_action'
                    }
                }
            ]
        }

        // Save updated deal
        await ctx.state.set('deals', dealId, updatedDeal)

        ctx.logger.info('✅ Deal updated with creator reply', {
            dealId,
            newStatus,
            action
        })

        // Emit appropriate event
        const eventTopic = action === 'decline' ? 'deal.declined' : 'deal.reply_sent'
        await ctx.emit({
            topic: eventTopic,
            data: {
                dealId,
                action,
                brand: deal.brand,
                message: messageToSend,
                platform: platform,
                messageId: replyResponse.messageId || replyResponse.emailId,
                ...(platform === 'facebook' ? { facebookMessageId: replyResponse.messageId } : {}),
                ...(platform === 'email' ? { emailId: replyResponse.emailId } : {})
            }
        })

        ctx.logger.info('✅ Event emitted', {
            topic: eventTopic,
            dealId
        })
        ctx.logger.info('='.repeat(80))

        return {
            status: 200,
            body: {
                success: true,
                deal: updatedDeal,
                messageSent: {
                    action,
                    message: messageToSend,
                    platform: platform,
                    messageId: replyResponse.messageId || replyResponse.emailId,
                    ...(platform === 'facebook' ? { facebookMessageId: replyResponse.messageId } : {}),
                    ...(platform === 'email' ? { emailId: replyResponse.emailId, subject: replyResponse.subject } : {}),
                    sentAt: timestamp
                }
            }
        }

    } catch (error) {
        ctx.logger.error('❌ Creator action failed', {
            dealId,
            action,
            error: error.message,
            stack: error.stack,
            traceId: ctx.traceId
        })

        return {
            status: 500,
            body: {
                success: false,
                error: 'Failed to process creator action',
                details: error.message
            }
        }
    }
}
