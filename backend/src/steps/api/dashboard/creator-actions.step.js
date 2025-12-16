import { generateProposalWithFallback } from '../../../lib/agents/generateProposal.js'
import { sendMessageWithRetry, validateFacebookCredentials } from '../../../lib/integrations/facebookMessenger.js'
import { DECLINE_TEMPLATE, HIGH_CONFIDENCE_TEMPLATE, personalizeMessage } from '../../../lib/replies/autoReplyTemplates.js'

export const config = {
    type: 'api',
    name: 'CreatorActions',
    path: '/api/deals/:dealId/actions/reply',
    method: 'POST',
    emits: ['deal.reply_sent', 'deal.declined'],
    description: 'Handles creator actions: send proposal, edit & send, or decline brand inquiries with Facebook Messenger integration',
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

        // Validate Facebook credentials
        const fbValidation = validateFacebookCredentials()
        if (!fbValidation.valid) {
            ctx.logger.error('Facebook credentials missing', {
                error: fbValidation.error
            })
            return {
                status: 500,
                body: {
                    success: false,
                    error: 'Facebook integration not configured properly'
                }
            }
        }

        const pageAccessToken = fbValidation.token

        // Extract recipient PSID
        const recipientPsid = deal.brand?.platformAccountId || deal.brand?.senderId
        if (!recipientPsid) {
            ctx.logger.error('Recipient PSID not found in deal', {
                dealId,
                brandData: deal.brand
            })
            return {
                status: 400,
                body: {
                    success: false,
                    error: 'Cannot send message: recipient information missing from deal'
                }
            }
        }

        // Validate platform is Facebook
        if (deal.platform && deal.platform !== 'facebook') {
            ctx.logger.error('Deal is not from Facebook platform', {
                dealId,
                platform: deal.platform
            })
            return {
                status: 400,
                body: {
                    success: false,
                    error: `This feature only supports Facebook messages. Deal platform: ${deal.platform}`
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

            // Generate proposal with AI, fallback to template
            const fallbackTemplate = personalizeMessage(
                HIGH_CONFIDENCE_TEMPLATE,
                deal.brand?.contactPerson,
                deal.brand?.name
            )

            messageToSend = await generateProposalWithFallback(
                deal,
                creatorProfile,
                fallbackTemplate,
                ctx.logger
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
            ctx.logger.info('Sending decline message', { dealId })

            messageToSend = personalizeMessage(
                DECLINE_TEMPLATE,
                deal.brand?.contactPerson,
                deal.brand?.name
            )

            newStatus = 'declined'
        }

        // Send message to Facebook
        ctx.logger.info('Sending message to Facebook Messenger', {
            dealId,
            recipientPsid,
            action,
            messageLength: messageToSend.length
        })

        let fbResponse
        try {
            fbResponse = await sendMessageWithRetry(
                recipientPsid,
                messageToSend,
                pageAccessToken,
                ctx.logger,
                2 // maxRetries
            )

            ctx.logger.info('✅ Message successfully sent to Facebook', {
                dealId,
                messageId: fbResponse.messageId,
                action
            })

        } catch (fbError) {
            ctx.logger.error('❌ Failed to send message to Facebook', {
                dealId,
                error: fbError.message,
                stack: fbError.stack
            })

            return {
                status: 500,
                body: {
                    success: false,
                    error: `Failed to send message to Facebook: ${fbError.message}`
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
                        facebookMessageId: fbResponse.messageId,
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
                facebookMessageId: fbResponse.messageId
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
                    facebookMessageId: fbResponse.messageId,
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
