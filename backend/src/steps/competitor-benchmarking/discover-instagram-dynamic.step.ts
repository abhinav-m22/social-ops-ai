import type { EventConfig, Handlers } from 'motia'
import { runApifyActor, isApifyConfigured } from '../../lib/competitor-benchmarking/apifyClient.js'
import { createFileLogger } from '../../lib/competitor-benchmarking/fileLogger.js'
import type { Competitor, Platform } from './types.js'

export const config: EventConfig = {
  type: 'event',
  name: 'DiscoverInstagramCompetitorsDynamic',
  subscribes: ['competitor.discover.instagram'],
  emits: ['competitor.instagram.found'],
  description: 'Dynamically discovers Instagram competitors by niche',
  flows: ['competitor-benchmarking'],
  input: {
    type: 'object',
    properties: {
      creatorId: { type: 'string' },
      niche: { type: 'string' }
    },
    required: ['creatorId', 'niche']
  }
}

/**
 * Get category keywords for a niche to search profiles
 * Using specific keywords to target relevant profiles
 */
function getNicheKeywords(niche: string): string[] {
  const keywordMap: Record<string, string[]> = {
    tech: ['software developer', 'programmer', 'coding', 'tech influencer', 'developer'],
    gaming: ['gaming', 'gamer', 'esports', 'streamer'],
    fashion: ['fashion', 'style', 'fashion blogger'],
    fitness: ['fitness', 'workout', 'fitness influencer'],
    food: ['food', 'food blogger', 'chef'],
    travel: ['travel', 'travel blogger', 'wanderlust'],
    business: ['business', 'entrepreneur', 'startup'],
    photography: ['photography', 'photographer'],
    music: ['music', 'musician', 'music producer'],
    art: ['art', 'artist', 'digital art']
  }

  return keywordMap[niche.toLowerCase()] || [niche.toLowerCase()]
}

/**
 * Discover Instagram competitors dynamically
 */
async function discoverInstagramCompetitorsDynamic(
  niche: string,
  logger: any
): Promise<Competitor[]> {
  const competitors: Competitor[] = []
  const maxCompetitors = 5
  const minFollowers = 100000
  const maxFollowers = 500000

  if (!isApifyConfigured()) {
    logger.warn('DiscoverInstagramCompetitorsDynamic: Apify not configured, skipping Instagram discovery')
    return competitors
  }

  try {
    logger.info('DiscoverInstagramCompetitorsDynamic: Starting category-based discovery', {
      niche,
      minFollowers,
      maxFollowers,
      targetRange: '100k-500k followers'
    })

    // Get relevant keywords for the niche category
    const keywords = getNicheKeywords(niche)

    logger.info('DiscoverInstagramCompetitorsDynamic: Using keywords for niche category', {
      niche,
      keywords
    })

    // Use Instagram Search Scraper to find profiles by category keywords
    // Use comma-separated keywords for better search results
    const search = keywords.slice(0, 3).join(', ') // Use first 3 keywords comma-separated

    logger.info('DiscoverInstagramCompetitorsDynamic: Searching profiles by category keywords', {
      search,
      niche,
      keywordsUsed: keywords.slice(0, 3)
    })

    const searchInput = {
      search: search,
      searchType: 'user', // Search for user profiles
      resultsLimit: 5
    }

    const searchResults = await runApifyActor<any>(
      'apify/instagram-search-scraper',
      searchInput,
      logger
    )

    if (!searchResults || searchResults.length === 0) {
      logger.warn('DiscoverInstagramCompetitorsDynamic: No profiles found from search', {
        niche,
        search
      })
      return competitors
    }

    logger.info('DiscoverInstagramCompetitorsDynamic: Search results received', {
      resultCount: searchResults.length,
      search
    })

    // Extract usernames from search results
    const usernames = new Set<string>()
    for (const result of searchResults) {
      if (result.username) usernames.add(result.username)
      if (result.user?.username) usernames.add(result.user.username)
      if (result.profileUsername) usernames.add(result.profileUsername)
    }

    logger.info('DiscoverInstagramCompetitorsDynamic: Extracted usernames from search', {
      usernameCount: usernames.size,
      usernames: Array.from(usernames).slice(0, 20)
    })

    if (usernames.size === 0) {
      logger.warn('DiscoverInstagramCompetitorsDynamic: No usernames extracted from search results', {
        niche,
        search
      })
      return competitors
    }

    // Fetch detailed profile information for discovered usernames
    // Only fetch 10 profiles to save API credits - we'll filter to 5 best matches
    const usernamesArray = Array.from(usernames).slice(0, 10)
    const profileInput = {
      usernames: usernamesArray,
      resultsLimit: 10
    }

    logger.info('DiscoverInstagramCompetitorsDynamic: Fetching profile details', {
      usernameCount: profileInput.usernames.length,
      usernames: profileInput.usernames
    })

    const results = await runApifyActor<any>(
      'apify/instagram-profile-scraper',
      profileInput,
      logger
    )

    // Log raw Apify response for debugging
    logger.info('DiscoverInstagramCompetitorsDynamic: Raw Apify response received', {
      resultCount: results?.length || 0,
      hasResults: !!results && results.length > 0,
      sampleResult: results && results.length > 0 ? {
        keys: Object.keys(results[0]),
        sample: JSON.stringify(results[0], null, 2)
      } : null
    })

    if (!results || results.length === 0) {
      logger.warn('DiscoverInstagramCompetitorsDynamic: No profile results from Apify', {
        niche,
        usernamesCount: usernamesArray.length
      })
      return competitors
    }

    // Log all raw profiles for debugging
    logger.info('DiscoverInstagramCompetitorsDynamic: Processing raw profiles', {
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

    // Filter results to 100k-500k followers
    const filtered = results
      .filter((profile: any) => {
        // Extract follower count (handle different possible field names)
        const followerCount = profile.followersCount ||
                            profile.followers ||
                            profile.followerCount ||
                            profile.follower_count ||
                            0

        // Check follower range (100k-500k)
        const inRange = followerCount >= minFollowers && followerCount <= maxFollowers

        // Exclude private accounts
        const isPublic = !profile.isPrivate && !profile.private

        // Must have a username
        const hasUsername = !!(profile.username || profile.handle || profile.id)

        const isValid = inRange && isPublic && hasUsername

        logger.debug('DiscoverInstagramCompetitorsDynamic: Profile filter check', {
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

        logger.debug('DiscoverInstagramCompetitorsDynamic: Mapped competitor', {
          competitor: JSON.stringify(competitor, null, 2)
        })

        return competitor
      })
      .sort((a: Competitor, b: Competitor) => {
        // Prefer accounts with followers around 100k-200k, then sort by follower count
        const aInPreferredRange = a.follower_count >= 100000 && a.follower_count <= 200000
        const bInPreferredRange = b.follower_count >= 100000 && b.follower_count <= 200000

        if (aInPreferredRange && !bInPreferredRange) return -1
        if (!aInPreferredRange && bInPreferredRange) return 1
        return b.follower_count - a.follower_count
      })
      .slice(0, maxCompetitors)

    competitors.push(...filtered)

    logger.info('DiscoverInstagramCompetitorsDynamic: Discovery completed', {
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
    logger.error('DiscoverInstagramCompetitorsDynamic: Error', {
      niche,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
  }

  return competitors.slice(0, maxCompetitors)
}


export const handler: Handlers['DiscoverInstagramCompetitorsDynamic'] = async (input, ctx) => {
  const { creatorId, niche } = input || {}

  // Create file logger for detailed logging
  const fileLogger = createFileLogger(`instagram-dynamic-${creatorId}-${Date.now()}`, ctx.logger)

  fileLogger.info('DiscoverInstagramCompetitorsDynamic: Received input', {
    input: JSON.stringify(input, null, 2),
    creatorId,
    niche,
    traceId: ctx.traceId
  })

  if (!creatorId || !niche) {
    fileLogger.warn('DiscoverInstagramCompetitorsDynamic: Missing required data', {
      creatorId: !!creatorId,
      niche: !!niche,
      inputKeys: input ? Object.keys(input) : []
    })
    return
  }

  try {
    const competitors = await discoverInstagramCompetitorsDynamic(niche, fileLogger)

    // Emit event with found competitors
    await ctx.emit({
      topic: 'competitor.instagram.found',
      data: {
        creatorId,
        platform: 'instagram',
        competitors
      }
    })

    fileLogger.info('DiscoverInstagramCompetitorsDynamic: Parallel discovery completed', {
      creatorId,
      competitorCount: competitors.length,
      niche,
      finalCompetitors: competitors.map(c => ({
        username: c.external_id,
        name: c.name,
        followers: c.follower_count
      }))
    })

  } catch (error) {
    fileLogger.error('DiscoverInstagramCompetitorsDynamic: Failed', {
      creatorId,
      niche,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
  }
}
