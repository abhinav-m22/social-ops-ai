import { HIGH_CONFIDENCE_TEMPLATE, DECLINE_TEMPLATE, personalizeMessage } from '../../../lib/replies/autoReplyTemplates.js'
import { sendMessageWithRetry, validateFacebookCredentials } from '../../../lib/integrations/facebookMessenger.js'
import { generateProposalWithFallback } from '../../../lib/agents/generateProposal.js'

export const config = {
    type: 'api',
    name: 'SendAutoReply',
    path: '/api/deals/:dealId/auto-reply',
    method: 'POST',
    emits: ['deal.auto_reply_sent'],
    description: 'Sends an AI-generated reply to Facebook Messenger and updates deal status/history',
    flows: ['dashboard', 'dealflow']
}

export const handler = async (req, ctx) => {
    const { dealId } = req.pathParams || {}
    const { message, mode = 'smart', action = 'send_proposal' } = req.body || {}

    if (!dealId) {
        return { status: 400, body: { success: false, error: 'dealId is required' } }
    }

    try {
        const deal = await ctx.state.get('deals', dealId)
        if (!deal) {
            return { status: 404, body: { success: false, error: 'Deal not found' } }
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

        const timestamp = new Date().toISOString()
        let replyMessage

        // Generate message based on mode and action
        if (action === 'decline') {
            // Decline action
            replyMessage = personalizeMessage(
                DECLINE_TEMPLATE,
                deal.brand?.contactPerson,
                deal.brand?.name
            )
        } else if (message) {
            // Custom message provided (edit & send)
            replyMessage = message
        } else if (mode === 'smart') {
            // AI-generated proposal
            const creatorProfile = {
                id: 'default-creator',
                minRate: 15000,
                maxRate: 50000,
                preferredDeliverables: ['instagram_reel', 'youtube_video']
            }

            const fallbackTemplate = personalizeMessage(
                HIGH_CONFIDENCE_TEMPLATE,
                deal.brand?.contactPerson,
                deal.brand?.name
            )

            replyMessage = await generateProposalWithFallback(
                deal,
                creatorProfile,
                fallbackTemplate,
                ctx.logger
            )
        } else {
            // Fallback to high confidence template
            replyMessage = personalizeMessage(
                HIGH_CONFIDENCE_TEMPLATE,
                deal.brand?.contactPerson,
                deal.brand?.name
            )
        }

        if (!replyMessage) {
            return { status: 400, body: { success: false, error: 'Reply message is required' } }
        }

        // Send message to Facebook
        ctx.logger.info('Sending message to Facebook Messenger', {
            dealId,
            recipientPsid,
            action,
            messageLength: replyMessage.length
        })

        let fbResponse
        try {
            fbResponse = await sendMessageWithRetry(
                recipientPsid,
                replyMessage,
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

        const updatedDeal = {
            ...deal,
            autoReplySent: true,
            autoReplyAt: timestamp,
            autoReplyMessage: replyMessage,
            aiSuggestedReply: replyMessage,
            status: action === 'decline' ? 'declined' : (deal.status === 'new' ? 'awaiting_response' : deal.status),
            creatorReplySent: true,
            creatorReplyAt: timestamp,
            creatorReplyMessage: replyMessage,
            creatorReplyAction: action,
            history: [
                ...(deal.history || []),
                {
                    timestamp,
                    event: action === 'decline' ? 'deal_declined' : 'auto_reply_sent',
                    data: {
                        mode,
                        action,
                        message: replyMessage,
                        sentFrom: 'dashboard',
                        facebookMessageId: fbResponse.messageId
                    }
                }
            ]
        }

        await ctx.state.set('deals', dealId, updatedDeal)

        await ctx.emit({
            topic: 'deal.auto_reply_sent',
            data: {
                dealId,
                brand: deal.brand,
                message: replyMessage,
                facebookMessageId: fbResponse.messageId
            }
        })

        ctx.logger.info('Dashboard: Auto reply sent to Facebook', {
            dealId,
            status: updatedDeal.status,
            facebookMessageId: fbResponse.messageId
        })

        return {
            status: 200,
            body: {
                success: true,
                deal: updatedDeal,
                messageSent: {
                    facebookMessageId: fbResponse.messageId,
                    message: replyMessage
                }
            }
        }
    } catch (error) {
        ctx.logger.error('Dashboard: Failed to send auto reply', {
            dealId,
            error: error.message,
            stack: error.stack
        })

        return { status: 500, body: { success: false, error: 'Failed to send auto reply' } }
    }
}

