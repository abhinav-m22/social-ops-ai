// Bridges dashboard-driven deal updates into canonical negotiation events
export const config = {
    type: 'event',
    name: 'CreatorDecisionBridge',
    subscribes: ['deal.updated'],
    emits: ['CreatorDecisionSubmitted', 'DealFinalized'],
    description: 'Emits canonical creator decision and finalization events from deal updates',
    flows: ['negotiation', 'dealflow']
}

export const handler = async (input, ctx) => {
    const { dealId, previousStatus, newStatus, updates = [] } = input || {}
    if (!dealId) {
        ctx.logger.warn('CreatorDecisionBridge: missing dealId')
        return
    }

    const deal = await ctx.state.get('deals', dealId)
    if (!deal) {
        ctx.logger.warn('CreatorDecisionBridge: deal not found', { dealId })
        return
    }

    const inquiryId = deal.inquiryId
    const creatorId = deal.creatorId || 'default-creator'

    // Emit CreatorDecisionSubmitted for meaningful changes
    if (updates.includes('status') || updates.includes('terms') || updates.includes('agreedRate')) {
        await ctx.emit({
            topic: 'CreatorDecisionSubmitted',
            data: {
                dealId,
                inquiryId,
                creatorId,
                negotiationRound: null,
                decisionType: newStatus === 'declined' ? 'reject' : newStatus === 'active' ? 'accept' : 'counter',
                previousStatus,
                newStatus
            }
        })
    }

    // Emit DealFinalized when entering a terminal/active state
    const finalStates = ['active', 'completed', 'cancelled']
    if (finalStates.includes(newStatus)) {
        await ctx.emit({
            topic: 'DealFinalized',
            data: {
                dealId,
                inquiryId,
                creatorId,
                finalStatus: newStatus,
                finalizedAt: new Date().toISOString()
            }
        })
    }

    ctx.logger.info('CreatorDecisionBridge: emitted decision/finalization if applicable', {
        dealId,
        newStatus
    })
}




