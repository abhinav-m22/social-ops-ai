import type { EventConfig, Handlers } from 'motia'
import type { CompetitorBenchmarkingState, Competitor, Platform } from './types.js'
import type { CreatorProfile } from '../creator-profile/types.js'
import { runApifyActor, isApifyConfigured } from '../../lib/competitor-benchmarking/apifyClient.js'

export const config: EventConfig = {
  type: 'event',
  name: 'DiscoverCompetitors',
  subscribes: [], // DISABLED: Legacy step - workflow now triggered only via API
  emits: ['competitor.discover.instagram', 'competitor.discover.facebook', 'competitor.discover.youtube'],
  description: 'DISABLED: Legacy step - workflow now triggered only via API call to /competitor/analyze',
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
 * Discover Instagram competitors using Apify
 * Finds creators with 100k-500k followers in the given niche
 */
async function discoverInstagramCompetitors(
  niche: string,
  logger: any
): Promise<Competitor[]> {
  const competitors: Competitor[] = []
  const maxCompetitors = 5
  const minFollowers = 100000
  const maxFollowers = 500000

  if (!isApifyConfigured()) {
    logger.warn('DiscoverInstagramCompetitors: Apify not configured, skipping Instagram discovery')
    return competitors
  }

  try {
    logger.info('DiscoverInstagramCompetitors: Starting discovery', {
      niche,
      minFollowers,
      maxFollowers,
      targetRange: '100k-500k followers'
    })

    // Use Apify Instagram scraper directly with search queries
    // This actor can search for profiles, posts, hashtags, etc.
    const searchInput = {
      searchQueries: [`${niche} creator`, `${niche} influencer`, `${niche} expert`],
      resultsType: 'profiles',
      maxItems: 50,
      searchLimit: 20
    }

    logger.info('DiscoverInstagramCompetitors: Calling Apify Instagram scraper', {
      actorId: 'apify/instagram-scraper',
      input: JSON.stringify(searchInput, null, 2)
    })

    const results = await runApifyActor<any>(
      'apify/instagram-scraper',
      searchInput,
      logger
    )

    // Log raw Apify response for debugging
    logger.info('DiscoverInstagramCompetitors: Raw Apify response received', {
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
      logger.warn('DiscoverInstagramCompetitors: No results from Apify', {
        niche,
        searchInput
      })
      return competitors
    }

    // Log all raw profiles for debugging
    logger.info('DiscoverInstagramCompetitors: Processing raw profiles', {
      totalProfiles: results.length,
      profiles: results.map((profile: any, idx: number) => ({
        index: idx + 1,
        username: profile.username || profile.handle || profile.id || 'unknown',
        fullName: profile.fullName || profile.name || 'unknown',
        followerCount: profile.followersCount || profile.followers || profile.followerCount || 0,
        isPrivate: profile.isPrivate || profile.private || false,
        isVerified: profile.isVerified || profile.verified || false,
        allKeys: Object.keys(profile)
      }))
    })

    const filtered = results
      .filter((profile: any) => {
        const followerCount = profile.followersCount ||
                            profile.followers ||
                            profile.followerCount ||
                            profile.follower_count ||
                            0

        const inRange = followerCount >= minFollowers && followerCount <= maxFollowers

        const isPublic = !profile.isPrivate && !profile.private

        const hasUsername = !!(profile.username || profile.handle || profile.id)

        const isValid = inRange && isPublic && hasUsername

        logger.debug('DiscoverInstagramCompetitors: Profile filter check', {
          username: profile.username || profile.handle || profile.id || 'unknown',
          followerCount: followerCount.toLocaleString(),
          inRange: `${inRange} (${minFollowers.toLocaleString()}-${maxFollowers.toLocaleString()})`,
          isPublic,
          hasUsername,
          isValid,
          willInclude: isValid
        })

        return isValid
      })
      .map((profile: any) => {
        const followerCount = profile.followersCount ||
                            profile.followers ||
                            profile.followerCount ||
                            profile.follower_count ||
                            0

        const competitor = {
          platform: 'instagram' as Platform,
          external_id: profile.username || profile.handle || profile.id || '',
          name: profile.fullName || profile.name || profile.username || 'Unknown',
          follower_count: followerCount,
          isVerified: profile.isVerified || profile.verified || false
        }

        logger.debug('DiscoverInstagramCompetitors: Mapped competitor', {
          competitor: JSON.stringify(competitor, null, 2)
        })

        return competitor
      })
      .sort((a: Competitor, b: Competitor) => {
        const aInPreferredRange = a.follower_count >= 100000 && a.follower_count <= 200000
        const bInPreferredRange = b.follower_count >= 100000 && b.follower_count <= 200000

        if (aInPreferredRange && !bInPreferredRange) return -1
        if (!aInPreferredRange && bInPreferredRange) return 1
        return b.follower_count - a.follower_count
      })
      .slice(0, maxCompetitors)

    competitors.push(...filtered)

    logger.info('DiscoverInstagramCompetitors: Discovery completed', {
      niche,
      totalResults: results.length,
      filteredCount: filtered.length,
      finalCompetitorCount: competitors.length,
      competitors: competitors.map(c => ({
        username: c.external_id,
        name: c.name,
        followers: c.follower_count.toLocaleString(),
        verified: (c as any).isVerified
      }))
    })

  } catch (error) {
    logger.error('DiscoverInstagramCompetitors: Error', {
      niche,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
  }

  return competitors.slice(0, maxCompetitors)
}

/**
 * Discover Facebook competitors using Apify
 * Finds pages with 100k-500k followers in the given niche
 */
async function discoverFacebookCompetitors(
  niche: string,
  logger: any
): Promise<Competitor[]> {
  const competitors: Competitor[] = []
  const maxCompetitors = 5
  const minFollowers = 100000
  const maxFollowers = 500000

  if (!isApifyConfigured()) {
    logger.warn('DiscoverFacebookCompetitors: Apify not configured, skipping Facebook discovery')
    return competitors
  }

  try {
    logger.info('DiscoverFacebookCompetitors: Starting discovery', {
      niche,
      minFollowers,
      maxFollowers,
      targetRange: '100k-500k followers'
    })

    const popularPages = [
      'https://www.facebook.com/techcrunch',
      'https://www.facebook.com/wired',
      'https://www.facebook.com/theverge',
      'https://www.facebook.com/arsTechnica',
      'https://www.facebook.com/engadget',
      'https://www.facebook.com/gizmodo',
      'https://www.facebook.com/mashable',
      'https://www.facebook.com/cnet',
      'https://www.facebook.com/bloombergtechnology',
      'https://www.facebook.com/recode'
    ]

    const actorInput = {
      startUrls: popularPages.map(url => ({ url })),
      resultsLimit: 20
    }

    logger.info('DiscoverFacebookCompetitors: Calling Apify Facebook scraper', {
      actorId: 'apify/facebook-pages-scraper',
      input: JSON.stringify(actorInput, null, 2)
    })

    const results = await runApifyActor<any>(
      'apify/facebook-pages-scraper',
      actorInput,
      logger
    )

    logger.info('DiscoverFacebookCompetitors: Raw Apify response received', {
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
      logger.warn('DiscoverFacebookCompetitors: No results from Apify', {
        niche,
        actorInput
      })
      return competitors
    }

    // Check if response contains error objects
    const errorResults = results.filter((item: any) => item.error || item.errorDescription)
    if (errorResults.length > 0) {
      logger.warn('DiscoverFacebookCompetitors: Apify returned error responses', {
        niche,
        errorCount: errorResults.length,
        errors: errorResults.map((e: any) => ({
          error: e.error,
          errorDescription: e.errorDescription
        }))
      })
      // Filter out error objects
      const validResults = results.filter((item: any) => !item.error && !item.errorDescription)
      if (validResults.length === 0) {
        logger.warn('DiscoverFacebookCompetitors: No valid results after filtering errors', {
          niche
        })
        return competitors
      }
      // Use only valid results
      const tempResults = results
      results.length = 0
      results.push(...validResults)
      logger.info('DiscoverFacebookCompetitors: Filtered out error responses', {
        originalCount: tempResults.length,
        validCount: results.length
      })
    }

    // Log all raw pages for debugging
    logger.info('DiscoverFacebookCompetitors: Processing raw pages', {
      totalPages: results.length,
      pages: results.map((page: any, idx: number) => ({
        index: idx + 1,
        pageId: page.pageId || page.id || page.page_id || 'unknown',
        pageName: page.pageName || page.name || page.title || 'unknown',
        followersCount: page.followersCount || page.followers || page.follower_count || page.likes || page.likesCount || 0,
        category: page.category || 'unknown',
        allKeys: Object.keys(page)
      }))
    })

    // Filter results to 100k-500k followers
    const filtered = results
      .filter((page: any) => {
        const followerCount = page.followersCount ||
                            page.followers ||
                            page.follower_count ||
                            page.likes ||
                            page.likesCount ||
                            0

        const inRange = followerCount >= minFollowers && followerCount <= maxFollowers

        const hasPageId = !!(page.pageId || page.id || page.page_id)

        const isValid = inRange && hasPageId

        logger.debug('DiscoverFacebookCompetitors: Page filter check', {
          pageId: page.pageId || page.id || 'unknown',
          pageName: page.pageName || page.name || page.title || 'unknown',
          followerCount: followerCount.toLocaleString(),
          inRange: `${inRange} (${minFollowers.toLocaleString()}-${maxFollowers.toLocaleString()})`,
          hasPageId,
          isValid,
          willInclude: isValid
        })

        return isValid
      })
      .map((page: any) => {
        const followerCount = page.followersCount ||
                            page.followers ||
                            page.follower_count ||
                            page.likes ||
                            page.likesCount ||
                            0

        const competitor = {
          platform: 'facebook' as Platform,
          external_id: page.pageId || page.id || page.page_id || '',
          name: page.pageName || page.name || page.title || 'Unknown',
          follower_count: followerCount,
          category: page.category || ''
        }

        logger.debug('DiscoverFacebookCompetitors: Mapped competitor', {
          competitor: JSON.stringify(competitor, null, 2)
        })

        return competitor
      })
      .sort((a: Competitor, b: Competitor) => b.follower_count - a.follower_count)
      .slice(0, maxCompetitors)

    competitors.push(...filtered)

    logger.info('DiscoverFacebookCompetitors: Discovery completed', {
      niche,
      totalResults: results.length,
      filteredCount: filtered.length,
      finalCompetitorCount: competitors.length,
      competitors: competitors.map(c => ({
        pageId: c.external_id,
        name: c.name,
        followers: c.follower_count.toLocaleString(),
        category: (c as any).category
      }))
    })

  } catch (error) {
    logger.error('DiscoverFacebookCompetitors: Error', {
      niche,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
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
  const maxCompetitors = 5
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
    let search = `${niche} channel`
    
    if (niche === 'general') {
      search = 'tech channel'
      logger.info('DiscoverYouTubeCompetitors: Niche is "general", using "tech" for search', {
        originalNiche: niche
      })
    }
    
    logger.info('DiscoverYouTubeCompetitors: Searching channels', {
      query: search,
      niche,
      creatorSubscribers,
      searchRanges: searchRanges.map(r => `${r.label}: ${r.min}-${r.max}`)
    })

    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(search)}&maxResults=20&key=${apiKey}`
    
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
      logger.warn('DiscoverYouTubeCompetitors: No channels found', { query: search })
      return competitors
    }

    const batchSize = 20
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

  ctx.logger.info('DiscoverCompetitors: Legacy step - dispatching parallel platform discovery', {
    creatorId,
    traceId: ctx.traceId
  })

  if (!creatorId) {
    ctx.logger.warn('DiscoverCompetitors: Missing creatorId')
    return
  }

  try {
    // Get creator profile to get niche and subscriber info
    const creatorProfile = await ctx.state.get('creatorProfiles', creatorId) as any
    const profileNiche = creatorProfile ? (creatorProfile.niche || creatorProfile.category) : 'tech'
    const creatorSubscribers = creatorProfile?.socials?.find((s: any) => s.platform === 'youtube')?.followers || 1

    // Emit parallel discovery events for all platforms
    await Promise.all([
      ctx.emit({
        topic: 'competitor.discover.instagram',
        data: {
          creatorId,
          niche: profileNiche
        }
      }),
      ctx.emit({
        topic: 'competitor.discover.facebook',
        data: {
          creatorId,
          niche: profileNiche
        }
      }),
      ctx.emit({
        topic: 'competitor.discover.youtube',
        data: {
          creatorId,
          niche: profileNiche,
          creatorSubscribers
        }
      })
    ])

    ctx.logger.info('DiscoverCompetitors: Dispatched parallel platform discovery', {
      creatorId,
      niche: profileNiche,
      creatorSubscribers
    })

  } catch (error) {
    ctx.logger.error('DiscoverCompetitors: Failed to dispatch parallel discovery', {
      creatorId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
  }
}
