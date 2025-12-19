import Groq from 'groq-sdk'
import type { CompetitorBenchmarkingState, Competitor, CompetitorMetrics } from '../../steps/competitor-benchmarking/types.js'

export type AnalysisInput = {
  creatorMetadata: {
    creatorId: string
    niche?: string
    category?: string
    platformsConnected?: ('facebook' | 'youtube')[]
  }
  creatorMetrics?: {
    avg_views?: number
    engagement_rate?: number
    posting_frequency?: number
    content_types?: string[]
    [key: string]: any
  }
  competitors: Array<{
    platform: 'facebook' | 'youtube'
    name: string
    follower_count: number
    metrics?: CompetitorMetrics
  }>
}

export type AnalysisResult = {
  summary: {
    overall_position: 'underposting' | 'competitive' | 'outperforming'
    key_strengths: string[]
    key_weaknesses: string[]
  }
  comparisons: {
    posting_frequency_gap_percent: number
    engagement_rate_delta_percent: number
    avg_views_delta_percent: number
  }
  content_gaps: Array<{
    topic_or_format: string
    observed_in_competitors_count: number
    reason: string
  }>
  recommendations: Array<{
    action: string
    expected_impact: string
    priority: 'high' | 'medium' | 'low'
  }>
  optimal_strategy: {
    posts_per_week: number
    best_days: string[]
    best_time_window: string
  }
  growth_projection: {
    '30_days': string
    '60_days': string
    '90_days': string
  }
}

const buildPrompt = (input: AnalysisInput): string => {
  const { creatorMetadata, creatorMetrics, competitors } = input

  const niche = creatorMetadata.niche || 'general'
  const platforms = creatorMetadata.platformsConnected || []
  
  // Format creator metrics
  const creatorMetricsText = creatorMetrics ? `
CREATOR METRICS (Last 30 days):
- Average Views: ${creatorMetrics.avg_views?.toLocaleString() || 'N/A'}
- Engagement Rate: ${creatorMetrics.engagement_rate?.toFixed(2) || 'N/A'}%
- Posting Frequency: ${creatorMetrics.posting_frequency?.toFixed(1) || 'N/A'} posts/videos per week
- Content Types: ${creatorMetrics.content_types?.join(', ') || 'N/A'}
` : `
CREATOR METRICS: Not available
`

  // Format competitor data
  const competitorsText = competitors.length > 0
    ? competitors.map((comp, idx) => {
        const metrics = comp.metrics
        return `
COMPETITOR ${idx + 1}: ${comp.name}
- Platform: ${comp.platform}
- Followers/Subscribers: ${comp.follower_count.toLocaleString()}
- Avg Views: ${metrics?.avg_views?.toLocaleString() || 'N/A'}
- Engagement Rate: ${metrics?.engagement_rate?.toFixed(2) || 'N/A'}%
- Posting Frequency: ${metrics?.posting_frequency?.toFixed(1) || 'N/A'} per week
- Best Content Type: ${metrics?.best_performing_content_type || 'N/A'}
- Peak Posting Days: ${metrics?.peak_posting_days?.map(d => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d]).join(', ') || 'N/A'}
`
      }).join('\n')
    : 'COMPETITORS: None found'

  return `You are an expert social media analytics consultant analyzing competitor benchmarking data.

CREATOR PROFILE:
- Niche: ${niche}
- Platforms: ${platforms.join(', ') || 'N/A'}
${creatorMetricsText}

${competitorsText}

TASK:
Analyze the creator's performance compared to competitors and generate structured insights.

REQUIREMENTS:
1. Base all comparisons ONLY on the provided metrics - do not speculate
2. Calculate gaps/deltas as percentages (positive = creator is better, negative = creator is worse)
3. If data is insufficient, provide conservative recommendations
4. Be specific and actionable - avoid generic advice
5. Growth projections should be realistic based on current metrics

Return ONLY valid JSON with this exact structure:
{
  "summary": {
    "overall_position": "underposting" | "competitive" | "outperforming",
    "key_strengths": ["string", "string"],
    "key_weaknesses": ["string", "string"]
  },
  "comparisons": {
    "posting_frequency_gap_percent": number,
    "engagement_rate_delta_percent": number,
    "avg_views_delta_percent": number
  },
  "content_gaps": [
    {
      "topic_or_format": "string",
      "observed_in_competitors_count": number,
      "reason": "string"
    }
  ],
  "recommendations": [
    {
      "action": "string",
      "expected_impact": "string",
      "priority": "high" | "medium" | "low"
    }
  ],
  "optimal_strategy": {
    "posts_per_week": number,
    "best_days": ["Monday", "Tuesday", etc.],
    "best_time_window": "string (e.g., '9 AM - 11 AM')"
  },
  "growth_projection": {
    "30_days": "string description",
    "60_days": "string description",
    "90_days": "string description"
  }
}

CRITICAL: Return ONLY the JSON object. No markdown code blocks, no explanations, no emojis.`
}

export const generateCompetitorAnalysis = async (
  input: AnalysisInput,
  opts: { logger?: { info: Function; warn: Function; error: Function } } = {}
): Promise<AnalysisResult | null> => {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    opts.logger?.warn?.('GROQ_API_KEY missing; skipping competitor analysis')
    return null
  }

  const startTime = Date.now()

  try {
    const groq = new Groq({ apiKey })
    const prompt = buildPrompt(input)

    opts.logger?.info?.('Generating competitor analysis with Groq', {
      competitorCount: input.competitors.length,
      hasCreatorMetrics: !!input.creatorMetrics
    })

    const completion = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      temperature: 0.2, // Low temperature for deterministic output
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'Return concise JSON only. No markdown, no emojis, no explanations.' },
        { role: 'user', content: prompt }
      ]
    })

    const content =
      completion?.choices?.[0]?.message?.content ||
      completion?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments

    if (!content) {
      opts.logger?.warn?.('Groq returned empty content')
      return null
    }

    const latency = Date.now() - startTime
    const usage = completion.usage

    opts.logger?.info?.('Groq API response received', {
      latency: `${latency}ms`,
      tokens: usage ? {
        prompt: usage.prompt_tokens,
        completion: usage.completion_tokens,
        total: usage.total_tokens
      } : 'N/A'
    })

    // Log raw AI response
    opts.logger?.info?.('Groq AI Response (raw)', {
      response: content,
      responseLength: content.length
    })

    try {
      // Parse and validate JSON
      const parsed = JSON.parse(content) as AnalysisResult

      // Comprehensive validation
      if (!parsed.summary || !parsed.comparisons || !parsed.recommendations || !parsed.optimal_strategy || !parsed.growth_projection) {
        opts.logger?.warn?.('Groq response missing required fields', {
          hasSummary: !!parsed.summary,
          hasComparisons: !!parsed.comparisons,
          hasRecommendations: !!parsed.recommendations,
          hasOptimalStrategy: !!parsed.optimal_strategy,
          hasGrowthProjection: !!parsed.growth_projection
        })
        return null
      }

      // Validate and fix summary structure
      if (!parsed.summary.key_strengths || !Array.isArray(parsed.summary.key_strengths)) {
        parsed.summary.key_strengths = []
      }
      if (!parsed.summary.key_weaknesses || !Array.isArray(parsed.summary.key_weaknesses)) {
        parsed.summary.key_weaknesses = []
      }

      // Validate enum values
      const validPositions = ['underposting', 'competitive', 'outperforming']
      if (!validPositions.includes(parsed.summary.overall_position)) {
        opts.logger?.warn?.('Invalid overall_position, defaulting to competitive', {
          received: parsed.summary.overall_position
        })
        parsed.summary.overall_position = 'competitive'
      }

      // Validate comparisons are numbers
      if (typeof parsed.comparisons.posting_frequency_gap_percent !== 'number') {
        parsed.comparisons.posting_frequency_gap_percent = 0
      }
      if (typeof parsed.comparisons.engagement_rate_delta_percent !== 'number') {
        parsed.comparisons.engagement_rate_delta_percent = 0
      }
      if (typeof parsed.comparisons.avg_views_delta_percent !== 'number') {
        parsed.comparisons.avg_views_delta_percent = 0
      }

      // Validate content_gaps array
      if (!Array.isArray(parsed.content_gaps)) {
        parsed.content_gaps = []
      }

      // Validate recommendations array and priority values
      if (!Array.isArray(parsed.recommendations)) {
        parsed.recommendations = []
      } else {
        parsed.recommendations = parsed.recommendations.map(rec => {
          if (!rec || typeof rec !== 'object') return null
          if (!['high', 'medium', 'low'].includes(rec.priority)) {
            rec.priority = 'medium'
          }
          return rec
        }).filter(Boolean) as typeof parsed.recommendations
      }

      // Validate optimal_strategy
      if (!parsed.optimal_strategy.posts_per_week || typeof parsed.optimal_strategy.posts_per_week !== 'number') {
        parsed.optimal_strategy.posts_per_week = 3
      }
      if (!Array.isArray(parsed.optimal_strategy.best_days)) {
        parsed.optimal_strategy.best_days = ['Monday', 'Wednesday', 'Friday']
      }
      if (!parsed.optimal_strategy.best_time_window || typeof parsed.optimal_strategy.best_time_window !== 'string') {
        parsed.optimal_strategy.best_time_window = '9 AM - 11 AM'
      }

      // Validate growth_projection
      if (!parsed.growth_projection['30_days']) {
        parsed.growth_projection['30_days'] = 'Insufficient data for projection'
      }
      if (!parsed.growth_projection['60_days']) {
        parsed.growth_projection['60_days'] = 'Insufficient data for projection'
      }
      if (!parsed.growth_projection['90_days']) {
        parsed.growth_projection['90_days'] = 'Insufficient data for projection'
      }

      opts.logger?.info?.('Competitor analysis generated successfully', {
        overallPosition: parsed.summary.overall_position,
        recommendationsCount: parsed.recommendations.length,
        contentGapsCount: parsed.content_gaps.length
      })

      return parsed
    } catch (error) {
      opts.logger?.warn?.('Groq JSON parse failed', {
        error: (error as Error).message,
        contentPreview: content.substring(0, 200)
      })
      return null
    }
  } catch (error) {
    opts.logger?.warn?.('Groq request failed', {
      error: (error as Error).message,
      stack: (error as Error).stack
    })
    return null
  }
}

