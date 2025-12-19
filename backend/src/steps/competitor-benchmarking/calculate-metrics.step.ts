import type { EventConfig, Handlers } from 'motia'
import type { CompetitorBenchmarkingState, CompetitorMetrics, FacebookPost, YouTubeVideo } from './types'

export const config: EventConfig = {
  type: 'event',
  name: 'CalculateMetrics',
  subscribes: ['competitor.metrics.calculate'],
  emits: ['competitor.ai.analyze'],
  description: 'Calculates comparative metrics between creator and competitors',
  flows: ['competitor-benchmarking'],
  input: {
    type: 'object',
    properties: {
      creatorId: { type: 'string' }
    },
    required: ['creatorId']
  }
}

/**
 * Calculate metrics for Facebook competitor
 */
function calculateFacebookMetrics(
  posts: FacebookPost[],
  followerCount: number
): CompetitorMetrics {
  if (posts.length === 0) {
    return {
      avg_views: 0,
      avg_likes: 0,
      avg_comments: 0,
      engagement_rate: 0,
      posting_frequency: 0
    }
  }

  const totalLikes = posts.reduce((sum, p) => sum + p.likes_count, 0)
  const totalComments = posts.reduce((sum, p) => sum + p.comments_count, 0)
  const totalShares = posts.reduce((sum, p) => sum + p.shares_count, 0)
  const totalEngagement = totalLikes + totalComments + totalShares

  const avgLikes = totalLikes / posts.length
  const avgComments = totalComments / posts.length
  const engagementRate = followerCount > 0 ? (totalEngagement / posts.length) / followerCount : 0

  // Calculate posting frequency (posts per week)
  const firstPost = new Date(posts[posts.length - 1].created_time)
  const lastPost = new Date(posts[0].created_time)
  const daysDiff = Math.max(1, (lastPost.getTime() - firstPost.getTime()) / (1000 * 60 * 60 * 24))
  const postingFrequency = (posts.length / daysDiff) * 7

  // Determine best performing content type
  const typeStats = new Map<string, { count: number; totalEngagement: number }>()
  for (const post of posts) {
        const engagement = post.likes_count + post.comments_count + post.shares_count
        const existing = typeStats.get(post.post_type) || { count: 0, totalEngagement: 0 }
        typeStats.set(post.post_type, {
          count: existing.count + 1,
          totalEngagement: existing.totalEngagement + engagement
        })
      }
  
  let bestContentType: string | undefined
  let bestAvgEngagement = 0
  for (const [type, stats] of typeStats.entries()) {
    const avgEngagement = stats.totalEngagement / stats.count
    if (avgEngagement > bestAvgEngagement) {
      bestAvgEngagement = avgEngagement
      bestContentType = type
    }
  }

  // Calculate peak posting days (0 = Sunday, 6 = Saturday)
  const dayCounts = new Array(7).fill(0)
  for (const post of posts) {
    const day = new Date(post.created_time).getDay()
    dayCounts[day]++
  }
  const maxCount = Math.max(...dayCounts)
  const peakDays = dayCounts
    .map((count, day) => (count === maxCount ? day : -1))
    .filter(day => day !== -1)

  return {
    avg_views: 0, // Facebook posts don't have view counts in basic API
    avg_likes: Math.round(avgLikes),
    avg_comments: Math.round(avgComments),
    engagement_rate: Math.round(engagementRate * 10000) / 100, // Convert to percentage with 2 decimals
    posting_frequency: Math.round(postingFrequency * 100) / 100,
    best_performing_content_type: bestContentType,
    peak_posting_days: peakDays
  }
}

/**
 * Calculate metrics for YouTube competitor
 */
function calculateYouTubeMetrics(
  videos: YouTubeVideo[],
  subscriberCount: number
): CompetitorMetrics {
  if (videos.length === 0) {
    return {
      avg_views: 0,
      avg_likes: 0,
      avg_comments: 0,
      engagement_rate: 0,
      posting_frequency: 0
    }
  }

  const totalViews = videos.reduce((sum, v) => sum + v.view_count, 0)
  const totalLikes = videos.reduce((sum, v) => sum + v.like_count, 0)
  const totalComments = videos.reduce((sum, v) => sum + v.comment_count, 0)
  const totalEngagement = totalLikes + totalComments

  const avgViews = totalViews / videos.length
  const avgLikes = totalLikes / videos.length
  const avgComments = totalComments / videos.length
  const engagementRate = subscriberCount > 0 ? (totalEngagement / videos.length) / subscriberCount : 0

  // Calculate posting frequency (videos per week)
  const firstVideo = new Date(videos[videos.length - 1].published_at)
  const lastVideo = new Date(videos[0].published_at)
  const daysDiff = Math.max(1, (lastVideo.getTime() - firstVideo.getTime()) / (1000 * 60 * 60 * 24))
  const postingFrequency = (videos.length / daysDiff) * 7

  // For YouTube, content type is always 'video', but we can analyze duration if needed
  const bestContentType = 'video'

  // Calculate peak posting days
  const dayCounts = new Array(7).fill(0)
  for (const video of videos) {
    const day = new Date(video.published_at).getDay()
    dayCounts[day]++
  }
  const maxCount = Math.max(...dayCounts)
  const peakDays = dayCounts
    .map((count, day) => (count === maxCount ? day : -1))
    .filter(day => day !== -1)

  return {
    avg_views: Math.round(avgViews),
    avg_likes: Math.round(avgLikes),
    avg_comments: Math.round(avgComments),
    engagement_rate: Math.round(engagementRate * 10000) / 100, // Convert to percentage with 2 decimals
    posting_frequency: Math.round(postingFrequency * 100) / 100,
    best_performing_content_type: bestContentType,
    peak_posting_days: peakDays
  }
}

export const handler: Handlers['CalculateMetrics'] = async (input, ctx) => {
  const { creatorId } = input || {}

  ctx.logger.info('CalculateMetrics: Starting metrics calculation', {
    creatorId,
    traceId: ctx.traceId
  })

  if (!creatorId) {
    ctx.logger.warn('CalculateMetrics: Missing creatorId')
    return
  }

  try {
    // Get current state
    const state = await ctx.state.get<CompetitorBenchmarkingState>(
      'competitorBenchmarking',
      creatorId
    )

    if (!state) {
      ctx.logger.error('CalculateMetrics: State not found', { creatorId })
      return
    }

    // Calculate metrics for each competitor
    const updatedCompetitors = state.competitors.map(competitor => {
      try {
        let metrics: CompetitorMetrics | undefined

        if (competitor.platform === 'facebook' && competitor.content?.facebook_posts) {
          metrics = calculateFacebookMetrics(
            competitor.content.facebook_posts,
            competitor.follower_count
          )
        } else if (competitor.platform === 'youtube' && competitor.content?.youtube_videos) {
          metrics = calculateYouTubeMetrics(
            competitor.content.youtube_videos,
            competitor.follower_count
          )
        }

        if (metrics) {
          ctx.logger.info('CalculateMetrics: Calculated metrics for competitor', {
            competitorId: competitor.external_id,
            competitorName: competitor.name,
            platform: competitor.platform,
            subscribers: competitor.follower_count.toLocaleString(),
            engagementRate: `${metrics.engagement_rate}%`,
            postingFrequency: `${metrics.posting_frequency} per week`,
            avgViews: metrics.avg_views.toLocaleString(),
            avgLikes: metrics.avg_likes.toLocaleString(),
            avgComments: metrics.avg_comments.toLocaleString(),
            bestContentType: metrics.best_performing_content_type
          })
        }

        return {
          ...competitor,
          metrics
        }
      } catch (error) {
        ctx.logger.error('CalculateMetrics: Failed to calculate metrics for competitor', {
          competitorId: competitor.external_id,
          platform: competitor.platform,
          error: error instanceof Error ? error.message : String(error)
        })
        // Return competitor without metrics
        return competitor
      }
    })

    // Fetch creator's own metrics if available
    const creatorMetricsCache = await ctx.state.get('creatorMetricsCache', `metrics-${creatorId}`)
    const creatorMetrics = creatorMetricsCache?.metrics || {}

    ctx.logger.info('CalculateMetrics: Creator metrics loaded', {
      creatorId,
      hasMetrics: !!creatorMetricsCache
    })

    // Update state with calculated metrics
    const updatedState: CompetitorBenchmarkingState = {
      ...state,
      competitors: updatedCompetitors,
      creator_metrics: creatorMetrics,
      updated_at: new Date().toISOString()
    }

    await ctx.state.set('competitorBenchmarking', creatorId, updatedState)

    // Emit event for AI analysis
    await ctx.emit({
      topic: 'competitor.ai.analyze',
      data: {
        creatorId
      }
    })

    ctx.logger.info('CalculateMetrics: Metrics calculation completed', {
      creatorId,
      competitorCount: updatedCompetitors.length,
      competitorsWithMetrics: updatedCompetitors.filter(c => c.metrics).length,
      competitors: updatedCompetitors.map(c => ({
        name: c.name,
        platform: c.platform,
        subscribers: c.follower_count.toLocaleString(),
        hasMetrics: !!c.metrics,
        engagementRate: c.metrics ? `${c.metrics.engagement_rate}%` : 'N/A',
        postingFrequency: c.metrics ? `${c.metrics.posting_frequency}/week` : 'N/A'
      }))
    })
  } catch (error) {
    ctx.logger.error('CalculateMetrics: Failed', {
      creatorId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })

    // Update state to failed
    const state = await ctx.state.get<CompetitorBenchmarkingState>(
      'competitorBenchmarking',
      creatorId
    )
    if (state) {
      const failedState: CompetitorBenchmarkingState = {
        ...state,
        status: 'failed',
        updated_at: new Date().toISOString()
      }
      await ctx.state.set('competitorBenchmarking', creatorId, failedState)
    }
  }
}

