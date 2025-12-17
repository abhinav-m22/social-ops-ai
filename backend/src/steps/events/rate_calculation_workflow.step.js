// Orchestrates calling the internal rate recommendation API and persisting snapshots
export const config = {
    type: 'event',
    name: 'RateCalculationWorkflow',
    subscribes: ['NegotiationEvaluationRequested'],
    emits: ['RateRecommendationGenerated'],
    description: 'Workflow that fetches context/metrics, calls the internal rate API, and stores immutable recommendations',
    flows: ['negotiation', 'dealflow']
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

const METRIC_TTL_MS = 60 * 60 * 1000 // 1 hour cache

const fetchFacebookMetrics = async (pageId, token, logger) => {
    if (!pageId) throw new Error('facebook pageId missing for creator metrics')
    if (!token) throw new Error('FACEBOOK_PAGE_ACCESS_TOKEN or FB_PAGE_TOKEN missing')

    // Followers
    const followerResp = await fetch(
        `https://graph.facebook.com/v18.0/${pageId}?fields=followers_count&access_token=${token}`
    )
    const followerJson = await followerResp.json()
    if (!followerResp.ok) throw new Error(`Facebook followers error: ${followerJson.error?.message || 'unknown'}`)

    // Recent posts for engagement
    const postsResp = await fetch(
        `https://graph.facebook.com/v18.0/${pageId}/posts?fields=shares.summary(true),likes.summary(true),comments.summary(true),insights.metric(post_impressions)&limit=20&access_token=${token}`
    )
    const postsJson = await postsResp.json()
    if (!postsResp.ok) throw new Error(`Facebook posts error: ${postsJson.error?.message || 'unknown'}`)

    const posts = postsJson.data || []
    const take = posts.slice(0, 10)
    let likes = 0
    let comments = 0
    let shares = 0
    let views = 0

    for (const p of take) {
        likes += p.likes?.summary?.total_count || 0
        comments += p.comments?.summary?.total_count || 0
        shares += p.shares?.count || 0
        const impressionsMetric = (p.insights?.data || []).find((m) => m.name === 'post_impressions')
        views += impressionsMetric?.values?.[0]?.value || 0
    }

    const count = Math.max(take.length, 1)

    return {
        followers: followerJson.followers_count || 0,
        avgLikes: Math.round(likes / count),
        avgComments: Math.round(comments / count),
        avgShares: Math.round(shares / count),
        avgViews: Math.round(views / count),
        postsLast30Days: take.length,
        platform: 'facebook',
        contentType: 'video', // default; can be overridden by platformOrContentType
        niche: 'general',
        country: 'India'
    }
}

const getCreatorMetrics = async (creatorId, platformOrContentType, ctx) => {
    const cacheKey = `metrics-${creatorId}`
    const cached = await ctx.state.get('creatorMetricsCache', cacheKey)
    if (cached && cached.fetchedAt && Date.now() - new Date(cached.fetchedAt).getTime() < METRIC_TTL_MS) {
        return cached.metrics
    }

    const profile = (await ctx.state.get('profiles', creatorId)) || {}
    const pageId = profile.facebookPageId || profile.platformAccountId
    const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN || process.env.FB_PAGE_TOKEN

    const metrics = await fetchFacebookMetrics(pageId, token, ctx.logger)

    // Align platform/contentType with brand context if provided
    metrics.platform = metrics.platform || platformOrContentType?.platform
    metrics.contentType = metrics.contentType || platformOrContentType?.contentType

    await ctx.state.set('creatorMetricsCache', cacheKey, {
        fetchedAt: new Date().toISOString(),
        metrics
    })

    return metrics
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

    const creatorMetrics = await getCreatorMetrics(creatorId, brandContext.platformOrContentType, ctx)

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


