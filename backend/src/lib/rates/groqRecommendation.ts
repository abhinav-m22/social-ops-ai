import Groq from 'groq-sdk'
import type { MarketRateResult } from '../market/perplexity.js'

export type RecommendationInput = {
    baselineRate: number
    engagementAdjustedRate: number
    reachAdjustedRate: number
    perplexityMarketData: MarketRateResult | null
    brandDetails: {
        brandName: string
        deliverables: string
        proposedBudget: number | null
    }
    creatorMetrics: {
        niche: string
        followers: number
        engagementRate: number
        avgViews: number
        postsLast30Days: number
        platform: string
    }
}

export type RecommendationResult = {
    conservative: { rate: number; rationale: string }
    market: { rate: number; rationale: string }
    premium: { rate: number; rationale: string }
    budgetAssessment: { decision: 'accept' | 'counter' | 'decline'; rationale: string }
}

const buildPrompt = (input: RecommendationInput) => {
    const {
        baselineRate,
        engagementAdjustedRate,
        reachAdjustedRate,
        perplexityMarketData,
        brandDetails,
        creatorMetrics
    } = input

    const { min, max } = perplexityMarketData || {}
    return `You are an expert influencer rate negotiation consultant for India.

CREATOR PROFILE:
- Niche: ${creatorMetrics.niche}
- Followers: ${creatorMetrics.followers}
- Engagement Rate: ${creatorMetrics.engagementRate}%
- Avg Views: ${creatorMetrics.avgViews}
- Posting Consistency (30 days): ${creatorMetrics.postsLast30Days}
- Platform: ${creatorMetrics.platform}

CALCULATED RATES:
- Baseline formula: ₹${baselineRate}
- Engagement-adjusted: ₹${engagementAdjustedRate}
- Reach & consistency adjusted: ₹${reachAdjustedRate}
- Current market range (if available): ₹${min ?? 'n/a'}-₹${max ?? 'n/a'}

BRAND INQUIRY:
- Brand: ${brandDetails.brandName}
- Deliverables: ${brandDetails.deliverables}
- Their proposed budget: ₹${brandDetails.proposedBudget ?? 'n/a'}

TASK:
Provide 3 pricing tiers with strategic reasoning:
1. Conservative (safe, likely accepted)
2. Market Rate (fair, industry standard)
3. Premium (ambitious but justifiable)

Also analyze their proposed budget and recommend whether to accept, counter, or decline.

Return ONLY valid JSON with shape:
{
  "conservative": { "rate": number, "rationale": string },
  "market": { "rate": number, "rationale": string },
  "premium": { "rate": number, "rationale": string },
  "budgetAssessment": { "decision": "accept" | "counter" | "decline", "rationale": string }
}`
}

export const generateRateRecommendation = async (
    input: RecommendationInput,
    opts: { logger?: { info: Function; warn: Function; error: Function } } = {}
): Promise<RecommendationResult | null> => {
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
        opts.logger?.warn?.('GROQ_API_KEY missing; skipping recommendation synthesis')
        return null
    }

    try {
        const groq = new Groq({ apiKey })
        const completion = await groq.chat.completions.create({
            model: 'meta-llama/llama-4-scout-17b-16e-instruct',
            temperature: 0.2,
            response_format: { type: 'json_object' },
            messages: [
                { role: 'system', content: 'Return concise JSON only. No markdown.' },
                { role: 'user', content: buildPrompt(input) }
            ]
        })

        const content =
            completion?.choices?.[0]?.message?.content ||
            completion?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments

        if (!content) {
            opts.logger?.warn?.('Groq returned empty content')
            return null
        }

        try {
            const parsed = JSON.parse(content) as RecommendationResult
            opts.logger?.info?.('Groq recommendation generated')
            return parsed
        } catch (error) {
            opts.logger?.warn?.('Groq JSON parse failed; returning null', {
                error: (error as Error).message
            })
            return null
        }
    } catch (error) {
        opts.logger?.warn?.('Groq request failed; returning null', {
            error: (error as Error).message
        })
        return null
    }
}

