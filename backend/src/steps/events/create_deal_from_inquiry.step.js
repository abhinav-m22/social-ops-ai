// Event handler: Creates a deal from extracted inquiry data
import { calculateConfidenceScore } from '../../lib/scoring/calculateConfidenceScore.js'
import { HIGH_CONFIDENCE_TEMPLATE, personalizeMessage } from '../../lib/replies/autoReplyTemplates.js'

export const config = {
    type: 'event',
    name: 'CreateDealFromInquiry',
    subscribes: ['inquiry.extracted'],
    emits: ['deal.created'],
    description: 'Creates a deal record from extracted inquiry data and stores it in state',
    flows: ['dealflow'],
    // Input schema: data emitted from extract_inquiry_step.py
    // The input is the data object directly (not wrapped)
    input: {
        type: 'object',
        properties: {
            inquiryId: { type: 'string' },
            source: { type: 'string' },
            extracted: { type: 'object' },
            sender: { type: 'object' }
        },
        required: ['inquiryId', 'source', 'extracted']
    }
}

export const handler = async (input, ctx) => {
    // In Motia, event handlers receive the data object directly
    // The emit was: { topic: 'inquiry.extracted', data: { inquiryId, source, extracted } }
    // So input is the data object: { inquiryId, source, extracted }
    const { inquiryId, source, extracted, sender } = input

    ctx.logger.info('='.repeat(80))
    ctx.logger.info(`Creating deal from extracted inquiry: ${inquiryId}`)
    ctx.logger.info('='.repeat(80))

    if (!inquiryId || !extracted) {
        ctx.logger.error('Missing required data', {
            inquiryId,
            hasExtracted: !!extracted
        })
        return
    }

    let inquiry = null
    try {
        // Fetch the original inquiry to get full context
        inquiry = await ctx.state.get('inquiries', inquiryId)

        if (!inquiry) {
            ctx.logger.error(`Inquiry ${inquiryId} not found in state`)
            return
        }

        ctx.logger.info('Fetched original inquiry', {
            inquiryId,
            status: inquiry.status,
            hasExtractedData: !!inquiry.extractedData
        })

        const senderName = sender?.name || inquiry.sender?.name
        ctx.logger.info(`Using sender name: ${senderName || 'Not found'}`, {
            inputSender: !!sender,
            inquirySender: !!inquiry.sender
        })

        // Generate deal ID
        const dealId = `DEAL-${Date.now()}-${inquiryId.slice(-6)}`

        // Extract brand information
        const brand = extracted.brand || {}
        const campaign = extracted.campaign || {}
        const deliverables = campaign.deliverables || []
        const proposedBudget = campaign?.budget?.amount

        // Context for budget derived from campaign details
        // Default creator profile (could be fetched from ctx/state later)
        const creatorProfile = {
            id: 'default-creator',
            interests: ['tech', 'gadgets', 'reviews'],
            minRate: 15000,
            maxRate: 50000,
            preferredDeliverables: ['instagram_reel', 'youtube_video'],
            redFlags: ['perpetuity', 'exclusive_6month', 'unlimited revisions']
        }

        const confidence = calculateConfidenceScore(
            {
                brandName: brand.name,
                message: inquiry.body,
                terms: { deliverables, proposedBudget },
                platform: source
            },
            creatorProfile
        )

        // Create deal object matching the Deal interface
        const createdAt = new Date().toISOString()
        const baseHistory = [
            {
                timestamp: createdAt,
                event: 'inquiry_received',
                data: { source, inquiryId }
            },
            {
                timestamp: createdAt,
                event: 'extraction_completed',
                data: { extracted }
            },
            {
                timestamp: createdAt,
                event: 'deal_created',
                data: { dealId }
            }
        ]

        const deal = {
            dealId: dealId,
            inquiryId: inquiryId,
            creatorId: creatorProfile.id,
            status: confidence.level === 'high' ? 'awaiting_details' : 'new',

            platform: source || 'unknown',

            brand: {
                name: senderName || brand.name || inquiry?.brandName || 'Unknown Brand',
                contactPerson: brand.contactPerson || null,
                email: brand.email || null,
                pageName: inquiry?.pageName || null,
                platformAccountId: sender?.id || inquiry?.senderId || null
            },

            message: inquiry.body,

            confidenceScore: confidence.score,
            confidenceLevel: confidence.level,
            confidenceReasons: confidence.reasons,
            redFlags: confidence.redFlags,
            autoReplySent: confidence.level === 'high',
            autoReplyAt: confidence.level === 'high' ? createdAt : null,
            autoReplyMessage: null,
            aiSuggestedReply: null,

            terms: {
                deliverables: deliverables.map((del, index) => ({
                    id: `del-${dealId}-${index}`,
                    type: del.type || 'other',
                    count: del.count || 1,
                    description: del.description || '',
                    dueDate: '', // Will be calculated based on timeline
                    status: 'pending'
                })),
                proposedBudget: proposedBudget || null,
                agreedRate: 0, // Will be calculated later
                gst: 0,
                total: 0
            },

            timeline: {
                inquiryReceived: inquiry.receivedAt || createdAt,
                ratesCalculated: null, // Will be set when rates are calculated
                dealCreated: createdAt,
                autoReplySent: confidence.level === 'high' ? createdAt : null
            },

            history: baseHistory,

            // Store extracted data for reference
            extractedData: extracted,
            source: source,
            rawInquiry: inquiry.body
        }

        if (confidence.level === 'high') {
            const autoReply = personalizeMessage(
                HIGH_CONFIDENCE_TEMPLATE,
                deal.brand.contactPerson,
                deal.brand.name
            )
            deal.autoReplyMessage = autoReply
            deal.aiSuggestedReply = autoReply
            deal.history.push({
                timestamp: createdAt,
                event: 'auto_reply_sent',
                data: {
                    message: autoReply,
                    confidenceScore: confidence.score
                }
            })
            await ctx.emit({
                topic: 'deal.auto_reply_sent',
                data: {
                    dealId,
                    inquiryId,
                    brand: deal.brand,
                    autoReply
                }
            })
            ctx.logger.info('✅ Auto reply dispatched for high-confidence deal', {
                dealId,
                confidence: confidence.score
            })
        } else {
            deal.history.push({
                timestamp: createdAt,
                event: 'confidence_scored',
                data: {
                    confidenceScore: confidence.score,
                    confidenceLevel: confidence.level
                }
            })
        }

        // Store deal in state
        await ctx.state.set('deals', dealId, deal)

        ctx.logger.info('✅ Deal created and stored', {
            dealId,
            brandName: deal.brand.name,
            status: deal.status,
            deliverablesCount: deal.terms.deliverables.length
        })

        // Update inquiry status to link it to the deal
        inquiry.dealId = dealId
        inquiry.status = 'deal_created'
        await ctx.state.set('inquiries', inquiryId, inquiry)

        // Emit deal.created event for next steps (rate calculation, notifications, etc.)
        await ctx.emit({
            topic: 'deal.created',
            data: {
                dealId: dealId,
                inquiryId: inquiryId,
                brand: deal.brand,
                status: deal.status
            }
        })

        ctx.logger.info('✅ Deal creation event emitted', {
            dealId,
            event: 'deal.created'
        })
        ctx.logger.info('='.repeat(80))

        return {
            success: true,
            dealId: dealId,
            deal: deal
        }

    } catch (error) {
        ctx.logger.error('❌ Failed to create deal from inquiry', {
            inquiryId,
            error: error.message,
            stack: error.stack
        })

        // Mark inquiry as failed
        try {
            if (inquiry) {
                inquiry.status = 'deal_creation_failed'
                inquiry.error = error.message
                await ctx.state.set('inquiries', inquiryId, inquiry)
            } else {
                // Try to fetch inquiry if not already fetched
                const inquiryToUpdate = await ctx.state.get('inquiries', inquiryId)
                if (inquiryToUpdate) {
                    inquiryToUpdate.status = 'deal_creation_failed'
                    inquiryToUpdate.error = error.message
                    await ctx.state.set('inquiries', inquiryId, inquiryToUpdate)
                }
            }
        } catch (updateError) {
            ctx.logger.error('Failed to update inquiry status', {
                inquiryId,
                error: updateError.message
            })
        }

        throw error
    }
}

