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
    const { dealId, payload, brandDetails } = input

    if (!dealId || !payload || !payload.success || !payload.recommendation) {
        ctx.logger.warn('UpdateDealNegotiation: missing required data', { dealId, success: payload?.success })
        return
    }

    const deal = await ctx.state.get('deals', dealId)
    if (!deal) {
        ctx.logger.error(`UpdateDealNegotiation: deal ${dealId} not found`)
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
