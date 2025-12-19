import type { EventConfig, Handlers } from 'motia'
import { runApifyActor, isApifyConfigured } from '../../lib/competitor-benchmarking/apifyClient.js'
import { createFileLogger } from '../../lib/competitor-benchmarking/fileLogger.js'
import type { Competitor, Platform } from './types.js'

export const config: EventConfig = {
  type: 'event',
  name: 'DiscoverFacebookCompetitorsDynamic',
  subscribes: ['competitor.discover.facebook'],
  emits: ['competitor.facebook.found'],
  description: 'Dynamically discovers Facebook competitors by niche',
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
 * Get popular Facebook pages for a niche
 */
function getFallbackPages(niche: string): Array<{ url: string; name: string }> {
  const pageMap: Record<string, Array<{ url: string; name: string }>> = {
    tech: [
      { url: 'https://www.facebook.com/techcrunch', name: 'TechCrunch' },
      { url: 'https://www.facebook.com/theverge', name: 'The Verge' },
      { url: 'https://www.facebook.com/wired', name: 'WIRED' },
      { url: 'https://www.facebook.com/engadget', name: 'Engadget' },
      { url: 'https://www.facebook.com/gizmodo', name: 'Gizmodo' },
      { url: 'https://www.facebook.com/arstechnica', name: 'Ars Technica' },
      { url: 'https://www.facebook.com/cnet', name: 'CNET' },
      { url: 'https://www.facebook.com/bloombergtechnology', name: 'Bloomberg Technology' },
      { url: 'https://www.facebook.com/recode', name: 'Recode' },
      { url: 'https://www.facebook.com/mashable', name: 'Mashable' }
    ],
    gaming: [
      { url: 'https://www.facebook.com/IGN', name: 'IGN' },
      { url: 'https://www.facebook.com/GameSpot', name: 'GameSpot' },
      { url: 'https://www.facebook.com/polygon', name: 'Polygon' },
      { url: 'https://www.facebook.com/Steam', name: 'Steam' },
      { url: 'https://www.facebook.com/EpicGames', name: 'Epic Games' }
    ],
    fashion: [
      { url: 'https://www.facebook.com/vogue', name: 'Vogue' },
      { url: 'https://www.facebook.com/gq', name: 'GQ' },
      { url: 'https://www.facebook.com/elle', name: 'Elle' },
      { url: 'https://www.facebook.com/harpersbazaar', name: 'Harper\'s Bazaar' },
      { url: 'https://www.facebook.com/instyle', name: 'InStyle' }
    ],
    fitness: [
      { url: 'https://www.facebook.com/MensHealth', name: 'Men\'s Health' },
      { url: 'https://www.facebook.com/WomensHealth', name: 'Women\'s Health' },
      { url: 'https://www.facebook.com/SELFmagazine', name: 'SELF Magazine' },
      { url: 'https://www.facebook.com/Shape', name: 'Shape Magazine' },
      { url: 'https://www.facebook.com/MensFitness', name: 'Men\'s Fitness' }
    ],
    food: [
      { url: 'https://www.facebook.com/FoodNetwork', name: 'Food Network' },
      { url: 'https://www.facebook.com/BonAppetitMag', name: 'Bon Appétit' },
      { url: 'https://www.facebook.com/Epicurious', name: 'Epicurious' },
      { url: 'https://www.facebook.com/Allrecipes', name: 'Allrecipes' },
      { url: 'https://www.facebook.com/Tasty', name: 'Tasty' }
    ],
    travel: [
      { url: 'https://www.facebook.com/NationalGeographic', name: 'National Geographic' },
      { url: 'https://www.facebook.com/CondéNastTraveler', name: 'Condé Nast Traveler' },
      { url: 'https://www.facebook.com/TravelLeisure', name: 'Travel + Leisure' },
      { url: 'https://www.facebook.com/LonelyPlanet', name: 'Lonely Planet' },
      { url: 'https://www.facebook.com/GoPro', name: 'GoPro' }
    ],
    business: [
      { url: 'https://www.facebook.com/Forbes', name: 'Forbes' },
      { url: 'https://www.facebook.com/businessinsider', name: 'Business Insider' },
      { url: 'https://www.facebook.com/Entrepreneur', name: 'Entrepreneur' },
      { url: 'https://www.facebook.com/HarvardBusinessReview', name: 'Harvard Business Review' },
      { url: 'https://www.facebook.com/FastCompany', name: 'Fast Company' }
    ],
    photography: [
      { url: 'https://www.facebook.com/NationalGeographic', name: 'National Geographic' },
      { url: 'https://www.facebook.com/CanonUSA', name: 'Canon USA' },
      { url: 'https://www.facebook.com/NikonUSA', name: 'Nikon USA' },
      { url: 'https://www.facebook.com/SonyAlpha', name: 'Sony Alpha' },
      { url: 'https://www.facebook.com/Adorama', name: 'Adorama' }
    ],
    music: [
      { url: 'https://www.facebook.com/Billboard', name: 'Billboard' },
      { url: 'https://www.facebook.com/RollingStone', name: 'Rolling Stone' },
      { url: 'https://www.facebook.com/MTV', name: 'MTV' },
      { url: 'https://www.facebook.com/VH1', name: 'VH1' },
      { url: 'https://www.facebook.com/Pitchfork', name: 'Pitchfork' }
    ],
    art: [
      { url: 'https://www.facebook.com/TheMETMuseum', name: 'The Metropolitan Museum of Art' },
      { url: 'https://www.facebook.com/MoMA', name: 'Museum of Modern Art' },
      { url: 'https://www.facebook.com/Tate', name: 'Tate' },
      { url: 'https://www.facebook.com/Guggenheim', name: 'Solomon R. Guggenheim Museum' },
      { url: 'https://www.facebook.com/WhitneyMuseum', name: 'Whitney Museum of American Art' }
    ]
  }

  return pageMap[niche.toLowerCase()] || pageMap.tech
}

/**
 * Discover Facebook competitors dynamically
 */
async function discoverFacebookCompetitorsDynamic(
  niche: string,
  logger: any
): Promise<Competitor[]> {
  const competitors: Competitor[] = []
  const maxCompetitors = 5
  const minFollowers = 100000
  const maxFollowers = 500000

  if (!isApifyConfigured()) {
    logger.warn('DiscoverFacebookCompetitorsDynamic: Apify not configured, skipping Facebook discovery')
    return competitors
  }

  try {
    logger.info('DiscoverFacebookCompetitorsDynamic: Starting discovery', {
      niche,
      minFollowers,
      maxFollowers,
      targetRange: '100k-500k followers'
    })

    // Get fallback pages for the niche
    const fallbackPages = getFallbackPages(niche)

    logger.info('DiscoverFacebookCompetitorsDynamic: Using fallback pages for niche', {
      niche,
      pageCount: fallbackPages.length,
      pages: fallbackPages.slice(0, 5)
    })

    // Use Apify Facebook scraper with specific page URLs
    const actorInput = {
      startUrls: fallbackPages.slice(0, 5).map(page => ({ url: page.url })),
      resultsLimit: 5
    }

    logger.info('DiscoverFacebookCompetitorsDynamic: Calling Apify Facebook scraper', {
      actorId: 'apify/facebook-pages-scraper',
      input: JSON.stringify(actorInput, null, 2)
    })

    const results = await runApifyActor<any>(
      'apify/facebook-pages-scraper',
      actorInput,
      logger
    )

    // Log raw Apify response for debugging
    logger.info('DiscoverFacebookCompetitorsDynamic: Raw Apify response received', {
      resultCount: results?.length || 0,
      hasResults: !!results && results.length > 0
    })

    if (!results || results.length === 0) {
      logger.warn('DiscoverFacebookCompetitorsDynamic: No results from Apify', {
        niche,
        urlsCount: actorInput.startUrls.length
      })
      return competitors
    }

    // Check if response contains error objects
    const errorResults = results.filter((item: any) => item.error || item.errorDescription)
    if (errorResults.length > 0) {
      logger.warn('DiscoverFacebookCompetitorsDynamic: Some results contain errors', {
        errorCount: errorResults.length,
        totalResults: results.length
      })
      // Filter out error objects
      results.splice(0, results.length, ...results.filter((item: any) => !item.error && !item.errorDescription))
    }

    // Filter results to 100k-500k followers
    const filtered = results
      .filter((page: any) => {
        const followerCount = page.followersCount ||
                            page.followers ||
                            page.followerCount ||
                            page.follower_count ||
                            0

        const inRange = followerCount >= minFollowers && followerCount <= maxFollowers
        const hasPageId = !!(page.pageId || page.id || page.page_id)

        return inRange && hasPageId
      })
      .map((page: any) => {
        const followerCount = page.followersCount ||
                            page.followers ||
                            page.followerCount ||
                            page.follower_count ||
                            0

        return {
          platform: 'facebook' as Platform,
          external_id: page.pageId || page.id || page.page_id || '',
          name: page.pageName || page.name || page.title || 'Unknown',
          follower_count: followerCount,
          category: page.category || 'unknown'
        }
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

    logger.info('DiscoverFacebookCompetitorsDynamic: Discovery completed', {
      niche,
      totalResults: results.length,
      filteredCount: filtered.length,
      finalCompetitorCount: competitors.length
    })

  } catch (error) {
    logger.error('DiscoverFacebookCompetitorsDynamic: Error', {
      niche,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
  }

  return competitors.slice(0, maxCompetitors)
}

export const handler: Handlers['DiscoverFacebookCompetitorsDynamic'] = async (input, ctx) => {
  const { creatorId, niche } = input || {}

  // Create file logger for detailed logging
  const fileLogger = createFileLogger(`facebook-dynamic-${creatorId}-${Date.now()}`, ctx.logger)

  fileLogger.info('DiscoverFacebookCompetitorsDynamic: Received input', {
    input: JSON.stringify(input, null, 2),
    creatorId,
    niche,
    traceId: ctx.traceId
  })

  if (!creatorId || !niche) {
    fileLogger.warn('DiscoverFacebookCompetitorsDynamic: Missing required data', {
      creatorId: !!creatorId,
      niche: !!niche,
      inputKeys: input ? Object.keys(input) : []
    })
    return
  }

  try {
    const competitors = await discoverFacebookCompetitorsDynamic(niche, fileLogger)

    // Emit event with found competitors
    await ctx.emit({
      topic: 'competitor.facebook.found',
      data: {
        creatorId,
        platform: 'facebook',
        competitors
      }
    })

    fileLogger.info('DiscoverFacebookCompetitorsDynamic: Parallel discovery completed', {
      creatorId,
      competitorCount: competitors.length,
      niche,
      finalCompetitors: competitors.map(c => ({
        pageId: c.external_id,
        name: c.name,
        followers: c.follower_count
      }))
    })

  } catch (error) {
    fileLogger.error('DiscoverFacebookCompetitorsDynamic: Failed', {
      creatorId,
      niche,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
  }
}
