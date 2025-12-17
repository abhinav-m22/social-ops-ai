// Event handler: Creates or updates a deal from extracted inquiry data, maintaining continuity per thread
import { calculateConfidenceScore } from '../../lib/scoring/calculateConfidenceScore.js'
import { generateProposalWithFallback } from '../../lib/agents/generateProposal.js'

export const config = {
    type: 'event',
    name: 'CreateDealFromInquiry',
    subscribes: ['inquiry.extracted'],
    emits: ['deal.created', 'deal.updated', 'deal.auto_reply_sent', 'NegotiationEvaluationRequested'],
    description: 'Creates a deal record from extracted inquiry data and stores it in state',
    flows: ['dealflow'],
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
        const threadKey = `${source || 'unknown'}:${sender?.id || inquiry.senderId || 'unknown'}`
        ctx.logger.info(`Using sender name: ${senderName || 'Not found'}`, {
            inputSender: !!sender,
            inquirySender: !!inquiry.sender
        })

        const creatorProfile = {
            id: 'default-creator',
            interests: ['tech', 'gadgets', 'reviews'],
            minRate: 15000,
            maxRate: 50000,
            preferredDeliverables: ['instagram_reel', 'youtube_video'],
            redFlags: ['perpetuity', 'exclusive_6month', 'unlimited revisions']
        }

        const allDeals = await ctx.state.getGroup('deals')
        let existingDeal = (allDeals || []).find(
            (d) =>
                d.threadKey === threadKey &&
                !['completed', 'cancelled', 'declined'].includes((d.status || '').toLowerCase())
        )

        if (!existingDeal && sender?.id) {
            existingDeal = (allDeals || []).find(
                (d) =>
                    d.brandId === sender.id &&
                    d.creatorId === creatorProfile.id &&
                    !['completed', 'cancelled', 'declined'].includes((d.status || '').toLowerCase())
            )
        }

        const dealId = existingDeal?.dealId || `DEAL-${Date.now()}-${inquiryId.slice(-6)}`

        const brand = extracted.brand || {}
        const campaign = extracted.campaign || {}
        const deliverables = campaign.deliverables || []
        const proposedBudget = campaign?.budget?.amount

        const confidence = calculateConfidenceScore(
            {
                brandName: brand.name,
                message: inquiry.body,
                terms: { deliverables, proposedBudget },
                platform: source
            },
            creatorProfile
        )

        const createdAt = new Date().toISOString()

        if (existingDeal) {
            ctx.logger.info(`Updating existing deal ${dealId} with new inquiry data.`)

            let mergedDeliverables = existingDeal.terms?.deliverables || [];
            if (deliverables && deliverables.length > 0) {
                mergedDeliverables = deliverables.map((del, index) => ({
                    id: existingDeal.terms?.deliverables?.[index]?.id || `del-${dealId}-${index}`,
                    type: del.type || 'other',
                    count: del.count || 1,
                    description: del.description || '',
                    dueDate: existingDeal.terms?.deliverables?.[index]?.dueDate || '',
                    status: existingDeal.terms?.deliverables?.[index]?.status || 'pending'
                }));
                ctx.logger.info('Merged deliverables: New deliverables found, overwriting existing ones.', { newCount: deliverables.length, oldCount: existingDeal.terms?.deliverables?.length || 0 });
            } else {
                ctx.logger.info('Merged deliverables: No new deliverables found, keeping existing ones.', { oldCount: existingDeal.terms?.deliverables?.length || 0 });
            }

            let mergedProposedBudget = existingDeal.terms?.proposedBudget ?? null;
            if (proposedBudget !== undefined && proposedBudget !== null) {
                mergedProposedBudget = proposedBudget;
                ctx.logger.info(`Merged proposed budget: New budget found, overwriting existing.`, { newBudget: proposedBudget, oldBudget: existingDeal.terms?.proposedBudget });
            } else {
                ctx.logger.info(`Merged proposed budget: No new budget found, keeping existing.`, { oldBudget: existingDeal.terms?.proposedBudget });
            }

            const budgetChanged = proposedBudget !== undefined && proposedBudget !== null && 
                                 proposedBudget !== existingDeal.terms?.proposedBudget
            const deliverablesChanged = deliverables && deliverables.length > 0 && 
                                       JSON.stringify(mergedDeliverables) !== JSON.stringify(existingDeal.terms?.deliverables)

            const previousDeliverables = existingDeal.terms?.deliverables || []
            const previousBudget = existingDeal.terms?.proposedBudget
            const previousMessage = existingDeal.message

            const updatedDeal = {
                ...existingDeal,
                inquiryId,
                message: inquiry.body || existingDeal.message, 
                rawInquiry: inquiry.body, 
                extractedData: extracted, 
                terms: {
                    ...existingDeal.terms,
                    deliverables: mergedDeliverables,
                    proposedBudget: mergedProposedBudget
                },
                history: [
                    ...(existingDeal.history || []),
                    {
                        timestamp: createdAt,
                        event: 'message_appended',
                        data: {
                            inquiryId,
                            threadKey,
                            newMessage: inquiry.body,
                            previousMessage: previousMessage,
                            budgetChanged,
                            deliverablesChanged,
                            previousDeliverables: previousDeliverables.map(d => ({
                                type: d.type,
                                count: d.count,
                                description: d.description
                            })),
                            updatedDeliverables: mergedDeliverables.map(d => ({
                                type: d.type,
                                count: d.count,
                                description: d.description
                            })),
                            previousBudget: previousBudget,
                            updatedBudget: mergedProposedBudget
                        }
                    }
                ]
            }

            await ctx.state.set('deals', dealId, updatedDeal)

            inquiry.dealId = dealId
            inquiry.threadKey = threadKey
            inquiry.status = inquiry.status || 'extracted'
            await ctx.state.set('inquiries', inquiryId, inquiry)

            const isFinalized = ['active', 'completed', 'declined', 'cancelled', 'FINALIZED'].includes(existingDeal.status?.toUpperCase() || '')
            
            if ((budgetChanged || deliverablesChanged) && !isFinalized) {
                ctx.logger.info('Key deal terms changed, updating brand context for rate recalculation', {
                    dealId,
                    budgetChanged,
                    deliverablesChanged,
                    currentStatus: existingDeal.status
                })
                
                const existingContext = await ctx.state.get('brandContexts', inquiryId) || {}
                const platformGuess = deliverables.length > 0 ? (() => {
                    const type = (deliverables[0]?.type || '').toLowerCase()
                    if (type.includes('instagram')) return { platform: 'instagram', contentType: type.includes('reel') ? 'reel' : 'post' }
                    if (type.includes('youtube')) return { platform: 'youtube', contentType: type.includes('short') ? 'short' : 'video' }
                    if (type.includes('facebook')) return { platform: 'facebook', contentType: 'video' }
                    return { platform: null, contentType: null }
                })() : {}

                await ctx.state.set('brandContexts', inquiryId, {
                    ...existingContext,
                    inquiryId,
                    dealId,
                    threadKey,
                    source,
                    brandName: updatedDeal.brand?.name,
                    deliverables: mergedDeliverables,
                    proposedBudget: mergedProposedBudget,
                    platformOrContentType: {
                        platform: platformGuess.platform || existingContext.platformOrContentType?.platform,
                        contentType: platformGuess.contentType || existingContext.platformOrContentType?.contentType,
                        inferred: !!platformGuess.platform
                    },
                    updatedAt: createdAt
                })

                await ctx.emit({
                    topic: 'NegotiationEvaluationRequested',
                    data: {
                        inquiryId,
                        dealId,
                        creatorId: updatedDeal.creatorId || 'default-creator',
                        negotiationRound: (existingDeal.history?.filter(h => h.event === 'message_appended').length || 0) + 1
                    }
                })
            }

            await ctx.emit({
                topic: 'deal.updated',
                data: {
                    dealId,
                    previousStatus: existingDeal.status,
                    newStatus: updatedDeal.status,
                    updates: ['terms', 'message'],
                    budgetChanged,
                    deliverablesChanged
                }
            })

            ctx.logger.info('♻️ Reused existing active deal for thread', {
                dealId,
                threadKey
            })

            return {
                success: true,
                dealId,
                reused: true,
                deal: updatedDeal
            }
        }

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
            threadKey,
            brandId: sender?.id || inquiry?.senderId || null,
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
                    dueDate: '', 
                    status: 'pending'
                })),
                proposedBudget: proposedBudget || null,
                agreedRate: 0, 
                gst: 0,
                total: 0
            },

            timeline: {
                inquiryReceived: inquiry.receivedAt || createdAt,
                ratesCalculated: null, 
                dealCreated: createdAt,
                autoReplySent: confidence.level === 'high' ? createdAt : null
            },

            history: baseHistory,

            extractedData: extracted,
            source: source,
            rawInquiry: inquiry.body
        }

        if (confidence.level === 'high') {
            try {
                const autoReply = await generateProposalWithFallback(
                    deal,
                    creatorProfile,
                    `Hi ${deal.brand.contactPerson || deal.brand.name || 'there'}, thank you for reaching out! This sounds like an interesting opportunity. Could you please share more details about the specific deliverables, timeline, and budget range you have in mind? This will help me evaluate if we are a good fit. Looking forward to hearing from you!`,
                    ctx.logger,
                    { action: 'send_proposal' }
                )
                deal.autoReplyMessage = autoReply
                deal.aiSuggestedReply = autoReply
                deal.history.push({
                    timestamp: createdAt,
                    event: 'auto_reply_sent',
                    data: {
                        message: autoReply,
                        confidenceScore: confidence.score,
                        generatedBy: 'ai'
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
                ctx.logger.info('✅ AI-generated auto reply dispatched for high-confidence deal', {
                    dealId,
                    confidence: confidence.score
                })
            } catch (error) {
                ctx.logger.error('Failed to generate AI reply, skipping auto-reply', {
                    dealId,
                    error: error.message
                })
            }
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

        await ctx.state.set('deals', dealId, deal)

        ctx.logger.info('✅ Deal created and stored', {
            dealId,
            brandName: deal.brand.name,
            status: deal.status,
            deliverablesCount: deal.terms.deliverables.length
        })

        inquiry.dealId = dealId
        inquiry.threadKey = threadKey
        inquiry.status = 'deal_created'
        await ctx.state.set('inquiries', inquiryId, inquiry)

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

