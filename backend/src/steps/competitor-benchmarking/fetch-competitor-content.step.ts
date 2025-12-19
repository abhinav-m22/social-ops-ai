import type { EventConfig, Handlers } from 'motia'
import type { CompetitorBenchmarkingState, Competitor, FacebookPost, YouTubeVideo } from './types'

export const config: EventConfig = {
  type: 'event',
  name: 'FetchCompetitorContent',
  subscribes: ['competitor.content.fetch'],
  emits: ['competitor.metrics.calculate'],
  description: 'Fetches content and engagement data for discovered competitors',
  flows: ['competitor-benchmarking'],
  input: {
    type: 'object',
    properties: {
      creatorId: { type: 'string' },
      competitors: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            platform: { type: 'string' },
            external_id: { type: 'string' },
            name: { type: 'string' },
            follower_count: { type: 'number' }
          }
        }
      }
    },
    required: ['creatorId']
  }
}

/**
 * Fetch Facebook posts from last 30 days
 */
async function fetchFacebookPosts(
  pageId: string,
  token: string,
  logger: any
): Promise<FacebookPost[]> {
  const posts: FacebookPost[] = []
  const thirtyDaysAgo = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000)

  try {
    const url = `https://graph.facebook.com/v18.0/${pageId}/posts?fields=id,created_time,type,likes.summary(true),comments.summary(true),shares&since=${thirtyDaysAgo}&limit=100&access_token=${token}`
    
    const response = await fetch(url)
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`Facebook API error: ${errorData.error?.message || response.statusText}`)
    }

    const data = await response.json()
    
    for (const post of data.data || []) {
      const createdTime = new Date(post.created_time).getTime()
      const thirtyDaysAgoTime = Date.now() - 30 * 24 * 60 * 60 * 1000
      
      // Filter to last 30 days
      if (createdTime >= thirtyDaysAgoTime) {
        posts.push({
          post_id: post.id,
          created_time: post.created_time,
          post_type: (post.type || 'status') as 'photo' | 'video' | 'link' | 'status',
          likes_count: post.likes?.summary?.total_count || 0,
          comments_count: post.comments?.summary?.total_count || 0,
          shares_count: post.shares?.count || 0
        })
      }
    }

    logger.info('FetchFacebookPosts: Fetched posts', {
      pageId,
      postCount: posts.length
    })

  } catch (error) {
    logger.error('FetchFacebookPosts: Error', {
      pageId,
      error: error instanceof Error ? error.message : String(error)
    })
    // Don't throw - return empty array to allow workflow to continue
  }

  return posts
}

/**
 * Fetch YouTube videos from last 30 days
 */
async function fetchYouTubeVideos(
  channelId: string,
  apiKey: string,
  logger: any
): Promise<YouTubeVideo[]> {
  const videos: YouTubeVideo[] = []
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  try {
    // Search for videos uploaded in last 30 days
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&type=video&publishedAfter=${thirtyDaysAgo}&maxResults=50&order=date&key=${apiKey}`
    
    const searchResponse = await fetch(searchUrl)
    if (!searchResponse.ok) {
      const errorData = await searchResponse.json()
      throw new Error(`YouTube search API error: ${errorData.error?.message || searchResponse.statusText}`)
    }

    const searchData = await searchResponse.json()
    const videoIds = (searchData.items || []).map((item: any) => item.id.videoId).filter(Boolean)

    if (videoIds.length === 0) {
      logger.info('FetchYouTubeVideos: No videos found', { channelId })
      return videos
    }

    // Fetch video statistics in batch (max 50 per request)
    const batchSize = 50
    for (let i = 0; i < videoIds.length; i += batchSize) {
      const batch = videoIds.slice(i, i + batchSize)
      const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails,snippet&id=${batch.join(',')}&key=${apiKey}`
      
      const statsResponse = await fetch(statsUrl)
      if (!statsResponse.ok) {
        const errorData = await statsResponse.json()
        logger.warn('FetchYouTubeVideos: Batch fetch failed', {
          channelId,
          batchIndex: i,
          error: errorData.error?.message
        })
        continue
      }

      const statsData = await statsResponse.json()
      
      for (const video of statsData.items || []) {
        const publishedAt = new Date(video.snippet?.publishedAt || 0).getTime()
        const thirtyDaysAgoTime = Date.now() - 30 * 24 * 60 * 60 * 1000
        
        // Double-check date filter
        if (publishedAt >= thirtyDaysAgoTime) {
          videos.push({
            video_id: video.id,
            published_at: video.snippet?.publishedAt || '',
            duration: video.contentDetails?.duration,
            view_count: parseInt(video.statistics?.viewCount || '0'),
            like_count: parseInt(video.statistics?.likeCount || '0'),
            comment_count: parseInt(video.statistics?.commentCount || '0')
          })
        }
      }
    }

    logger.info('FetchYouTubeVideos: Fetched videos', {
      channelId,
      videoCount: videos.length
    })

  } catch (error) {
    logger.error('FetchYouTubeVideos: Error', {
      channelId,
      error: error instanceof Error ? error.message : String(error)
    })
    // Don't throw - return empty array to allow workflow to continue
  }

  return videos
}

export const handler: Handlers['FetchCompetitorContent'] = async (input, ctx) => {
  const { creatorId, competitors = [] } = input || {}

  ctx.logger.info('FetchCompetitorContent: Starting content fetch', {
    creatorId,
    competitorCount: competitors.length,
    traceId: ctx.traceId
  })

  if (!creatorId) {
    ctx.logger.warn('FetchCompetitorContent: Missing creatorId')
    return
  }

  try {
    // Get current state
    const state = await ctx.state.get<CompetitorBenchmarkingState>(
      'competitorBenchmarking',
      creatorId
    )

    if (!state) {
      ctx.logger.error('FetchCompetitorContent: State not found', { creatorId })
      return
    }

    // Use competitors from state if input is empty
    const competitorsToFetch = competitors.length > 0 ? competitors : state.competitors

    if (competitorsToFetch.length === 0) {
      ctx.logger.warn('FetchCompetitorContent: No competitors to fetch', { creatorId })
      // Still emit to continue workflow
      await ctx.emit({
        topic: 'competitor.metrics.calculate',
        data: { creatorId }
      })
      return
    }

    const fbToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN || process.env.FB_PAGE_TOKEN
    const youtubeApiKey = process.env.YOUTUBE_API_KEY

    const updatedCompetitors: Competitor[] = []

    // Fetch content for each competitor
    for (const competitor of competitorsToFetch) {
      try {
        if (competitor.platform === 'facebook') {
          if (!fbToken) {
            ctx.logger.warn('FetchCompetitorContent: Facebook token not available', {
              competitorId: competitor.external_id
            })
            updatedCompetitors.push(competitor)
            continue
          }

          const posts = await fetchFacebookPosts(
            competitor.external_id,
            fbToken,
            ctx.logger
          )

          updatedCompetitors.push({
            ...competitor,
            content: {
              platform: 'facebook',
              external_id: competitor.external_id,
              facebook_posts: posts
            }
          })

          ctx.logger.info('FetchCompetitorContent: Facebook content fetched', {
            competitorId: competitor.external_id,
            postCount: posts.length
          })

        } else if (competitor.platform === 'youtube') {
          if (!youtubeApiKey) {
            ctx.logger.warn('FetchCompetitorContent: YouTube API key not available', {
              competitorId: competitor.external_id
            })
            updatedCompetitors.push(competitor)
            continue
          }

          const videos = await fetchYouTubeVideos(
            competitor.external_id,
            youtubeApiKey,
            ctx.logger
          )

          updatedCompetitors.push({
            ...competitor,
            content: {
              platform: 'youtube',
              external_id: competitor.external_id,
              youtube_videos: videos
            }
          })

          ctx.logger.info('FetchCompetitorContent: YouTube content fetched', {
            competitorId: competitor.external_id,
            competitorName: competitor.name,
            videoCount: videos.length,
            subscriberCount: competitor.follower_count.toLocaleString()
          })
        } else {
          // Unknown platform, keep as-is
          updatedCompetitors.push(competitor)
        }

        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 200))

      } catch (error) {
        // Log error but continue with other competitors
        ctx.logger.error('FetchCompetitorContent: Failed for competitor', {
          competitorId: competitor.external_id,
          platform: competitor.platform,
          error: error instanceof Error ? error.message : String(error)
        })
        // Still add competitor without content
        updatedCompetitors.push(competitor)
      }
    }

    // Update state with fetched content
    const updatedState: CompetitorBenchmarkingState = {
      ...state,
      competitors: updatedCompetitors,
      updated_at: new Date().toISOString()
    }

    await ctx.state.set('competitorBenchmarking', creatorId, updatedState)

    // Emit event to calculate metrics
    await ctx.emit({
      topic: 'competitor.metrics.calculate',
      data: {
        creatorId
      }
    })

    ctx.logger.info('FetchCompetitorContent: Content fetch completed', {
      creatorId,
      competitorCount: updatedCompetitors.length,
      totalPosts: updatedCompetitors.reduce((sum, c) => sum + (c.content?.facebook_posts?.length || 0), 0),
      totalVideos: updatedCompetitors.reduce((sum, c) => sum + (c.content?.youtube_videos?.length || 0), 0),
      competitors: updatedCompetitors.map(c => ({
        platform: c.platform,
        name: c.name,
        channelId: c.external_id,
        subscribers: c.follower_count.toLocaleString(),
        posts: c.content?.facebook_posts?.length || 0,
        videos: c.content?.youtube_videos?.length || 0
      }))
    })
  } catch (error) {
    ctx.logger.error('FetchCompetitorContent: Failed', {
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

