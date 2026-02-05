import { createGeminiClient } from '../gemini/client.js';
import { thoughtManager } from '../gemini/thinking.js';
import type { MarketRateResult } from '../market/perplexity.js';

export type RecommendationInput = {
    baselineRate: number;
    engagementAdjustedRate: number;
    reachAdjustedRate: number;
    perplexityMarketData: MarketRateResult | null;
    brandDetails: {
        brandName: string;
        deliverables: string;
        proposedBudget: number | null;
    };
    creatorMetrics: {
        niche: string;
        followers: number;
        engagementRate: number;
        avgViews: number;
        postsLast30Days: number;
        platform: string;
    };
    dealId?: string; // For thought signature tracking
};

export type RecommendationResult = {
    conservative: { rate: number; rationale: string };
    market: { rate: number; rationale: string };
    premium: { rate: number; rationale: string };
    budgetAssessment: { decision: 'accept' | 'counter' | 'decline'; rationale: string };
    thinkingProcess?: string; // Gemini 3 thinking output
};

const buildPrompt = (input: RecommendationInput, contextPrompt?: string) => {
    const {
        baselineRate,
        engagementAdjustedRate,
        reachAdjustedRate,
        perplexityMarketData,
        brandDetails,
        creatorMetrics
    } = input;

    const { min, max } = perplexityMarketData || {};

    let prompt = '';

    // Add thought signature context if available
    if (contextPrompt) {
        prompt += contextPrompt + '\n\n';
    }

    prompt += `You are an expert influencer rate negotiation consultant for India.

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
CRITICAL: If the proposed budget is already near or above the "Market Rate", you MUST recommend "accept". Avoid greed if the offer is fair.

Return ONLY valid JSON with shape:
{
  "conservative": { "rate": number, "rationale": string },
  "market": { "rate": number, "rationale": string },
  "premium": { "rate": number, "rationale": string },
  "budgetAssessment": { "decision": "accept" | "counter" | "decline", "rationale": string }
}`;

    return prompt;
};

export const generateRateRecommendation = async (
    input: RecommendationInput,
    opts: { logger?: { info: Function; warn: Function; error: Function } } = {}
): Promise<RecommendationResult | null> => {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        // Fallback to Groq if Gemini not configured
        opts.logger?.warn?.('GEMINI_API_KEY missing; falling back to Groq');
        const groqModule = await import('./groqRecommendation.js');
        return groqModule.generateRateRecommendation(input, opts);
    }

    try {
        const client = createGeminiClient({
            model: 'gemini-2.0-flash-exp',
            thinkingLevel: 'level2', // Deep thinking for strategic negotiation
            temperature: 0.2,
        });

        opts.logger?.info?.('[Gemini 3] Generating rate recommendation with Level 2 thinking');

        // Get thought signature context if dealId provided
        let contextPrompt = '';
        if (input.dealId) {
            const signature = thoughtManager.get(input.dealId);
            if (signature) {
                contextPrompt = thoughtManager.getContextPrompt(input.dealId);

                // Add key facts about this deal
                thoughtManager.addKeyFact(
                    input.dealId,
                    `Brand ${input.brandDetails.brandName} proposed ₹${input.brandDetails.proposedBudget || 'unknown'} for ${input.brandDetails.deliverables}`
                );
            } else {
                // Create new thought signature for this deal
                thoughtManager.create(input.dealId, {
                    brandName: input.brandDetails.brandName,
                    creatorId: 'current-creator',
                    dealStage: 'inquiry',
                    keyFacts: [
                        `Niche: ${input.creatorMetrics.niche}`,
                        `Followers: ${input.creatorMetrics.followers}`,
                        `Engagement: ${input.creatorMetrics.engagementRate}%`,
                    ],
                });
                contextPrompt = thoughtManager.getContextPrompt(input.dealId);
            }
        }

        const prompt = buildPrompt(input, contextPrompt);
        const response = await client.generateJSON<RecommendationResult>(prompt);

        if (!response.parsed) {
            opts.logger?.warn?.('[Gemini 3] Failed to parse JSON response');
            return null;
        }

        // Store reasoning in thought signature
        if (input.dealId) {
            thoughtManager.addReasoning(
                input.dealId,
                'rate_calculation',
                response.thinkingProcess || 'Calculated rates using market data and creator metrics',
                85,
                ['engagement_rate', 'market_data', 'brand_budget', 'creator_leverage']
            );

            thoughtManager.recordDecision(
                input.dealId,
                'rate_proposal',
                response.parsed.budgetAssessment.rationale,
                {
                    conservative: response.parsed.conservative.rate,
                    market: response.parsed.market.rate,
                    premium: response.parsed.premium.rate,
                    decision: response.parsed.budgetAssessment.decision,
                }
            );
        }

        opts.logger?.info?.('[Gemini 3] Rate recommendation generated successfully', {
            decision: response.parsed.budgetAssessment.decision,
            marketRate: response.parsed.market.rate,
        });

        return {
            ...response.parsed,
            thinkingProcess: response.thinkingProcess,
        };
    } catch (error) {
        opts.logger?.warn?.('[Gemini 3] Request failed; returning null', {
            error: (error as Error).message,
        });
        return null;
    }
};
