// Context gate: decides when negotiation is ready and triggers evaluation
export const config = {
    type: 'event',
    name: 'NegotiationContextGate',
    subscribes: ['BrandContextUpdated'],
    emits: ['NegotiationEvaluationRequested'],
    description: 'Checks context completeness and triggers negotiation when ready',
    flows: ['negotiation', 'dealflow']
}

const stringifyDeliverables = (deliverables = []) =>
    deliverables
        .map((d) => `${d.type || 'unknown'}:${d.count || 1}${d.description ? `(${d.description})` : ''}`)
        .join(';')

export const handler = async (input, ctx) => {
    const { inquiryId, dealId: incomingDealId, threadKey: incomingThreadKey, deliverables = [], proposedBudget, platformOrContentType } = input || {}
    if (!inquiryId) {
        ctx.logger.warn('NegotiationContextGate: missing inquiryId')
        return
    }

    const platform = platformOrContentType?.platform
    const contentType = platformOrContentType?.contentType
    const isNegotiationReady =
        Array.isArray(deliverables) &&
        deliverables.length > 0 &&
        proposedBudget != null &&
        (platform || contentType)

    const signature = JSON.stringify({
        deliverables: stringifyDeliverables(deliverables),
        proposedBudget,
        platform,
        contentType
    })

    const prior = (await ctx.state.get('negotiations', inquiryId)) || {}
    const shouldTrigger = isNegotiationReady && prior.lastSignature !== signature
    const nextRound = shouldTrigger ? (prior.negotiationRound || 0) + 1 : prior.negotiationRound || 0

    const updated = {
        inquiryId,
        isNegotiationReady,
        lastSignature: signature,
        negotiationRound: nextRound,
        platform,
        contentType,
        lastEvaluatedAt: new Date().toISOString()
    }

    await ctx.state.set('negotiations', inquiryId, updated)

    if (!shouldTrigger) {
        ctx.logger.info('NegotiationContextGate: no trigger (either not ready or duplicate)', {
            inquiryId,
            isNegotiationReady,
            signatureUnchanged: prior.lastSignature === signature
        })
        return
    }

    // Resolve creatorId/dealId if available
    const inquiry = await ctx.state.get('inquiries', inquiryId)
    const threadKey = incomingThreadKey || inquiry?.threadKey

    let dealId = incomingDealId || inquiry?.dealId || null
    let deal = dealId ? await ctx.state.get('deals', dealId) : null

    if (!deal && threadKey) {
        const deals = await ctx.state.getGroup('deals')
        // Strategy 1: Thread Key
        deal = (deals || []).find(
            (d) => d.threadKey === threadKey && !['completed', 'cancelled', 'declined'].includes((d.status || '').toLowerCase())
        )
        // Strategy 2: Brand/Creator fallback (if we can infer creatorId default)
        if (!deal) {
            const defaultCreatorId = 'default-creator' // Simplified for MVP
            // We can try to look up by brandId from inquiry sender if available, but gate input is normalized. 
            // We rely primarily on threadKey here as it comes from BrandContext which comes from Inquiry.
            // But if we have inquiryId, we can check the inquiry for senderId
            const inquiry = await ctx.state.get('inquiries', inquiryId)
            const senderId = inquiry?.senderId || inquiry?.sender?.id
            if (senderId) {
                deal = (deals || []).find((d) =>
                    d.brandId === senderId &&
                    d.creatorId === defaultCreatorId &&
                    !['completed', 'cancelled', 'declined'].includes((d.status || '').toLowerCase())
                )
            }
        }
        dealId = deal?.dealId || dealId
    }

    const creatorId = deal?.creatorId || 'default-creator'

    await ctx.emit({
        topic: 'NegotiationEvaluationRequested',
        data: {
            inquiryId,
            dealId,
            creatorId,
            negotiationRound: nextRound,
            trigger: 'context_ready'
        }
    })

    ctx.logger.info('NegotiationContextGate: emitted negotiation evaluation request', {
        inquiryId,
        negotiationRound: nextRound
    })
}


