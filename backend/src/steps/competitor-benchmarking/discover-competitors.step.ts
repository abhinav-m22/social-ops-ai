import type { EventConfig, Handlers } from 'motia'
import type { CompetitorBenchmarkingState, Competitor, Platform } from './types.js'
import type { CreatorProfile } from '../creator-profile/types.js'

export const config: EventConfig = {
  type: 'event',
  name: 'DiscoverCompetitors',
  subscribes: ['competitor.discover'],
  emits: ['competitor.content.fetch'],
  description: 'Discovers competitors for a creator based on niche/category',
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
 * Discover Facebook competitors */
async function discoverFacebookCompetitors(
  creatorProfile: CreatorProfile | null,
  creatorFollowers: number,
  token: string,
  logger: any
): Promise<Competitor[]> {
  const competitors: Competitor[] = []
  const maxCompetitors = 10
  const minFollowers = Math.floor(creatorFollowers * 0.5)
  const maxFollowers = Math.floor(creatorFollowers * 2)

  try {
    const niche = creatorProfile?.socials?.find(s => s.platform === 'facebook')?.handle || 'creator'
        
    logger.info('DiscoverFacebookCompetitors: Facebook page search is limited', {
      niche,
      minFollowers,
      maxFollowers,
      note: 'Facebook Graph API does not provide public page search by category. Consider using third-party services or manual input.'
    })

  } catch (error) {
    logger.error('DiscoverFacebookCompetitors: Error', {
      error: error instanceof Error ? error.message : String(error)
    })
  }

  return competitors.slice(0, maxCompetitors)
}

/**
 * Convert YouTube handle (@username) to channel ID
 */
async function convertHandleToChannelId(
  handle: string,
  apiKey: string,
  logger: any
): Promise<string | null> {
  try {
    const cleanHandle = handle.startsWith('@') ? handle.slice(1) : handle
    
    const url = `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${cleanHandle}&key=${apiKey}`
    const response = await fetch(url)
    
    if (!response.ok) {
      const errorData = await response.json()
      logger.warn('ConvertHandleToChannelId: API error', {
        handle: cleanHandle,
        error: errorData.error?.message || response.statusText
      })
      return null
    }

    const data = await response.json()
    if (!data.items || data.items.length === 0) {
      logger.warn('ConvertHandleToChannelId: Channel not found for handle', {
        handle: cleanHandle
      })
      return null
    }

    const channelId = data.items[0].id
    logger.info('ConvertHandleToChannelId: Converted handle to channel ID', {
      handle: cleanHandle,
      channelId
    })

    return channelId
  } catch (error) {
    logger.error('ConvertHandleToChannelId: Error', {
      handle,
      error: error instanceof Error ? error.message : String(error)
    })
    return null
  }
}

/**
 * Fetch creator's YouTube subscriber count from API
 */
async function fetchCreatorYouTubeSubscribers(
  channelId: string,
  apiKey: string,
  logger: any
): Promise<number> {
  try {
    const url = `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelId}&key=${apiKey}`
    const response = await fetch(url)
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`YouTube API error: ${errorData.error?.message || response.statusText}`)
    }

    const data = await response.json()
    if (!data.items || data.items.length === 0) {
      throw new Error('Channel not found')
    }

    const subscriberCount = parseInt(data.items[0].statistics?.subscriberCount || '0')
    logger.info('FetchCreatorYouTubeSubscribers: Fetched subscriber count', {
      channelId,
      subscriberCount
    })

    return subscriberCount
  } catch (error) {
    logger.error('FetchCreatorYouTubeSubscribers: Error', {
      channelId,
      error: error instanceof Error ? error.message : String(error)
    })
    throw error
  }
}

/**
 * Discover YouTube competitors using YouTube Data API v3
 */
async function discoverYouTubeCompetitors(
  niche: string,
  creatorSubscribers: number,
  apiKey: string,
  logger: any
): Promise<Competitor[]> {
  const competitors: Competitor[] = []
  const maxCompetitors = 10
  let searchRanges: Array<{ min: number; max: number; label: string }> = []
  
  if (creatorSubscribers === 1) {
    searchRanges = [
      { min: 1000, max: 2000, label: 'similar-size' },
      { min: 50000, max: 100000, label: 'aspirational' }
    ]
    logger.info('DiscoverYouTubeCompetitors: Using hardcoded ranges for 1 subscriber', {
      creatorSubscribers,
      ranges: searchRanges
    })
  } else {
    // Normal calculation for other subscriber counts
    const minSubscribers = Math.floor(creatorSubscribers * 0.5)
    const maxSubscribers = Math.floor(creatorSubscribers * 2)
    searchRanges = [{ min: minSubscribers, max: maxSubscribers, label: 'standard' }]
  }

  try {
    let searchQuery = `${niche} channel`
    
    if (niche === 'general') {
      searchQuery = 'tech channel'
      logger.info('DiscoverYouTubeCompetitors: Niche is "general", using "tech" for search', {
        originalNiche: niche
      })
    }
    
    logger.info('DiscoverYouTubeCompetitors: Searching channels', {
      query: searchQuery,
      niche,
      creatorSubscribers,
      searchRanges: searchRanges.map(r => `${r.label}: ${r.min}-${r.max}`)
    })

    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(searchQuery)}&maxResults=50&key=${apiKey}`
    
    const searchResponse = await fetch(searchUrl)
    if (!searchResponse.ok) {
      const errorData = await searchResponse.json()
      throw new Error(`YouTube search API error: ${errorData.error?.message || searchResponse.statusText}`)
    }

    const searchData = await searchResponse.json()
    let channelIds = (searchData.items || [])
      .map((item: any) => item.snippet?.channelId)
      .filter(Boolean)

    if (channelIds.length === 0) {
      logger.warn('DiscoverYouTubeCompetitors: No channels found', { query: searchQuery })
      return competitors
    }

    const batchSize = 50
    const allChannels: any[] = []

    for (let i = 0; i < channelIds.length; i += batchSize) {
      const batch = channelIds.slice(i, i + batchSize)
      
      // Fetch channel statistics in batch
      const statsUrl = `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${batch.join(',')}&key=${apiKey}`
      const statsResponse = await fetch(statsUrl)
      
      if (!statsResponse.ok) {
        const errorData = await statsResponse.json()
        logger.warn('DiscoverYouTubeCompetitors: Batch fetch failed', {
          batchIndex: i,
          error: errorData.error?.message || statsResponse.statusText
        })
        continue
      }

      const statsData = await statsResponse.json()
      allChannels.push(...(statsData.items || []))
    }
    
    // Log all channels found before filtering
    logger.info('DiscoverYouTubeCompetitors: Channels found before filtering', {
      totalChannels: allChannels.length,
      searchRanges: searchRanges.length
    })
    
    // Filter by subscriber count for each range
    for (const range of searchRanges) {
      for (const channel of allChannels) {
        const subscriberCount = parseInt(channel.statistics?.subscriberCount || '0')
        const channelName = channel.snippet?.title || 'Unknown Channel'
        
        // Check if already added (avoid duplicates)
        const alreadyAdded = competitors.some(c => c.external_id === channel.id)
        
        if (!alreadyAdded && subscriberCount >= range.min && subscriberCount <= range.max) {
          competitors.push({
            platform: 'youtube',
            external_id: channel.id,
            name: channelName,
            follower_count: subscriberCount
          })
          
          logger.info('DiscoverYouTubeCompetitors: Added competitor', {
            channelId: channel.id,
            channelName: channelName,
            subscriberCount: subscriberCount.toLocaleString(),
            range: range.label,
            rangeDetails: `${range.min.toLocaleString()}-${range.max.toLocaleString()}`
          })
        }
      }
    }

    // Sort by follower count (descending) and limit
    competitors.sort((a, b) => b.follower_count - a.follower_count)
    
    // Log summary with channel names
    logger.info('DiscoverYouTubeCompetitors: Found competitors summary', {
      totalChannelsChecked: allChannels.length,
      totalFound: competitors.length,
      filteredCount: competitors.length,
      ranges: searchRanges.map(r => `${r.label}: ${r.min}-${r.max}`).join(', '),
      competitors: competitors.map(c => ({
        name: c.name,
        channelId: c.external_id,
        subscribers: c.follower_count.toLocaleString()
      }))
    })

  } catch (error) {
    logger.error('DiscoverYouTubeCompetitors: Error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
  }

  return competitors.slice(0, maxCompetitors)
}

export const handler: Handlers['DiscoverCompetitors'] = async (input, ctx) => {
  const { creatorId } = input || {}

  ctx.logger.info('DiscoverCompetitors: Starting competitor discovery', {
    creatorId,
    traceId: ctx.traceId
  })

  if (!creatorId) {
    ctx.logger.warn('DiscoverCompetitors: Missing creatorId')
    return
  }

  try {
    // Get current state
    const state = await ctx.state.get<CompetitorBenchmarkingState>(
      'competitorBenchmarking',
      creatorId
    )

    if (!state) {
      ctx.logger.error('DiscoverCompetitors: State not found', { creatorId })
      const failedState: CompetitorBenchmarkingState = {
        creatorMetadata: { creatorId },
        competitors: [],
        status: 'failed',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      await ctx.state.set('competitorBenchmarking', creatorId, failedState)
      return
    }

    const creatorProfile = await ctx.state.get<CreatorProfile>('creatorProfiles', creatorId)

    let niche = state.creatorMetadata.niche

    if (!niche && creatorProfile) {

      niche = (creatorProfile as any).niche || (creatorProfile as any).category
    }
    
    // Fallback to "tech" if still not found (better than "general" for search)
    if (!niche) {
      niche = 'tech'
      ctx.logger.info('DiscoverCompetitors: Niche not found, using fallback "tech"', {
        creatorId,
        note: 'Consider adding niche field to CreatorProfile or passing it in API request'
      })
    }
    
    const facebookProfile = creatorProfile?.socials?.find((s: any) => s.platform === 'facebook')
    const youtubeProfile = creatorProfile?.socials?.find((s: any) => s.platform === 'youtube')
    
    ctx.logger.info('DiscoverCompetitors: Profile debug info', {
      hasProfile: !!creatorProfile,
      hasSocials: !!creatorProfile?.socials,
      socialsCount: creatorProfile?.socials?.length || 0,
      youtubeProfile: youtubeProfile ? {
        platform: youtubeProfile.platform,
        handle: youtubeProfile.handle,
        url: youtubeProfile.url,
        followers: youtubeProfile.followers
      } : null
    })

    let youtubeChannelId: string | null = null
    if (youtubeProfile) {
      if (youtubeProfile.handle) {
        if (youtubeProfile.handle.startsWith('UC')) {
          youtubeChannelId = youtubeProfile.handle
          ctx.logger.info('DiscoverCompetitors: Found channel ID in handle', {
            channelId: youtubeChannelId
          })
        } else if (youtubeProfile.url) {
          const channelMatch = youtubeProfile.url.match(/channel\/([a-zA-Z0-9_-]+)/)
          if (channelMatch) {
            youtubeChannelId = channelMatch[1]
            ctx.logger.info('DiscoverCompetitors: Found channel ID in URL', {
              channelId: youtubeChannelId,
              url: youtubeProfile.url
            })
          } else {
            const handleMatch = youtubeProfile.url.match(/@([a-zA-Z0-9_-]+)/)
            if (handleMatch) {
              ctx.logger.warn('DiscoverCompetitors: YouTube handle found but channel ID needed', {
                handle: handleMatch[1],
                url: youtubeProfile.url,
                note: 'Need to convert @handle to channel ID or store channel ID in profile'
              })
            }
          }
        } else {
          if (youtubeProfile.handle.startsWith('@')) {
            ctx.logger.info('DiscoverCompetitors: Detected YouTube handle, converting to channel ID', {
              handle: youtubeProfile.handle
            })
          } else {
            if (youtubeProfile.handle.length >= 20) {
              youtubeChannelId = youtubeProfile.handle
              ctx.logger.info('DiscoverCompetitors: Using handle as channel ID (assuming it is one)', {
                channelId: youtubeChannelId
              })
            }
          }
        }
      } else {
        ctx.logger.warn('DiscoverCompetitors: YouTube profile found but no handle', {
          hasUrl: !!youtubeProfile.url
        })
      }
    } else {
      ctx.logger.warn('DiscoverCompetitors: No YouTube profile found in creator socials', {
        socialsCount: creatorProfile?.socials?.length || 0
      })
    }

    let facebookFollowers = facebookProfile?.followers || 0
    const facebookPageId = facebookProfile?.handle || process.env.FB_PAGE_ID

    let youtubeSubscribers = 0
    const youtubeApiKey = process.env.YOUTUBE_API_KEY
    
    ctx.logger.info('DiscoverCompetitors: API key check', {
      hasApiKey: !!youtubeApiKey,
      apiKeyLength: youtubeApiKey?.length || 0,
      hasChannelId: !!youtubeChannelId,
      channelId: youtubeChannelId,
      youtubeHandle: youtubeProfile?.handle
    })
    
    if (!youtubeChannelId && youtubeProfile?.handle && youtubeApiKey) {
      if (youtubeProfile.handle.startsWith('@') || !youtubeProfile.handle.startsWith('UC')) {
        ctx.logger.info('DiscoverCompetitors: Converting YouTube handle to channel ID', {
          handle: youtubeProfile.handle
        })
        youtubeChannelId = await convertHandleToChannelId(
          youtubeProfile.handle,
          youtubeApiKey,
          ctx.logger
        )
        if (youtubeChannelId) {
          ctx.logger.info('DiscoverCompetitors: Successfully converted handle to channel ID', {
            handle: youtubeProfile.handle,
            channelId: youtubeChannelId
          })
        } else {
          ctx.logger.warn('DiscoverCompetitors: Failed to convert handle to channel ID', {
            handle: youtubeProfile.handle
          })
        }
      }
    }
    
    if (youtubeChannelId && youtubeApiKey) {
      try {
        youtubeSubscribers = await fetchCreatorYouTubeSubscribers(
          youtubeChannelId,
          youtubeApiKey,
          ctx.logger
        )
        ctx.logger.info('DiscoverCompetitors: Fetched YouTube subscribers from API', {
          channelId: youtubeChannelId,
          subscribers: youtubeSubscribers
        })
      } catch (error) {
        ctx.logger.warn('DiscoverCompetitors: Failed to fetch YouTube subscribers', {
          channelId: youtubeChannelId,
          error: error instanceof Error ? error.message : String(error)
        })
      }
    } else {
      ctx.logger.warn('DiscoverCompetitors: YouTube channel ID or API key not available', {
        hasChannelId: !!youtubeChannelId,
        hasApiKey: !!youtubeApiKey,
        youtubeHandle: youtubeProfile?.handle
      })
    }

    ctx.logger.info('DiscoverCompetitors: Creator profile loaded', {
      creatorId,
      hasProfile: !!creatorProfile,
      niche,
      facebookFollowers,
      youtubeSubscribers,
      youtubeChannelId
    })

    // Update creator metadata with profile info
    const updatedMetadata = {
      ...state.creatorMetadata,
      niche: niche,
      category: state.creatorMetadata.category || 'general',
      platformsConnected: [
        ...(facebookFollowers > 0 ? ['facebook' as Platform] : []),
        ...(youtubeSubscribers > 0 ? ['youtube' as Platform] : [])
      ] as Platform[]
    }

    const allCompetitors: Competitor[] = []

    // Discover Facebook competitors
    if (facebookFollowers > 0 && updatedMetadata.platformsConnected.includes('facebook')) {
      const fbToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN || process.env.FB_PAGE_TOKEN
      if (fbToken) {
        const fbCompetitors = await discoverFacebookCompetitors(
          creatorProfile,
          facebookFollowers,
          fbToken,
          ctx.logger
        )
        allCompetitors.push(...fbCompetitors)
        ctx.logger.info('DiscoverCompetitors: Facebook competitors found', {
          count: fbCompetitors.length
        })
      } else {
        ctx.logger.warn('DiscoverCompetitors: Facebook token not available, skipping Facebook discovery')
      }
    }

    // Discover YouTube competitors using niche
    if (youtubeSubscribers > 0 && updatedMetadata.platformsConnected.includes('youtube')) {
      if (youtubeApiKey) {
        const ytCompetitors = await discoverYouTubeCompetitors(
          niche,
          youtubeSubscribers,
          youtubeApiKey,
          ctx.logger
        )
        allCompetitors.push(...ytCompetitors)
        ctx.logger.info('DiscoverCompetitors: YouTube competitors found', {
          count: ytCompetitors.length,
          niche
        })
      } else {
        ctx.logger.warn('DiscoverCompetitors: YouTube API key not available, skipping YouTube discovery')
      }
    }

    // Remove duplicates (by platform + external_id)
    const uniqueCompetitors = Array.from(
      new Map(allCompetitors.map(c => [`${c.platform}:${c.external_id}`, c])).values()
    )

    // Update state with discovered competitors
    const updatedState: CompetitorBenchmarkingState = {
      ...state,
      creatorMetadata: updatedMetadata,
      competitors: uniqueCompetitors,
      updated_at: new Date().toISOString()
    }

    await ctx.state.set('competitorBenchmarking', creatorId, updatedState)

    // Emit event to fetch competitor content
    await ctx.emit({
      topic: 'competitor.content.fetch',
      data: {
        creatorId,
        competitors: uniqueCompetitors
      }
    })

    ctx.logger.info('DiscoverCompetitors: Competitor discovery completed', {
      creatorId,
      competitorCount: uniqueCompetitors.length,
      facebookCount: uniqueCompetitors.filter(c => c.platform === 'facebook').length,
      youtubeCount: uniqueCompetitors.filter(c => c.platform === 'youtube').length,
      competitors: uniqueCompetitors.map(c => ({
        platform: c.platform,
        name: c.name,
        channelId: c.external_id,
        subscribers: c.follower_count.toLocaleString()
      }))
    })
  } catch (error) {
    ctx.logger.error('DiscoverCompetitors: Failed', {
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

