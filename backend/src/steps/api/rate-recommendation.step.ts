import type { ApiRouteConfig } from 'motia'
import { z } from 'zod'
import {
    calculateRateStack,
    type BaselineInput,
    type EngagementInput,
    type ReachConsistencyInput
} from '../../lib/rates/calculators'
import { fetchMarketRates } from '../../lib/market/perplexity'
import { generateRateRecommendation } from '../../lib/rates/groqRecommendation'

const requestSchema = z.object({
    brandDetails: z.object({
        brandName: z.string(),
        deliverables: z.string(),
        proposedBudget: z.number().nullable().optional()
    }),
    creatorMetrics: z.object({
        niche: z.string(),
        followers: z.number(),
        platform: z.enum(['instagram', 'youtube', 'facebook']),
        contentType: z.enum(['reel', 'video', 'post', 'short']),
        country: z.enum(['India', 'US']).optional(),
        avgLikes: z.number(),
        avgComments: z.number(),
        avgShares: z.number(),
        avgViews: z.number(),
        postsLast30Days: z.number()
    })
})

const fallbackRecommendation = (
    reachAdjustedRate: number,
    proposedBudget: number | null | undefined
) => {
    const conservativeRate = Math.round(reachAdjustedRate * 0.9)
    const marketRate = reachAdjustedRate
    const premiumRate = Math.round(reachAdjustedRate * 1.2)

    let decision: 'accept' | 'counter' | 'decline' = 'counter'
    if (proposedBudget == null) {
        decision = 'counter'
    } else if (proposedBudget >= premiumRate) {
        decision = 'accept'
    } else if (proposedBudget >= conservativeRate) {
        decision = 'counter'
    } else {
        decision = 'decline'
    }

    return {
        conservative: { rate: conservativeRate, rationale: 'Based on 0.9x reach-adjusted rate' },
        market: { rate: marketRate, rationale: 'Aligned to reach-adjusted rate' },
        premium: { rate: premiumRate, rationale: 'Ambitious 1.2x reach-adjusted rate' },
        budgetAssessment: {
            decision,
            rationale: 'Decision derived from comparing proposed budget to calculated tiers'
        }
    }
}

export const config: ApiRouteConfig = {
    name: 'RateRecommendation',
    type: 'api',
    path: '/internal/rate-recommendation',
    method: 'POST',
    description: 'Computes AI-assisted rate recommendations with optional market data',
    emits: [],
    flows: ['dealflow'],
    bodySchema: requestSchema
}

export const handler = async (req: any, ctx: any) => {
    ctx.logger.info('RateRecommendation: received request', {
        flow: 'dealflow',
        traceId: ctx.traceId,
        body: req.body,
        headers: req.headers,
        query: req.query,
    })

    const parsed = requestSchema.safeParse(req.body ?? {})
    if (!parsed.success) {
        ctx.logger.warn('RateRecommendation: invalid input', {
            issues: parsed.error.issues,
            traceId: ctx.traceId
        })
        return {
            status: 400,
            body: {
                success: false,
                error: 'Invalid input',
                issues: parsed.error.issues
            }
        }
    }

    const { brandDetails, creatorMetrics } = parsed.data
    const normalizedBrand = {
        brandName: brandDetails.brandName,
        deliverables: brandDetails.deliverables,
        proposedBudget: brandDetails.proposedBudget ?? null
    }

    const baselineInput: BaselineInput = {
        followers: creatorMetrics.followers,
        platform: creatorMetrics.platform,
        contentType: creatorMetrics.contentType,
        country: creatorMetrics.country ?? 'India'
    }

    const engagementInput: EngagementInput = {
        avgLikes: creatorMetrics.avgLikes,
        avgComments: creatorMetrics.avgComments,
        avgShares: creatorMetrics.avgShares,
        followers: creatorMetrics.followers
    }

    const reachInput: ReachConsistencyInput = {
        avgViews: creatorMetrics.avgViews,
        followers: creatorMetrics.followers,
        postsLast30Days: creatorMetrics.postsLast30Days
    }

    const rateStack = calculateRateStack({
        baseline: baselineInput,
        engagement: engagementInput,
        reach: reachInput
    })

    const marketData = await fetchMarketRates(
        {
            niche: creatorMetrics.niche,
            followers: creatorMetrics.followers,
            platform: creatorMetrics.platform,
            country: creatorMetrics.country ?? 'India'
        },
        { state: ctx.state, logger: ctx.logger }
    )
    if (marketData) {
        ctx.logger.info('RateRecommendation: market data resolved', {
            min: marketData.min,
            max: marketData.max,
            avg: marketData.avg
        })
    } else {
        ctx.logger.warn('RateRecommendation: market data unavailable, continuing with internal rates')
    }

    const recommendation =
        (await generateRateRecommendation(
            {
                baselineRate: rateStack.baselineRate,
                engagementAdjustedRate: rateStack.engagementAdjustedRate,
                reachAdjustedRate: rateStack.reachAdjustedRate,
                perplexityMarketData: marketData,
                brandDetails: normalizedBrand,
                creatorMetrics: {
                    niche: creatorMetrics.niche,
                    followers: creatorMetrics.followers,
                    engagementRate: rateStack.engagementRate,
                    avgViews: creatorMetrics.avgViews,
                    postsLast30Days: creatorMetrics.postsLast30Days,
                    platform: creatorMetrics.platform
                }
            },
            { logger: ctx.logger }
        )) || fallbackRecommendation(rateStack.reachAdjustedRate, normalizedBrand.proposedBudget)

    ctx.logger.info('RateRecommendation: completed', {
        baselineRate: rateStack.baselineRate,
        engagementAdjustedRate: rateStack.engagementAdjustedRate,
        reachAdjustedRate: rateStack.reachAdjustedRate,
        usedMarketData: !!marketData,
        usedGroq: recommendation?.budgetAssessment?.rationale?.length ? true : false
    })

    return {
        status: 200,
        body: {
            success: true,
            baselineRate: rateStack.baselineRate,
            engagementRate: rateStack.engagementRate,
            engagementMultiplier: rateStack.engagementMultiplier,
            engagementAdjustedRate: rateStack.engagementAdjustedRate,
            viewRatio: rateStack.viewRatio,
            viewMultiplier: rateStack.viewMultiplier,
            consistencyMultiplier: rateStack.consistencyMultiplier,
            reachAdjustedRate: rateStack.reachAdjustedRate,
            marketData,
            recommendation
        }
    }
}

