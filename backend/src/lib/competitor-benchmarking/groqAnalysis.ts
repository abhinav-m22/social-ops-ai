import Groq from 'groq-sdk'
import type { CompetitorBenchmarkingState, Competitor, CompetitorMetrics, Platform, PlatformAIInsights } from '../../steps/competitor-benchmarking/types.js'

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

/**
 * Generate platform-specific AI analysis
 * Extracts key details from data before sending to AI (not everything)
 */
export async function generatePlatformAnalysis(
  platform: Platform,
  summaryData: {
    competitorCount: number
    totalPosts: number
    avgFollowers: number
    posts?: any[]
  },
  opts: { logger?: { info: Function; warn: Function; error: Function } } = {}
): Promise<PlatformAIInsights | null> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    opts.logger?.warn?.('GROQ_API_KEY missing; skipping platform analysis')
    return null
  }

  const startTime = Date.now()

  try {
    const groq = new Groq({ apiKey })

    // Extract key metrics from posts (not all data)
    const posts = summaryData.posts || []
    const avgLikes = posts.length > 0 
      ? posts.reduce((sum: number, p: any) => sum + (p.likeCount || p.likes_count || 0), 0) / posts.length 
      : 0
    const avgComments = posts.length > 0
      ? posts.reduce((sum: number, p: any) => sum + (p.commentCount || p.comments_count || 0), 0) / posts.length
      : 0
    const contentTypes = posts.map((p: any) => p.contentType || p.post_type || 'post')
    const topTopics = extractTopTopics(posts)
    
    // Extract posting patterns for all platforms
    let videoTitles: string[] = []
    let postingPattern: any = {}
    let thumbnailAnalysis = ''
    
    // Analyze posting patterns for all platforms
    if (posts.length > 0) {
      // Analyze posting pattern (days of week, frequency, time patterns)
      const publishDates = posts.map((p: any) => {
        const date = p.published_at || p.created_at || p.timestamp
        return date ? new Date(date) : null
      }).filter(Boolean) as Date[]
      
      if (publishDates.length > 0) {
        // Sort dates chronologically
        publishDates.sort((a, b) => a.getTime() - b.getTime())
        
        const daysOfWeek = publishDates.map(d => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()])
        const dayCounts = daysOfWeek.reduce((acc, day) => {
          acc[day] = (acc[day] || 0) + 1
          return acc
        }, {} as Record<string, number> as any)
        
        const hoursOfDay = publishDates.map(d => d.getHours())
        const hourCounts = hoursOfDay.reduce((acc, hour) => {
          acc[hour] = (acc[hour] || 0) + 1
          return acc
        }, {} as Record<number, number> as any)
        
        const mostCommonDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
        const mostCommonHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
        
        // Calculate average days between posts
        const timeDiffs: number[] = []
        for (let i = 1; i < publishDates.length; i++) {
          const diff = (publishDates[i].getTime() - publishDates[i - 1].getTime()) / (1000 * 60 * 60 * 24)
          timeDiffs.push(diff)
        }
        const avgDaysBetween = timeDiffs.length > 0 
          ? timeDiffs.reduce((sum, diff) => sum + diff, 0) / timeDiffs.length
          : 0
        
        // Calculate posting frequency (posts per week)
        const totalDays = publishDates.length > 1
          ? (publishDates[publishDates.length - 1].getTime() - publishDates[0].getTime()) / (1000 * 60 * 60 * 24)
          : 1
        const postsPerWeek = totalDays > 0 ? (publishDates.length / totalDays) * 7 : publishDates.length
        
        postingPattern = {
          mostCommonDay,
          mostCommonHour: mostCommonHour ? `${mostCommonHour}:00` : 'N/A',
          avgDaysBetween: avgDaysBetween.toFixed(1),
          postsPerWeek: postsPerWeek.toFixed(1),
          totalPosts: publishDates.length,
          dayDistribution: dayCounts,
          hourDistribution: hourCounts,
          postingConsistency: avgDaysBetween < 2 ? 'high' : avgDaysBetween < 4 ? 'medium' : 'low'
        }
      }
    }
    
    if (platform === 'youtube' && posts.length > 0) {
      videoTitles = posts.slice(0, 10).map((p: any) => p.title || '').filter(Boolean)
      
      // Analyze thumbnails (presence and patterns)
      const videosWithThumbnails = posts.filter((p: any) => p.thumbnail_url || p.raw_metrics?.thumbnail_url).length
      thumbnailAnalysis = `${videosWithThumbnails}/${posts.length} videos have thumbnails. `
      
      // Extract common title patterns
      const titleWords = videoTitles.flatMap(title => title.toLowerCase().split(/\s+/))
      const wordFrequency = titleWords.reduce((acc, word) => {
        if (word.length > 3) { // Ignore short words
          acc[word] = (acc[word] || 0) + 1
        }
        return acc
      }, {} as Record<string, number>)
      const commonWords = Object.entries(wordFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([word]) => word)
      
      thumbnailAnalysis += `Common title words: ${commonWords.join(', ')}`
    }

    const prompt = `You are an expert social media analytics consultant analyzing ${platform} competitor data.

COMPETITOR DATA SUMMARY:
- Number of competitors analyzed: ${summaryData.competitorCount}
- Total posts/videos analyzed: ${summaryData.totalPosts}
- Average followers/subscribers: ${summaryData.avgFollowers.toLocaleString()}
- Average likes per post: ${Math.round(avgLikes).toLocaleString()}
- Average comments per post: ${Math.round(avgComments).toLocaleString()}
- Average views per video: ${posts.length > 0 ? Math.round(posts.reduce((sum: number, p: any) => sum + (p.view_count || 0), 0) / posts.length).toLocaleString() : '0'}
- Content types observed: ${[...new Set(contentTypes)].join(', ')}
- Top topics: ${topTopics.slice(0, 5).join(', ')}
${Object.keys(postingPattern).length > 0 ? `
POSTING PATTERN ANALYSIS:
- Most common posting day: ${postingPattern.mostCommonDay || 'N/A'}
- Most common posting hour: ${postingPattern.mostCommonHour || 'N/A'}
- Average days between posts: ${postingPattern.avgDaysBetween || 'N/A'} days
- Posts per week: ${postingPattern.postsPerWeek || 'N/A'}
- Posting consistency: ${postingPattern.postingConsistency || 'N/A'}
- Day distribution: ${JSON.stringify(postingPattern.dayDistribution || {})}
- Total posts analyzed: ${postingPattern.totalPosts || 0}
${platform === 'youtube' && videoTitles.length > 0 ? `
VIDEO TITLE ANALYSIS:
- Sample titles: ${videoTitles.slice(0, 5).join(' | ')}
- Title patterns: Analyze common words, hooks, and structure

THUMBNAIL ANALYSIS:
- ${thumbnailAnalysis}
` : ''}
` : ''}

TASK:
Generate platform-specific insights for ${platform} based ONLY on the provided data.

SPECIFIC FOCUS:
${platform === 'youtube' ? `
1. Analyze video TITLES: What patterns work? (question hooks, numbers, emotional triggers, keywords)
2. Analyze THUMBNAILS: Are they consistent? What visual elements appear?
3. Analyze POSTING PATTERN: What days/times perform best? What's the optimal frequency?
4. Provide actionable recommendations for title optimization, thumbnail design, and posting schedule
` : platform === 'instagram' ? `
1. Analyze POSTING PATTERN: What days/times do competitors post? What's their frequency?
2. Analyze CONTENT TYPES: Which formats (reels vs posts) perform better?
3. Analyze ENGAGEMENT PATTERNS: What content gets the most likes/comments?
4. Provide actionable recommendations for posting schedule, content mix, and engagement strategies
` : `
1. Analyze POSTING PATTERN: What days/times do competitors post? What's their frequency?
2. Analyze CONTENT TYPES: Which formats perform better?
3. Analyze ENGAGEMENT PATTERNS: What content gets the most reactions/comments/shares?
4. Provide actionable recommendations for posting schedule and content strategy
`}

REQUIREMENTS:
1. Base all insights ONLY on the provided metrics - do not speculate
2. Be specific and actionable - focus on posting patterns, timing, and content strategies
3. Focus on ${platform}-specific patterns
4. If data is insufficient, provide conservative recommendations
5. Include detailed posting pattern analysis: best days, best times, optimal frequency, consistency insights
6. ${platform === 'youtube' ? 'Include specific insights about title patterns, thumbnail strategies, and posting frequency based on the data provided.' : 'Include specific insights about posting patterns, content timing, and engagement strategies.'}

Return ONLY valid JSON with this exact structure:
{
  "platform": "${platform}",
  "summary": {
    "positioning": "string (1-2 sentences describing overall positioning)",
    "strengths": ["string", "string"],
    "weaknesses": ["string", "string"]
  },
  "content_insights": {
    "best_formats": ["string", "string"],
    "underused_formats": ["string"],
    "top_topics": ["string", "string", "string"]
  },
  "posting_strategy": {
    "recommended_frequency": number,
    "best_days": ["Monday", "Tuesday", etc.],
    "best_time_window": "string (e.g., '9 AM - 11 AM')"
  },
  "growth_opportunities": ["string", "string", "string"]
}

CRITICAL: Return ONLY the JSON object. No markdown code blocks, no explanations, no emojis.`

    opts.logger?.info?.('Generating platform analysis with Groq', {
      platform,
      competitorCount: summaryData.competitorCount,
      totalPosts: summaryData.totalPosts
    })

    const completion = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'Return concise JSON only. No markdown, no emojis, no explanations.' },
        { role: 'user', content: prompt }
      ]
    })

    const content = completion?.choices?.[0]?.message?.content

    if (!content) {
      opts.logger?.warn?.('Groq returned empty content')
      return null
    }

    const latency = Date.now() - startTime
    
    // Log the raw AI response for debugging
    opts.logger?.info?.('Groq platform analysis response received', {
      latency: `${latency}ms`,
      platform,
      responseLength: content.length,
      rawResponse: content
    })

    try {
      const parsed = JSON.parse(content) as PlatformAIInsights

      // Validate structure
      if (!parsed.summary || !parsed.content_insights || !parsed.posting_strategy || !parsed.growth_opportunities) {
        opts.logger?.warn?.('Groq response missing required fields')
        return null
      }

      // Ensure arrays are arrays
      if (!Array.isArray(parsed.summary.strengths)) parsed.summary.strengths = []
      if (!Array.isArray(parsed.summary.weaknesses)) parsed.summary.weaknesses = []
      if (!Array.isArray(parsed.content_insights.best_formats)) parsed.content_insights.best_formats = []
      if (!Array.isArray(parsed.content_insights.underused_formats)) parsed.content_insights.underused_formats = []
      if (!Array.isArray(parsed.content_insights.top_topics)) parsed.content_insights.top_topics = []
      if (!Array.isArray(parsed.growth_opportunities)) parsed.growth_opportunities = []
      if (!Array.isArray(parsed.posting_strategy.best_days)) {
        parsed.posting_strategy.best_days = ['Monday', 'Wednesday', 'Friday']
      }

      // Ensure numbers are numbers
      if (typeof parsed.posting_strategy.recommended_frequency !== 'number') {
        parsed.posting_strategy.recommended_frequency = 3
      }

      // Ensure strings are strings
      if (typeof parsed.summary.positioning !== 'string') {
        parsed.summary.positioning = 'Analysis based on available competitor data'
      }
      if (typeof parsed.posting_strategy.best_time_window !== 'string') {
        parsed.posting_strategy.best_time_window = '9 AM - 11 AM'
      }

      parsed.platform = platform
      parsed.generated_at = new Date().toISOString()

      opts.logger?.info?.('Platform analysis generated successfully', {
        platform,
        strengthsCount: parsed.summary.strengths.length,
        opportunitiesCount: parsed.growth_opportunities.length,
        fullResponse: JSON.stringify(parsed, null, 2)
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

/**
 * Extract top topics from posts (from captions/hashtags)
 */
function extractTopTopics(posts: any[]): string[] {
  const topicCounts = new Map<string, number>()

  for (const post of posts) {
    const caption = post.caption || post.text || ''
    const hashtags = post.hashtags || []
    
    // Count hashtags
    for (const tag of hashtags) {
      const normalized = tag.toLowerCase()
      topicCounts.set(normalized, (topicCounts.get(normalized) || 0) + 1)
    }

    // Extract keywords from caption (simple approach)
    const words = caption.toLowerCase().match(/\b\w{4,}\b/g) || []
    for (const word of words) {
      if (word.length >= 4 && !['this', 'that', 'with', 'from', 'your', 'they', 'have', 'been'].includes(word)) {
        topicCounts.set(word, (topicCounts.get(word) || 0) + 1)
      }
    }
  }

  // Return top 10 topics
  return Array.from(topicCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([topic]) => topic)
}

