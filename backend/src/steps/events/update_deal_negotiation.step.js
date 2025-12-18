// Event handler: Updates deal with AI rate recommendations
export const config = {
    type: 'event',
    name: 'UpdateDealNegotiation',
    subscribes: ['RateRecommendationGenerated'],
    emits: ['deal.updated'],
    description: 'Updates deal state with AI negotiation data',
    flows: ['dealflow', 'negotiation']
}

export const handler = async (input, ctx) => {
    const { dealId: inputDealId, inquiryId, payload, brandDetails } = input

    if (!payload || !payload.success || !payload.recommendation) {
        ctx.logger.warn('UpdateDealNegotiation: missing required data', { dealId: inputDealId, inquiryId, success: payload?.success })
        return
    }

    let deal = null
    let dealId = inputDealId

    if (dealId) {
        deal = await ctx.state.get('deals', dealId)
    }

    if (!deal && inquiryId) {
        const allDeals = await ctx.state.getGroup('deals')
        deal = (allDeals || []).find(d => d.inquiryId === inquiryId && !['completed', 'cancelled', 'declined'].includes((d.status || '').toLowerCase()))
        if (deal) {
            dealId = deal.dealId
            ctx.logger.info('UpdateDealNegotiation: Found deal by inquiryId', { inquiryId, dealId })
        }
    }

    if (!deal || !dealId) {
        ctx.logger.error(`UpdateDealNegotiation: deal not found`, { dealId: inputDealId, inquiryId })
        return
    }

    // Map recommendation to deal.negotiation format
    const negotiationData = {
        brandOfferedAmount: brandDetails.proposedBudget || 0,
        aiRecommendedRates: {
            conservative: payload.recommendation.conservative.rate,
            market: payload.recommendation.market.rate,
            premium: payload.recommendation.premium.rate
        },
        budgetAssessment: payload.recommendation.budgetAssessment.decision,
        rateMetrics: {
            baselineRate: payload.baselineRate,
            engagementRate: payload.engagementRate,
            engagementMultiplier: payload.engagementMultiplier,
            engagementAdjustedRate: payload.engagementAdjustedRate,
            viewRatio: payload.viewRatio,
            viewMultiplier: payload.viewMultiplier,
            consistencyMultiplier: payload.consistencyMultiplier,
            reachAdjustedRate: payload.reachAdjustedRate
        }
    }

    // Update deal status and negotiation data
    const updatedDeal = {
        ...deal,
        status: 'RATE_RECOMMENDED', // Move to Action Required state
        negotiation: negotiationData,
        timeline: {
            ...deal.timeline,
            ratesCalculated: new Date().toISOString()
        }
    }

    // Persist update
    await ctx.state.set('deals', dealId, updatedDeal)

    // Notify frontend
    await ctx.emit({
        topic: 'deal.updated',
        data: {
            dealId,
            previousStatus: deal.status,
            newStatus: updatedDeal.status,
            negotiation: negotiationData
        }
    })

    ctx.logger.info('✅ Deal updated with negotiation data', {
        dealId,
        status: updatedDeal.status,
        assessment: negotiationData.budgetAssessment
    })
}
