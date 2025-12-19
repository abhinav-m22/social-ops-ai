import type { EventConfig, Handlers } from 'motia'
import { convertHandleToChannelId, fetchCreatorYouTubeSubscribers } from './discover-competitors.step.js'
import { createFileLogger } from '../../lib/competitor-benchmarking/fileLogger'
import type { Competitor, Platform } from './types.js'

export const config: EventConfig = {
  type: 'event',
  name: 'DiscoverYouTubeCompetitors',
  subscribes: ['competitor.discover.youtube'],
  emits: ['competitor.youtube.found'],
  description: 'Discovers YouTube competitors based on niche',
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

  if (creatorSubscribers < 100) {
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

export const handler: Handlers['DiscoverYouTubeCompetitors'] = async (input, ctx) => {
  const { creatorId, niche, creatorSubscribers } = input || {}

  // Create file logger for detailed logging
  const fileLogger = createFileLogger(`youtube-${creatorId}-${Date.now()}`, ctx.logger)

  fileLogger.info('DiscoverYouTubeCompetitors: Received input', {
    input: JSON.stringify(input, null, 2),
    creatorId,
    niche,
    creatorSubscribers,
    traceId: ctx.traceId
  })

  if (!creatorId || !niche || creatorSubscribers === undefined) {
    fileLogger.warn('DiscoverYouTubeCompetitors: Missing required data', {
      creatorId: !!creatorId,
      niche: !!niche,
      creatorSubscribers: creatorSubscribers !== undefined,
      inputKeys: input ? Object.keys(input) : []
    })
    return
  }

  try {
    const youtubeApiKey = process.env.YOUTUBE_API_KEY
    if (!youtubeApiKey) {
      fileLogger.warn('DiscoverYouTubeCompetitors: YouTube API key not available')
      return
    }

    const competitors = await discoverYouTubeCompetitors(
      niche,
      creatorSubscribers,
      youtubeApiKey,
      fileLogger
    )

    // Emit event with found competitors
    await ctx.emit({
      topic: 'competitor.youtube.found',
      data: {
        creatorId,
        platform: 'youtube',
        competitors
      }
    })

    fileLogger.info('DiscoverYouTubeCompetitors: Parallel discovery completed', {
      creatorId,
      competitorCount: competitors.length,
      niche,
      finalCompetitors: competitors.map(c => ({
        channelId: c.external_id,
        name: c.name,
        subscribers: c.follower_count
      }))
    })

  } catch (error) {
    fileLogger.error('DiscoverYouTubeCompetitors: Failed', {
      creatorId,
      niche,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
  }
}
