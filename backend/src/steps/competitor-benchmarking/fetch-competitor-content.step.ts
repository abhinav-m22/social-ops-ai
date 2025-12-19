import type { EventConfig, Handlers } from 'motia'
import type { CompetitorBenchmarkingState, Competitor, FacebookPost, YouTubeVideo, InstagramPost } from './types'
import { runApifyActor, isApifyConfigured } from '../../lib/competitor-benchmarking/apifyClient.js'

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
 * Fetch Instagram posts from last 30 days using Apify
 */
async function fetchInstagramPosts(
  username: string,
  logger: any
): Promise<InstagramPost[]> {
  const posts: InstagramPost[] = []
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000

  if (!isApifyConfigured()) {
    logger.warn('FetchInstagramPosts: Apify not configured, skipping Instagram content fetch')
    return posts
  }

  try {
    logger.info('FetchInstagramPosts: Starting content fetch', {
      username
    })

    // Use Apify Instagram profile scraper to fetch posts
    const actorInput = {
      usernames: [username],
      resultsType: 'posts',
      resultsLimit: 5
    }

    logger.info('FetchInstagramPosts: Calling Apify actor', {
      actorId: 'apify/instagram-profile-scraper',
      input: JSON.stringify(actorInput, null, 2)
    })

    const results = await runApifyActor<any>(
      'apify/instagram-profile-scraper',
      actorInput,
      logger
    )

    // Log raw Apify response for debugging
    logger.info('FetchInstagramPosts: Raw Apify response received', {
      username,
      resultCount: results?.length || 0,
      hasResults: !!results && results.length > 0,
      sampleResult: results && results.length > 0 ? {
        keys: Object.keys(results[0]),
        sample: JSON.stringify(results[0], null, 2)
      } : null,
      allResults: results ? results.map((item: any, idx: number) => ({
        index: idx + 1,
        keys: Object.keys(item),
        data: JSON.stringify(item, null, 2)
      })) : []
    })

    if (!results || results.length === 0) {
      logger.warn('FetchInstagramPosts: No results from Apify', {
        username,
        actorInput
      })
      return posts
    }

    logger.info('FetchInstagramPosts: Processing results', {
      username,
      resultCount: results.length,
      thirtyDaysAgo: new Date(thirtyDaysAgo).toISOString()
    })

    // Filter and transform results
    for (const item of results) {
      try {
        logger.debug('FetchInstagramPosts: Processing raw item', {
          username,
          itemKeys: Object.keys(item),
          itemData: JSON.stringify(item, null, 2)
        })

        // Extract timestamp (handle different possible formats)
        let timestamp: number | null = null
        if (item.timestamp) {
          timestamp = typeof item.timestamp === 'number' 
            ? item.timestamp * 1000 // Convert seconds to milliseconds if needed
            : new Date(item.timestamp).getTime()
        } else if (item.createdAt) {
          timestamp = new Date(item.createdAt).getTime()
        } else if (item.created_time) {
          timestamp = new Date(item.created_time).getTime()
        }

        logger.debug('FetchInstagramPosts: Timestamp extraction', {
          username,
          itemId: item.id || item.postId || 'unknown',
          timestampRaw: item.timestamp || item.createdAt || item.created_time || 'not found',
          timestampParsed: timestamp ? new Date(timestamp).toISOString() : null,
          thirtyDaysAgo: new Date(thirtyDaysAgo).toISOString(),
          isWithinRange: timestamp ? timestamp >= thirtyDaysAgo : false
        })

        if (!timestamp || timestamp < thirtyDaysAgo) {
          logger.debug('FetchInstagramPosts: Post filtered out (date)', {
            username,
            itemId: item.id || item.postId || 'unknown',
            timestamp: timestamp ? new Date(timestamp).toISOString() : 'unknown',
            thirtyDaysAgo: new Date(thirtyDaysAgo).toISOString()
          })
          continue
        }

        // Determine content type
        const isVideo = item.isVideo || item.type === 'video' || item.isReel || item.type === 'reel'
        const contentType: 'reel' | 'post' = isVideo ? 'reel' : 'post'

        // Extract engagement metrics
        const likeCount = item.likeCount || item.likesCount || item.likes || 0
        const commentCount = item.commentCount || item.commentsCount || item.comments || 0
        const playCount = isVideo ? (item.playCount || item.videoViewCount || item.views || 0) : undefined

        // Extract hashtags
        const hashtags: string[] = []
        if (item.hashtags && Array.isArray(item.hashtags)) {
          hashtags.push(...item.hashtags)
        } else if (item.caption) {
          // Extract hashtags from caption
          const hashtagRegex = /#[\w]+/g
          const matches = item.caption.match(hashtagRegex)
          if (matches) {
            hashtags.push(...matches.map((h: string) => h.substring(1)))
          }
        }

        posts.push({
          post_id: item.id || item.postId || item.shortcode || '',
          timestamp: new Date(timestamp).toISOString(),
          contentType,
          likeCount,
          commentCount,
          playCount,
          caption: item.caption || item.text || '',
          hashtags: hashtags.length > 0 ? hashtags : undefined
        })

        logger.debug('FetchInstagramPosts: Post processed', {
          username,
          postId: item.id || item.postId,
          contentType,
          likeCount,
          commentCount,
          playCount,
          timestamp: new Date(timestamp).toISOString()
        })
      } catch (itemError) {
        logger.warn('FetchInstagramPosts: Error processing item', {
          username,
          error: itemError instanceof Error ? itemError.message : String(itemError)
        })
        // Continue with next item
      }
    }

    logger.info('FetchInstagramPosts: Content fetch completed', {
      username,
      postCount: posts.length,
      posts: posts.slice(0, 5).map(p => ({
        contentType: p.contentType,
        likeCount: p.likeCount,
        commentCount: p.commentCount,
        timestamp: p.timestamp
      }))
    })

  } catch (error) {
    logger.error('FetchInstagramPosts: Error', {
      username,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    // Don't throw - return empty array to allow workflow to continue
  }

  return posts
}

/**
 * Fetch Facebook posts from last 30 days using Apify
 */
async function fetchFacebookPosts(
  pageId: string,
  logger: any
): Promise<FacebookPost[]> {
  const posts: FacebookPost[] = []
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000

  if (!isApifyConfigured()) {
    logger.warn('FetchFacebookPosts: Apify not configured, skipping Facebook content fetch')
    return posts
  }

  try {
    logger.info('FetchFacebookPosts: Starting content fetch', {
      pageId
    })

    // Use Apify Facebook posts scraper
    const actorInput = {
      pageIds: [pageId],
      maxPosts: 5
    }

    logger.info('FetchFacebookPosts: Calling Apify actor', {
      actorId: 'apify/facebook-posts-scraper',
      input: JSON.stringify(actorInput, null, 2)
    })

    const results = await runApifyActor<any>(
      'apify/facebook-posts-scraper',
      actorInput,
      logger
    )

    // Log raw Apify response for debugging
    logger.info('FetchFacebookPosts: Raw Apify response received', {
      pageId,
      resultCount: results?.length || 0,
      hasResults: !!results && results.length > 0,
      sampleResult: results && results.length > 0 ? {
        keys: Object.keys(results[0]),
        sample: JSON.stringify(results[0], null, 2)
      } : null,
      allResults: results ? results.map((item: any, idx: number) => ({
        index: idx + 1,
        keys: Object.keys(item),
        data: JSON.stringify(item, null, 2)
      })) : []
    })

    if (!results || results.length === 0) {
      logger.warn('FetchFacebookPosts: No results from Apify', {
        pageId,
        actorInput
      })
      return posts
    }

    logger.info('FetchFacebookPosts: Processing results', {
      pageId,
      resultCount: results.length,
      thirtyDaysAgo: new Date(thirtyDaysAgo).toISOString()
    })

    // Filter and transform results
    for (const item of results) {
      try {
        logger.debug('FetchFacebookPosts: Processing raw item', {
          pageId,
          itemKeys: Object.keys(item),
          itemData: JSON.stringify(item, null, 2)
        })

        // Extract created time
        let createdTime: number | null = null
        if (item.createdTime) {
          createdTime = new Date(item.createdTime).getTime()
        } else if (item.created_time) {
          createdTime = new Date(item.created_time).getTime()
        } else if (item.timestamp) {
          createdTime = typeof item.timestamp === 'number'
            ? item.timestamp * 1000
            : new Date(item.timestamp).getTime()
        }

        logger.debug('FetchFacebookPosts: Timestamp extraction', {
          pageId,
          itemId: item.id || item.postId || 'unknown',
          timestampRaw: item.createdTime || item.created_time || item.timestamp || 'not found',
          timestampParsed: createdTime ? new Date(createdTime).toISOString() : null,
          thirtyDaysAgo: new Date(thirtyDaysAgo).toISOString(),
          isWithinRange: createdTime ? createdTime >= thirtyDaysAgo : false
        })

        if (!createdTime || createdTime < thirtyDaysAgo) {
          logger.debug('FetchFacebookPosts: Post filtered out (date)', {
            pageId,
            itemId: item.id || item.postId || 'unknown',
            createdTime: createdTime ? new Date(createdTime).toISOString() : 'unknown',
            thirtyDaysAgo: new Date(thirtyDaysAgo).toISOString()
          })
          continue
        }

        // Determine post type
        const postType = item.type || item.postType || 'status'
        const normalizedPostType = ['photo', 'video', 'link', 'status'].includes(postType)
          ? (postType as 'photo' | 'video' | 'link' | 'status')
          : 'status'

        // Extract engagement metrics
        const reactionsCount = item.reactionsCount || item.reactions || item.likes || 0
        const commentsCount = item.commentsCount || item.comments || 0
        const sharesCount = item.sharesCount || item.shares || 0

        posts.push({
          post_id: item.id || item.postId || '',
          created_time: new Date(createdTime).toISOString(),
          post_type: normalizedPostType,
          likes_count: reactionsCount,
          comments_count: commentsCount,
          shares_count: sharesCount
        })

        logger.debug('FetchFacebookPosts: Post processed', {
          pageId,
          postId: item.id || item.postId,
          postType: normalizedPostType,
          reactionsCount,
          commentsCount,
          sharesCount,
          createdTime: new Date(createdTime).toISOString()
        })
      } catch (itemError) {
        logger.warn('FetchFacebookPosts: Error processing item', {
          pageId,
          error: itemError instanceof Error ? itemError.message : String(itemError)
        })
        // Continue with next item
      }
    }

    logger.info('FetchFacebookPosts: Content fetch completed', {
      pageId,
      postCount: posts.length,
      posts: posts.slice(0, 5).map(p => ({
        postType: p.post_type,
        likes: p.likes_count,
        comments: p.comments_count,
        shares: p.shares_count,
        createdTime: p.created_time
      }))
    })

  } catch (error) {
    logger.error('FetchFacebookPosts: Error', {
      pageId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
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
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&type=video&publishedAfter=${thirtyDaysAgo}&maxResults=10&order=date&key=${apiKey}`
    
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

    // Fetch video statistics in batch (max 10 per request)
    const batchSize = 10
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
          const videoTitle = video.snippet?.title || 'Untitled'
          videos.push({
            video_id: video.id,
            published_at: video.snippet?.publishedAt || '',
            duration: video.contentDetails?.duration,
            view_count: parseInt(video.statistics?.viewCount || '0'),
            like_count: parseInt(video.statistics?.likeCount || '0'),
            comment_count: parseInt(video.statistics?.commentCount || '0'),
            title: videoTitle
          })
          
          logger.debug('FetchYouTubeVideos: Video found', {
            channelId,
            videoId: video.id,
            title: videoTitle,
            views: parseInt(video.statistics?.viewCount || '0').toLocaleString(),
            publishedAt: video.snippet?.publishedAt
          })
        }
      }
    }

    logger.info('FetchYouTubeVideos: Fetched videos', {
      channelId,
      videoCount: videos.length,
      videoTitles: videos.slice(0, 10).map((v, idx) => ({
        index: idx + 1,
        title: v.title || 'Untitled',
        videoId: v.video_id,
        views: v.view_count.toLocaleString(),
        likes: v.like_count.toLocaleString(),
        comments: v.comment_count.toLocaleString()
      }))
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

    const youtubeApiKey = process.env.YOUTUBE_API_KEY

    const updatedCompetitors: Competitor[] = []

    // Fetch content for each competitor
    for (const competitor of competitorsToFetch) {
      try {
        // Validate required fields
        if (!competitor.platform || !competitor.external_id) {
          ctx.logger.warn('FetchCompetitorContent: Skipping competitor with missing required fields', {
            competitor: competitor
          })
          updatedCompetitors.push(competitor as Competitor)
          continue
        }

        if (competitor.platform === 'instagram') {
          const posts = await fetchInstagramPosts(
            competitor.external_id,
            ctx.logger
          )

          updatedCompetitors.push({
            ...competitor,
            content: {
              platform: 'instagram',
              external_id: competitor.external_id,
              instagram_posts: posts
            }
          } as Competitor)

          ctx.logger.info('FetchCompetitorContent: Instagram content fetched', {
            competitorId: competitor.external_id,
            competitorName: competitor.name,
            postCount: posts.length,
            followerCount: (competitor.follower_count || 0).toLocaleString()
          })

        } else if (competitor.platform === 'facebook') {
          const posts = await fetchFacebookPosts(
            competitor.external_id,
            ctx.logger
          )

          updatedCompetitors.push({
            ...competitor,
            content: {
              platform: 'facebook',
              external_id: competitor.external_id,
              facebook_posts: posts
            }
          } as Competitor)

          ctx.logger.info('FetchCompetitorContent: Facebook content fetched', {
            competitorId: competitor.external_id,
            competitorName: competitor.name,
            postCount: posts.length,
            followerCount: (competitor.follower_count || 0).toLocaleString()
          })

        } else if (competitor.platform === 'youtube') {
          if (!youtubeApiKey) {
            ctx.logger.warn('FetchCompetitorContent: YouTube API key not available', {
              competitorId: competitor.external_id
            })
            updatedCompetitors.push(competitor as Competitor)
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
          } as Competitor)

              ctx.logger.info('FetchCompetitorContent: YouTube content fetched', {
                competitorId: competitor.external_id,
                competitorName: competitor.name,
                videoCount: videos.length,
                subscriberCount: (competitor.follower_count || 0).toLocaleString(),
                videoTitles: videos.slice(0, 5).map(v => ({
                  title: v.title || 'Untitled',
                  views: v.view_count.toLocaleString(),
                  likes: v.like_count.toLocaleString()
                }))
              })
        } else {
          // Unknown platform, keep as-is
          updatedCompetitors.push(competitor as Competitor)
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
        updatedCompetitors.push(competitor as Competitor)
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
      totalInstagramPosts: updatedCompetitors.reduce((sum, c) => sum + (c.content?.instagram_posts?.length || 0), 0),
      totalFacebookPosts: updatedCompetitors.reduce((sum, c) => sum + (c.content?.facebook_posts?.length || 0), 0),
      totalVideos: updatedCompetitors.reduce((sum, c) => sum + (c.content?.youtube_videos?.length || 0), 0),
      competitors: updatedCompetitors.map(c => ({
        platform: c.platform,
        name: c.name,
        channelId: c.external_id,
        subscribers: c.follower_count.toLocaleString(),
        instagramPosts: c.content?.instagram_posts?.length || 0,
        facebookPosts: c.content?.facebook_posts?.length || 0,
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

