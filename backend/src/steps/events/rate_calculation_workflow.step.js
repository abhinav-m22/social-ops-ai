// Orchestrates calling the internal rate recommendation API and persisting snapshots
export const config = {
    type: 'event',
    name: 'RateCalculationWorkflow',
    subscribes: ['NegotiationEvaluationRequested'],
    emits: ['RateRecommendationGenerated'],
    description: 'Workflow that fetches context/metrics, calls the internal rate API, and stores immutable recommendations',
    flows: ['negotiation', 'dealflow']
}

const fallbackMetrics = {
    niche: 'general',
    followers: 50000,
    platform: 'instagram',
    contentType: 'reel',
    country: 'India',
    avgLikes: 2500,
    avgComments: 120,
    avgShares: 80,
    avgViews: 30000,
    postsLast30Days: 12
}

const formatDeliverables = (deliverables = [], platformOrContentType = {}) => {
    if (!Array.isArray(deliverables) || deliverables.length === 0) return 'unspecified deliverables'
    return deliverables
        .map((d) => {
            const type = d.type || platformOrContentType.contentType || platformOrContentType.platform || 'content'
            const count = d.count || 1
            const desc = d.description ? ` ${d.description}` : ''
            return `${count}x ${type}${desc}`
        })
        .join('; ')
}

const buildCreatorMetrics = (profile, platformOrContentType) => {
    const merged = {
        ...fallbackMetrics,
        ...profile
    }
    // Ensure platform/contentType defaults to brand request if not in profile
    merged.platform = merged.platform || platformOrContentType?.platform || fallbackMetrics.platform
    merged.contentType = merged.contentType || platformOrContentType?.contentType || fallbackMetrics.contentType
    return merged
}

export const handler = async (input, ctx) => {
    const { inquiryId, dealId, creatorId = 'default-creator', negotiationRound = 1 } = input || {}
    if (!inquiryId) {
        ctx.logger.warn('RateCalculationWorkflow: missing inquiryId')
        return
    }

    // Fetch brand context + inquiry/deal linkage
    const brandContext = (await ctx.state.get('brandContexts', inquiryId)) || {}
    const inquiry = (await ctx.state.get('inquiries', inquiryId)) || {}
    const deal = dealId ? await ctx.state.get('deals', dealId) : null

    const brandDetails = {
        brandName: brandContext.brandName || deal?.brand?.name || inquiry?.brandName || 'Unknown Brand',
        deliverables: formatDeliverables(brandContext.deliverables, brandContext.platformOrContentType),
        proposedBudget: brandContext.proposedBudget ?? null
    }

    const profile = (await ctx.state.get('profiles', creatorId)) || {}
    const creatorMetrics = buildCreatorMetrics(profile, brandContext.platformOrContentType)

    let apiResponse
    let status = 'success'

    try {
        const response = await fetch('http://127.0.0.1:3000/internal/rate-recommendation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ brandDetails, creatorMetrics })
        })

        if (!response.ok) {
            throw new Error(`Rate API responded with status ${response.status}`)
        }

        apiResponse = await response.json()
    } catch (err) {
        status = 'calculator_failed'
        apiResponse = {
            success: false,
            error: err.message,
            recommendation: null
        }
        ctx.logger.error('RateCalculationWorkflow: rate calculator failed', {
            inquiryId,
            negotiationRound,
            error: err.message
        })
    }

    const recommendationId = `rec-${inquiryId}-${String(negotiationRound).padStart(2, '0')}-${Date.now()}`
    const snapshot = {
        recommendationId,
        inquiryId,
        dealId: dealId || null,
        creatorId,
        negotiationRound,
        status,
        brandDetails,
        creatorMetrics,
        payload: apiResponse,
        createdAt: new Date().toISOString()
    }

    await ctx.state.set('recommendations', recommendationId, snapshot)

    await ctx.emit({
        topic: 'RateRecommendationGenerated',
        data: snapshot
    })

    ctx.logger.info('RateCalculationWorkflow: recommendation snapshot persisted', {
        inquiryId,
        negotiationRound,
        recommendationId,
        status
    })
}


