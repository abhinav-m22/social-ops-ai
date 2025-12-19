import type { EventConfig, Handlers } from 'motia'
import { createFileLogger } from '../../lib/competitor-benchmarking/fileLogger.js'
import type { CompetitorBenchmarkingState, Platform, Competitor, YouTubeVideo } from './types.js'
import { 
  persistCompetitorProfile, 
  persistContentItem,
  youtubeVideoToContentItem,
  getProfileId
} from './persist-competitor-data.js'
import { generatePlatformAnalysis } from '../../lib/competitor-benchmarking/groqAnalysis.js'

export const config: EventConfig = {
  type: 'event',
  name: 'YouTubePlatformWorkflow',
  subscribes: ['competitor.platform.youtube'],
  emits: ['competitor.platform.completed'],
  description: 'Complete YouTube competitor benchmarking workflow: discover, fetch, persist, analyze',
  flows: ['competitor-benchmarking'],
  input: {
    type: 'object',
    properties: {
      creatorId: { type: 'string' },
      niche: { type: 'string' },
      creatorSubscribers: { type: 'number' }
    },
    required: ['creatorId', 'niche', 'creatorSubscribers']
  }
}

/**
 * Discover YouTube competitors
 */
async function discoverCompetitors(
  niche: string,
  creatorSubscribers: number,
  apiKey: string,
  logger: any
): Promise<Competitor[]> {
  const competitors: Competitor[] = []
  const maxCompetitors = 5
  
  // Always target 100k-500k subscribers for tech/programming channels
  const searchRanges: Array<{ min: number; max: number; label: string }> = [
    { min: 100000, max: 500000, label: 'target-range' }
  ]
  
  logger.info('YouTubePlatformWorkflow: Targeting channels with 100k-500k subscribers', {
    searchRanges
  })

  try {
    // Enhanced search for tech/programming/software channels
    let searchTerms: string[] = []
    if (niche === 'tech' || niche === 'general') {
      searchTerms = [
        'programming channel',
        'software development channel',
        'coding tutorial channel',
        'tech channel',
        'software engineering channel'
      ]
    } else {
      searchTerms = [`${niche} channel`, `${niche} programming`, `${niche} coding`]
    }

    let allChannelIds: string[] = []
    
    // Strategy 1: Search for channels directly
    for (const searchTerm of searchTerms) {
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(searchTerm)}&maxResults=20&key=${apiKey}`
      
      try {
        const termResponse = await fetch(searchUrl)
        if (!termResponse.ok) {
          const errorData = await termResponse.json().catch(() => ({}))
          logger.warn('YouTubePlatformWorkflow: Search failed for term', { 
            searchTerm,
            status: termResponse.status,
            statusText: termResponse.statusText,
            error: errorData.error?.message || 'Unknown error'
          })
          continue
        }

        const termData = await termResponse.json()
        const channelIds = (termData.items || [])
          .map((item: any) => item.snippet?.channelId || item.id?.channelId)
          .filter(Boolean)
        
        allChannelIds.push(...channelIds)
        logger.info('YouTubePlatformWorkflow: Found channels for search term', {
          searchTerm,
          count: channelIds.length,
          totalSoFar: allChannelIds.length
        })
      } catch (termError) {
        logger.warn('YouTubePlatformWorkflow: Error searching for term', {
          searchTerm,
          error: termError instanceof Error ? termError.message : String(termError)
        })
        continue
      }
    }
    
    // Strategy 2: If channel search fails, search for videos and extract channels
    if (allChannelIds.length === 0) {
      logger.info('YouTubePlatformWorkflow: Channel search returned no results, trying video search strategy')
      
      for (const searchTerm of searchTerms.slice(0, 3)) {
        const videoSearchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(searchTerm)}&maxResults=20&order=viewCount&key=${apiKey}`
        
        try {
          const videoResponse = await fetch(videoSearchUrl)
          if (!videoResponse.ok) {
            continue
          }
          
          const videoData = await videoResponse.json()
          const videoChannelIds = (videoData.items || [])
            .map((item: any) => item.snippet?.channelId)
            .filter(Boolean)
          
          allChannelIds.push(...videoChannelIds)
          logger.info('YouTubePlatformWorkflow: Found channels via video search', {
            searchTerm,
            count: videoChannelIds.length
          })
        } catch (error) {
          logger.warn('YouTubePlatformWorkflow: Video search failed', {
            searchTerm,
            error: error instanceof Error ? error.message : String(error)
          })
        }
      }
    }
    
    // Strategy 3: Use known tech channels as fallback if still no results
    if (allChannelIds.length === 0) {
      logger.warn('YouTubePlatformWorkflow: All searches failed, using fallback known channels')
      // These are popular tech/programming channels (we'll filter by subscribers later)
      const fallbackChannelIds = [
        'UC8butISFwT-Wl7EV0hUK0BQ', // freeCodeCamp
        'UCsBjURrPoezykLs9EqgamAO', // Fireship
        'UCW5YeuERMmlnqo4oq8vwUpg',  // The Net Ninja
        'UC29ju8bIPH5as8OGnQzwJyA', // Traversy Media
        'UCsUalyRg43M8D60mtHeaoYg', // Coding Addict
        'UCJbPGzawDH1njbqV-D5HqKw', // Ben Awad
        'UCvjgXvBlbQiydffZU7m1_aw', // The Coding Train
        'UCu1xbgCV5o48h_BYCQD7KJg', // Web Dev Simplified
        'UCqrILQNl5Ed9Dz6CGMyvIMA', // Dev Ed
        'UCsBjURrPoezykLs9EqgamAO'  // Fireship (duplicate check will remove)
      ]
      allChannelIds.push(...fallbackChannelIds)
      logger.info('YouTubePlatformWorkflow: Using fallback channels', {
        count: fallbackChannelIds.length
      })
    }

    // Remove duplicates
    const uniqueChannelIds = Array.from(new Set(allChannelIds))
    
    if (uniqueChannelIds.length === 0) {
      logger.warn('YouTubePlatformWorkflow: No channels found from any search term')
      return competitors
    }

    logger.info('YouTubePlatformWorkflow: Total unique channels found', {
      count: uniqueChannelIds.length
    })

    const batchSize = 20
    const allChannels: any[] = []

    for (let i = 0; i < uniqueChannelIds.length; i += batchSize) {
      const batch = uniqueChannelIds.slice(i, i + batchSize)
      const statsUrl = `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${batch.join(',')}&key=${apiKey}`
      
      try {
        const statsResponse = await fetch(statsUrl)
        
        if (!statsResponse.ok) {
          const errorData = await statsResponse.json().catch(() => ({}))
          logger.warn('YouTubePlatformWorkflow: Failed to fetch channel stats', {
            status: statsResponse.status,
            error: errorData.error?.message || 'Unknown error',
            batchSize: batch.length
          })
          continue
        }

        const statsData = await statsResponse.json()
        allChannels.push(...(statsData.items || []))
        
        logger.debug('YouTubePlatformWorkflow: Fetched channel stats', {
          batchIndex: i,
          fetched: statsData.items?.length || 0,
          total: allChannels.length
        })
      } catch (error) {
        logger.warn('YouTubePlatformWorkflow: Error fetching channel stats', {
          error: error instanceof Error ? error.message : String(error)
        })
        continue
      }
    }
    
    logger.info('YouTubePlatformWorkflow: Fetched all channel statistics', {
      totalChannels: allChannels.length,
      uniqueChannelIds: uniqueChannelIds.length
    })

    // Filter channels by subscriber range (100k-500k)
    // If we don't have enough in range, expand the range slightly
    let rangeExpanded = false
    let currentMin = searchRanges[0].min
    let currentMax = searchRanges[0].max
    
    for (const channel of allChannels) {
      const subscriberCount = parseInt(channel.statistics?.subscriberCount || '0')
      const channelName = channel.snippet?.title || 'Unknown Channel'
      
      const alreadyAdded = competitors.some(c => c.external_id === channel.id)
      
      // Check if channel is in target range (100k-500k, or expanded if needed)
      let inRange = subscriberCount >= currentMin && subscriberCount <= currentMax
      
      // If we don't have enough competitors and haven't expanded yet, expand range
      if (!inRange && competitors.length < 3 && !rangeExpanded && subscriberCount >= 50000 && subscriberCount <= 1000000) {
        currentMin = 50000
        currentMax = 1000000
        rangeExpanded = true
        logger.info('YouTubePlatformWorkflow: Expanding subscriber range to find more competitors', {
          newMin: currentMin,
          newMax: currentMax
        })
        inRange = subscriberCount >= currentMin && subscriberCount <= currentMax
      }
      
      if (!alreadyAdded && inRange) {
        competitors.push({
          platform: 'youtube',
          external_id: channel.id,
          name: channelName,
          follower_count: subscriberCount
        })
        
        logger.info('YouTubePlatformWorkflow: Found competitor', {
          name: channelName,
          subscribers: subscriberCount,
          channelId: channel.id,
          rangeUsed: `${currentMin}-${currentMax}`
        })
        
        // Stop when we have enough competitors
        if (competitors.length >= maxCompetitors) {
          break
        }
      } else if (!alreadyAdded) {
        logger.debug('YouTubePlatformWorkflow: Channel filtered out', {
          name: channelName,
          subscribers: subscriberCount,
          reason: subscriberCount < currentMin ? 'too_small' : 'too_large',
          range: `${currentMin}-${currentMax}`
        })
      }
    }

    competitors.sort((a, b) => b.follower_count - a.follower_count)
    
    logger.info('YouTubePlatformWorkflow: Final competitor list', {
      count: competitors.length,
      competitors: competitors.map(c => ({ name: c.name, subscribers: c.follower_count }))
    })

  } catch (error) {
    logger.error('YouTubePlatformWorkflow: Discovery error', {
      error: error instanceof Error ? error.message : String(error)
    })
  }

  return competitors.slice(0, maxCompetitors)
}

/**
 * Fetch and persist competitor profiles
 */
async function fetchAndPersistProfiles(
  competitors: Competitor[],
  state: any,
  logger: any
): Promise<string[]> {
  const profileIds: string[] = []

  for (const competitor of competitors) {
    try {
      const profileUrl = `https://www.youtube.com/channel/${competitor.external_id}`
      const profileId = await persistCompetitorProfile(
        state,
        'youtube',
        competitor.external_id,
        competitor.name,
        profileUrl,
        competitor.follower_count
      )
      profileIds.push(profileId)
      logger.info('YouTubePlatformWorkflow: Persisted profile', {
        profileId,
        name: competitor.name,
        subscribers: competitor.follower_count
      })
    } catch (error) {
      logger.error('YouTubePlatformWorkflow: Failed to persist profile', {
        competitorId: competitor.external_id,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  return profileIds
}

/**
 * Fetch and persist content (last 30 days)
 */
async function fetchAndPersistContent(
  competitors: Competitor[],
  apiKey: string,
  state: any,
  logger: any
): Promise<{ profileId: string; videos: YouTubeVideo[] }[]> {
  const results: { profileId: string; videos: YouTubeVideo[] }[] = []

  for (const competitor of competitors) {
    try {
      const profileId = getProfileId('youtube', competitor.external_id)
      
      // Fetch latest 5 videos (not limited to 30 days, just latest 5)
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${competitor.external_id}&type=video&maxResults=5&order=date&key=${apiKey}`
      
      let videoIds: string[] = []
      
      try {
        const searchResponse = await fetch(searchUrl)
        if (!searchResponse.ok) {
          const errorData = await searchResponse.json().catch(() => ({}))
          logger.warn('YouTubePlatformWorkflow: Video search failed', {
            channelId: competitor.external_id,
            channelName: competitor.name,
            status: searchResponse.status,
            error: errorData.error?.message || 'Unknown error'
          })
          results.push({ profileId, videos: [] })
          continue
        }

        const searchData = await searchResponse.json()
        videoIds = (searchData.items || []).map((item: any) => item.id?.videoId || item.id).filter(Boolean)

        if (videoIds.length === 0) {
          logger.warn('YouTubePlatformWorkflow: No videos found for channel', {
            channelId: competitor.external_id,
            channelName: competitor.name
          })
          results.push({ profileId, videos: [] })
          continue
        }
        
        logger.info('YouTubePlatformWorkflow: Found videos for channel', {
          channelId: competitor.external_id,
          channelName: competitor.name,
          videoCount: videoIds.length
        })
      } catch (searchError) {
        logger.error('YouTubePlatformWorkflow: Error searching for videos', {
          channelId: competitor.external_id,
          channelName: competitor.name,
          error: searchError instanceof Error ? searchError.message : String(searchError)
        })
        results.push({ profileId, videos: [] })
        continue
      }

      const batchSize = 10
      const videos: YouTubeVideo[] = []

      for (let i = 0; i < videoIds.length; i += batchSize) {
        const batch = videoIds.slice(i, i + batchSize)
        const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails,snippet&id=${batch.join(',')}&key=${apiKey}`
        
        const statsResponse = await fetch(statsUrl)
        if (!statsResponse.ok) {
          continue
        }

        const statsData = await statsResponse.json()
        
        // Process all videos (we already limited to 5 in the search)
        for (const video of statsData.items || []) {
          const videoTitle = video.snippet?.title || 'Untitled'
          const videoId = video.id
          const contentUrl = `https://www.youtube.com/watch?v=${videoId}`
          const thumbnailUrl = video.snippet?.thumbnails?.high?.url || video.snippet?.thumbnails?.medium?.url || ''
          const description = video.snippet?.description || ''
          const publishedAt = video.snippet?.publishedAt || ''

          const videoData: YouTubeVideo = {
            video_id: videoId,
            content_id: videoId,
            content_url: contentUrl,
            published_at: publishedAt,
            created_at: publishedAt,
            duration: video.contentDetails?.duration,
            view_count: parseInt(video.statistics?.viewCount || '0'),
            like_count: parseInt(video.statistics?.likeCount || '0'),
            comment_count: parseInt(video.statistics?.commentCount || '0'),
            title: videoTitle
          }
          
          // Store thumbnail and description in raw_metrics for AI analysis
          const rawMetrics = {
            thumbnail_url: thumbnailUrl,
            description: description.substring(0, 500), // Limit description length
            channel_title: video.snippet?.channelTitle || '',
            tags: video.snippet?.tags || []
          }

          videos.push(videoData)

          logger.debug('YouTubePlatformWorkflow: Processing video', {
            channelId: competitor.external_id,
            videoId,
            title: videoTitle,
            viewCount: videoData.view_count,
            likeCount: videoData.like_count,
            publishedAt: videoData.published_at
          })

          // Persist content item
          const contentItem = youtubeVideoToContentItem(videoData, profileId)
          await persistContentItem(
            state,
            'youtube',
            profileId,
            contentItem.contentId,
            contentItem.contentType,
            contentItem.contentUrl,
            contentItem.createdAt,
            contentItem.metrics,
            {
              ...contentItem.rawMetrics,
              ...rawMetrics
            }
          )
          
          logger.debug('YouTubePlatformWorkflow: Persisted video with metadata', {
            videoId,
            title: videoTitle,
            thumbnailUrl,
            hasDescription: !!description
          })
        }
      }

      results.push({ profileId, videos })
      logger.info('YouTubePlatformWorkflow: Fetched and persisted content', {
        profileId,
        videoCount: videos.length
      })

    } catch (error) {
      logger.error('YouTubePlatformWorkflow: Failed to fetch content', {
        competitorId: competitor.external_id,
        error: error instanceof Error ? error.message : String(error)
      })
      results.push({ profileId: getProfileId('youtube', competitor.external_id), videos: [] })
    }
  }

  return results
}

export const handler = async (input: any, ctx: any) => {
  const { creatorId, niche, creatorSubscribers } = input || {}
  const fileLogger = createFileLogger(`youtube-platform-${creatorId}-${Date.now()}`, ctx.logger)

  fileLogger.info('YouTubePlatformWorkflow: Starting', {
    creatorId,
    niche,
    creatorSubscribers,
    traceId: ctx.traceId
  })

  if (!creatorId || !niche || creatorSubscribers === undefined) {
    fileLogger.warn('YouTubePlatformWorkflow: Missing required data')
    return
  }

  const youtubeApiKey = process.env.YOUTUBE_API_KEY
  if (!youtubeApiKey) {
    fileLogger.warn('YouTubePlatformWorkflow: YouTube API key not available')
    return
  }

  try {
    // Update platform status to running
    const state = await ctx.state.get(
      'competitorBenchmarking',
      creatorId
    ) as CompetitorBenchmarkingState | null

    if (!state) {
      fileLogger.error('YouTubePlatformWorkflow: State not found')
      return
    }

    const updatedState: CompetitorBenchmarkingState = {
      ...state,
      platform_status: {
        ...state.platform_status,
        youtube: 'running'
      },
      updated_at: new Date().toISOString()
    }
    await ctx.state.set('competitorBenchmarking', creatorId, updatedState)

    // Step 1: Discover competitors
    fileLogger.info('YouTubePlatformWorkflow: Step 1 - Discovering competitors')
    const competitors = await discoverCompetitors(niche, creatorSubscribers, youtubeApiKey, fileLogger)
    fileLogger.info('YouTubePlatformWorkflow: Discovered competitors', {
      count: competitors.length
    })

    if (competitors.length === 0) {
      fileLogger.warn('YouTubePlatformWorkflow: No competitors found - completing workflow')
      const finalState: CompetitorBenchmarkingState = {
        ...updatedState,
        platform_status: {
          ...updatedState.platform_status,
          youtube: 'completed'
        },
        updated_at: new Date().toISOString()
      }
      await ctx.state.set('competitorBenchmarking', creatorId, finalState)
      
      fileLogger.info('YouTubePlatformWorkflow: Emitting completion event (no competitors)', {
        creatorId,
        platform: 'youtube',
        success: true
      })
      
      try {
        await ctx.emit({
          topic: 'competitor.platform.completed',
          data: { creatorId, platform: 'youtube', success: true }
        })
        fileLogger.info('YouTubePlatformWorkflow: Completion event emitted successfully (no competitors)')
      } catch (emitError) {
        fileLogger.error('YouTubePlatformWorkflow: Failed to emit completion event', {
          error: emitError instanceof Error ? emitError.message : String(emitError)
        })
      }
      return
    }

    // Step 2: Fetch and persist profiles
    fileLogger.info('YouTubePlatformWorkflow: Step 2 - Persisting profiles')
    const profileIds = await fetchAndPersistProfiles(competitors, ctx.state, fileLogger)
    fileLogger.info('YouTubePlatformWorkflow: Persisted profiles', {
      count: profileIds.length
    })

    // Step 3: Fetch and persist content
    fileLogger.info('YouTubePlatformWorkflow: Step 3 - Fetching and persisting content')
    const contentResults = await fetchAndPersistContent(competitors, youtubeApiKey, ctx.state, fileLogger)
    const totalVideos = contentResults.reduce((sum, r) => sum + r.videos.length, 0)
    fileLogger.info('YouTubePlatformWorkflow: Fetched and persisted content', {
      totalVideos,
      competitorsWithContent: contentResults.filter(r => r.videos.length > 0).length
    })

    // Step 4: Run AI analysis per platform
    fileLogger.info('YouTubePlatformWorkflow: Step 4 - Running AI analysis')
    try {
      // Prepare comprehensive data for AI analysis with thumbnails and titles
      const allVideos = contentResults.flatMap(r => r.videos)
      
      // Fetch full video details including thumbnails for AI analysis
      const videosWithDetails = await Promise.all(
        allVideos.map(async (video) => {
          try {
            const videoId = video.video_id || video.content_id
            const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoId}&key=${youtubeApiKey}`
            const detailsResponse = await fetch(detailsUrl)
            
            if (detailsResponse.ok) {
              const detailsData = await detailsResponse.json()
              const videoDetails = detailsData.items?.[0]
              
              if (videoDetails) {
                return {
                  ...video,
                  title: videoDetails.snippet?.title || video.title || '',
                  thumbnail_url: videoDetails.snippet?.thumbnails?.high?.url || videoDetails.snippet?.thumbnails?.medium?.url || '',
                  description: videoDetails.snippet?.description?.substring(0, 300) || '',
                  published_at: videoDetails.snippet?.publishedAt || video.published_at || '',
                  tags: videoDetails.snippet?.tags || [],
                  view_count: parseInt(videoDetails.statistics?.viewCount || '0') || video.view_count || 0,
                  like_count: parseInt(videoDetails.statistics?.likeCount || '0') || video.like_count || 0,
                  comment_count: parseInt(videoDetails.statistics?.commentCount || '0') || video.comment_count || 0
                } as any
              }
            }
          } catch (error) {
            fileLogger.warn('YouTubePlatformWorkflow: Failed to fetch video details', {
              videoId: video.video_id,
              error: error instanceof Error ? error.message : String(error)
            })
          }
          return video as any
        })
      )
      
      const summaryData = {
        competitorCount: competitors.length,
        totalPosts: totalVideos,
        avgFollowers: competitors.length > 0 
          ? competitors.reduce((sum, c) => sum + c.follower_count, 0) / competitors.length 
          : 0,
        posts: videosWithDetails.slice(0, 25), // Include all videos with full details
        competitors: competitors.map(c => ({
          name: c.name,
          followers: c.follower_count,
          videoCount: contentResults.find(r => r.profileId === getProfileId('youtube', c.external_id))?.videos.length || 0
        }))
      }
      
      fileLogger.info('YouTubePlatformWorkflow: Prepared AI analysis data with thumbnails and titles', {
        competitorCount: competitors.length,
        totalVideos: allVideos.length,
        avgFollowers: summaryData.avgFollowers,
        videosWithThumbnails: videosWithDetails.filter(v => v.thumbnail_url).length
      })

      const aiInsights = await generatePlatformAnalysis(
        'youtube',
        summaryData,
        { logger: fileLogger }
      )

      if (aiInsights) {
        const finalState: CompetitorBenchmarkingState = {
          ...updatedState,
          platform_status: {
            ...updatedState.platform_status,
            youtube: 'completed'
          },
          platform_insights: {
            ...updatedState.platform_insights,
            youtube: aiInsights
          },
          updated_at: new Date().toISOString()
        }
        await ctx.state.set('competitorBenchmarking', creatorId, finalState)
        fileLogger.info('YouTubePlatformWorkflow: AI analysis completed and state saved')
      } else {
        throw new Error('AI analysis returned null')
      }
    } catch (aiError) {
      fileLogger.error('YouTubePlatformWorkflow: AI analysis failed', {
        error: aiError instanceof Error ? aiError.message : String(aiError)
      })
      const finalState: CompetitorBenchmarkingState = {
        ...updatedState,
        platform_status: {
          ...updatedState.platform_status,
          youtube: 'completed'
        },
        updated_at: new Date().toISOString()
      }
      await ctx.state.set('competitorBenchmarking', creatorId, finalState)
      fileLogger.info('YouTubePlatformWorkflow: State saved after AI error')
    }

    // ALWAYS emit completion event - this is critical for workflow progression
    fileLogger.info('YouTubePlatformWorkflow: Emitting completion event', {
      creatorId,
      platform: 'youtube',
      success: true
    })
    
    try {
      const emitResult = await ctx.emit({
        topic: 'competitor.platform.completed',
        data: { creatorId, platform: 'youtube', success: true }
      })
      fileLogger.info('YouTubePlatformWorkflow: Completion event emitted successfully', {
        emitResult: emitResult ? 'success' : 'no result',
        topic: 'competitor.platform.completed'
      })
    } catch (emitError) {
      fileLogger.error('YouTubePlatformWorkflow: Failed to emit completion event', {
        error: emitError instanceof Error ? emitError.message : String(emitError),
        stack: emitError instanceof Error ? emitError.stack : undefined,
        topic: 'competitor.platform.completed'
      })
      // Still try to continue - the state is already updated
    }

    fileLogger.info('YouTubePlatformWorkflow: Completed successfully', {
      competitors: competitors.length,
      totalVideos
    })

  } catch (error) {
    fileLogger.error('YouTubePlatformWorkflow: Failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })

    const state = await ctx.state.get(
      'competitorBenchmarking',
      creatorId
    ) as CompetitorBenchmarkingState | null
    if (state) {
      const failedState: CompetitorBenchmarkingState = {
        ...state,
        platform_status: {
          ...state.platform_status,
          youtube: 'failed'
        },
        updated_at: new Date().toISOString()
      }
      await ctx.state.set('competitorBenchmarking', creatorId, failedState)
    }

    await ctx.emit({
      topic: 'competitor.platform.completed',
      data: { creatorId, platform: 'youtube', success: false }
    })
  }
}

