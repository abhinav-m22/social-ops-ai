import { sendMessageWithRetry, validateFacebookCredentials } from '../../../lib/integrations/facebookMessenger.js'
import { generateProposalWithFallback } from '../../../lib/agents/generateProposal.js'

export const config = {
    type: 'api',
    name: 'SendAutoReply',
    path: '/api/deals/:dealId/auto-reply',
    method: 'POST',
    emits: ['deal.auto_reply_sent', 'deal.updated'],
    description: 'Sends an AI-generated reply to Facebook Messenger and updates deal status/history',
    flows: ['dashboard', 'dealflow']
}

export const handler = async (req, ctx) => {
    const { dealId } = req.pathParams || {}
    const { message, mode = 'smart', action = 'send_proposal', amount } = req.body || {}

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

        const creatorProfile = {
            id: 'default-creator',
            minRate: 15000,
            maxRate: 50000,
            preferredDeliverables: ['instagram_reel', 'youtube_video']
        }


        if (action === 'accept') {
            const agreedAmount = deal.negotiation?.brandOfferedAmount || deal.terms?.proposedBudget || 0
            replyMessage = `Confirmed. Happy to proceed at ${agreedAmount ? `₹${agreedAmount.toLocaleString('en-IN')}` : 'the agreed rate'}. Let's align on timelines & next steps.`
            
            ctx.logger.info('Accept action: Generated confirmation message', {
                dealId,
                agreedAmount
            })
        } else {
            const userIntent = message ? message.trim() : null
            
            const userCounterAmount = amount && !isNaN(parseFloat(amount)) ? parseFloat(amount) : null
            
            try {
                replyMessage = await generateProposalWithFallback(
                    deal,
                    creatorProfile,
                    // Minimal fallback (should rarely be used)
                    `Hi ${deal.brand?.contactPerson || deal.brand?.name || 'there'}, thank you for reaching out! I'll get back to you soon.`,
                    ctx.logger,
                    {
                        intent: userIntent, 
                        action: action,
                        counterAmount: userCounterAmount 
                    }
                )

                if (!replyMessage || !replyMessage.trim()) {
                    throw new Error('AI generated empty message')
                }
            } catch (error) {
                ctx.logger.error('Failed to generate AI reply', {
                    dealId,
                    error: error.message,
                    action,
                    hasIntent: !!userIntent
                })

                if (action === 'decline') {
                    replyMessage = `Hi ${deal.brand?.contactPerson || deal.brand?.name || 'there'}, thank you so much for considering me for this collaboration! I really appreciate you reaching out. Unfortunately, I'm unable to take on this project at the moment due to my current commitments. I wish you all the best with your campaign, and I hope we can work together in the future!`
                } else {
                    replyMessage = `Hi ${deal.brand?.contactPerson || deal.brand?.name || 'there'}, thank you for reaching out! This sounds like an interesting opportunity. Could you please share more details about the specific deliverables, timeline, and budget range you have in mind? This will help me evaluate if we are a good fit. Looking forward to hearing from you!`
                }
            }
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

        const agreedRate = action === 'accept' 
            ? (deal.negotiation?.brandOfferedAmount || deal.terms?.proposedBudget || 0)
            : deal.terms?.agreedRate || 0

        let newStatus = deal.status
        if (action === 'accept') {
            newStatus = 'active' 
        } else if (action === 'decline') {
            newStatus = 'declined'
        } else if (deal.status === 'new') {
            newStatus = 'awaiting_response'
        }

        let historyEvent = 'creator_reply_sent'
        if (action === 'accept') {
            historyEvent = 'deal_accepted'
        } else if (action === 'decline') {
            historyEvent = 'deal_declined'
        }

        const updatedDeal = {
            ...deal,
            autoReplySent: true,
            autoReplyAt: timestamp,
            autoReplyMessage: replyMessage,
            aiSuggestedReply: replyMessage,
            status: newStatus,
            creatorReplySent: true,
            creatorReplyAt: timestamp,
            creatorReplyMessage: replyMessage,
            creatorReplyAction: action,
            terms: {
                ...deal.terms,
                agreedRate: agreedRate, 
                gst: action === 'accept' ? Math.round(agreedRate * 0.18) : (deal.terms?.gst || 0),
                total: action === 'accept' ? agreedRate + Math.round(agreedRate * 0.18) : (deal.terms?.total || 0)
            },
            timeline: {
                ...deal.timeline,
                ...(action === 'accept' ? { contractSent: timestamp } : {})
            },
            history: [
                ...(deal.history || []),
                {
                    timestamp,
                    event: historyEvent,
                    data: {
                        mode,
                        action,
                        message: replyMessage,
                        sentFrom: 'dashboard',
                        facebookMessageId: fbResponse.messageId,
                        ...(action === 'accept' ? { agreedRate, dealFinalized: true } : {})
                    }
                }
            ]
        }

        await ctx.state.set('deals', dealId, updatedDeal)

        if (action === 'accept') {
            await ctx.emit({
                topic: 'deal.updated',
                data: {
                    dealId,
                    previousStatus: deal.status,
                    newStatus: newStatus,
                    updates: ['status', 'terms', 'agreedRate'],
                    agreedRate: agreedRate
                }
            })
        } else {
            await ctx.emit({
                topic: 'deal.auto_reply_sent',
                data: {
                    dealId,
                    brand: deal.brand,
                    message: replyMessage,
                    facebookMessageId: fbResponse.messageId
                }
            })
        }

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

