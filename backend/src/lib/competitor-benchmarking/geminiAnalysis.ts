import { createGeminiClient } from '../gemini/client.js';

export interface CompetitorData {
    platform: string;
    profileName: string;
    followers: number;
    engagement_rate: number;
    avg_views?: number;
    posting_frequency?: string;
    content_types?: Record<string, number>;
}

export interface AnalysisInput {
    creator: {
        niche: string;
        platform: string;
        followers: number;
        engagement_rate: number;
    };
    competitors: CompetitorData[];
}

export interface CompetitorAnalysisResult {
    overall_insights: string[];
    competitive_position: string;
    growth_opportunities: string[];
    content_strategy_recommendations: string[];
    benchmarking: {
        follower_percentile: number;
        engagement_comparison: string;
    };
}

export interface PlatformAnalysisResult {
    platform_insights: string[];
    content_mix_analysis: string;
    posting_pattern_recommendations: string[];
    aesthetic_observations?: string[];
}

/**
 * Generate competitor analysis using Gemini 3 with Thinking Level 1
 */
export async function generateCompetitorAnalysis(
    input: AnalysisInput,
    opts: { logger?: { info?: Function; warn?: Function } } = {}
): Promise<CompetitorAnalysisResult | null> {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!apiKey) {
        opts.logger?.warn?.('GEMINI_API_KEY missing; skipping competitor analysis');
        // Fallback to Groq
        const groqModule = await import('./groqAnalysis.js');
        return groqModule.generateCompetitorAnalysis(input, opts);
    }

    try {
        const client = createGeminiClient({
            model: 'gemini-2.0-flash-exp',
            thinkingLevel: 'level1', // Quick thinking for analysis
            temperature: 0.3,
        });

        opts.logger?.info?.('[Gemini 3] Generating competitor analysis', {
            platform: input.creator.platform,
            competitorCount: input.competitors.length,
        });

        const prompt = buildCompetitorPrompt(input);
        const response = await client.generateJSON<CompetitorAnalysisResult>(prompt);

        if (!response.parsed) {
            opts.logger?.warn?.('[Gemini 3] Failed to parse competitor analysis');
            return null;
        }

        opts.logger?.info?.('[Gemini 3] Competitor analysis complete');
        return response.parsed;
    } catch (error) {
        opts.logger?.warn?.('[Gemini 3] Competitor analysis failed', {
            error: (error as Error).message,
        });
        return null;
    }
}

/**
 * Generate platform-specific analysis using Gemini 3
 */
export async function generatePlatformAnalysis(
    platformData: CompetitorData[],
    creatorContext: { niche: string; platform: string },
    opts: { logger?: { info?: Function; warn?: Function } } = {}
): Promise<PlatformAnalysisResult | null> {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!apiKey) {
        opts.logger?.warn?.('[Gemini 3] GEMINI_API_KEY missing; skipping platform analysis');
        const groqModule = await import('./groqAnalysis.js');
        return groqModule.generatePlatformAnalysis(platformData, creatorContext, opts);
    }

    try {
        const client = createGeminiClient({
            model: 'gemini-2.0-flash-exp',
            thinkingLevel: 'level1',
            temperature: 0.3,
        });

        opts.logger?.info?.('[Gemini 3] Generating platform analysis', {
            platform: creatorContext.platform,
            profileCount: platformData.length,
        });

        const prompt = buildPlatformPrompt(platformData, creatorContext);
        const response = await client.generateJSON<PlatformAnalysisResult>(prompt);

        if (!response.parsed) {
            opts.logger?.warn?.('[Gemini 3] Failed to parse platform analysis');
            return null;
        }

        opts.logger?.info?.('[Gemini 3] Platform analysis complete');
        return response.parsed;
    } catch (error) {
        opts.logger?.warn?.('[Gemini 3] Platform analysis failed', {
            error: (error as Error).message,
        });
        return null;
    }
}

function buildCompetitorPrompt(input: AnalysisInput): string {
    const { creator, competitors } = input;

    return `You are a social media analytics expert analyzing competitor performance for an Indian content creator.

CREATOR PROFILE:
- Niche: ${creator.niche}
- Platform: ${creator.platform}
- Followers: ${creator.followers}
- Engagement Rate: ${creator.engagement_rate}%

COMPETITOR DATA:
${competitors.map((c, i) => `
Competitor ${i + 1} (${c.profileName}):
- Followers: ${c.followers}
- Engagement Rate: ${c.engagement_rate}%
- Average Views: ${c.avg_views || 'N/A'}
- Posting Frequency: ${c.posting_frequency || 'Unknown'}
`).join('\n')}

TASK:
Analyze the creator's competitive position and provide actionable insights.

Return ONLY valid JSON with this shape:
{
  "overall_insights": ["insight 1", "insight 2"],
  "competitive_position": "description of where creator stands vs competitors",
  "growth_opportunities": ["opportunity 1", "opportunity 2"],
  "content_strategy_recommendations": ["recommendation 1", "recommendation 2"],
  "benchmarking": {
    "follower_percentile": number (0-100),
    "engagement_comparison": "above/below/at market average"
  }
}`;
}

function buildPlatformPrompt(
    platformData: CompetitorData[],
    creatorContext: { niche: string; platform: string }
): string {
    return `You are analyzing ${creatorContext.platform} performance patterns for a ${creatorContext.niche} creator.

PLATFORM DATA:
${platformData.map((p, i) => `
Profile ${i + 1}:
- Followers: ${p.followers}
- Engagement: ${p.engagement_rate}%
- Content Types: ${JSON.stringify(p.content_types || {})}
- Posting: ${p.posting_frequency || 'Unknown'}
`).join('\n')}

TASK:
Analyze platform-specific patterns and trends.

Return ONLY valid JSON with this shape:
{
  "platform_insights": ["insight 1", "insight 2"],
  "content_mix_analysis": "analysis of what content types perform best",
  "posting_pattern_recommendations": ["recommendation 1", "recommendation 2"],
  "aesthetic_observations": ["observation 1", "observation 2"]
}`;
}
