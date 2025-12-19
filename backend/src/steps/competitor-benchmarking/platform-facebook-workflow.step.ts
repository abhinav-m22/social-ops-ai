import type { EventConfig, Handlers } from 'motia'
import { createFileLogger } from '../../lib/competitor-benchmarking/fileLogger.js'
import type { CompetitorBenchmarkingState, Platform, Competitor, FacebookPost } from './types.js'
import { 
  persistCompetitorProfile, 
  persistContentItem,
  facebookPostToContentItem,
  getProfileId
} from './persist-competitor-data'
import { runApifyActor, isApifyConfigured } from '../../lib/competitor-benchmarking/apifyClient.js'
import { generatePlatformAnalysis } from '../../lib/competitor-benchmarking/groqAnalysis.js'

export const config: EventConfig = {
  type: 'event',
  name: 'FacebookPlatformWorkflow',
  subscribes: ['competitor.platform.facebook'],
  emits: ['competitor.platform.completed'],
  description: 'Complete Facebook competitor benchmarking workflow: discover, fetch, persist, analyze',
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
 * Get fallback pages for niche
 */
function getFallbackPages(niche: string): Array<{ url: string; name: string }> {
  const pageMap: Record<string, Array<{ url: string; name: string }>> = {
    tech: [
      { url: 'https://www.facebook.com/techcrunch', name: 'TechCrunch' },
      { url: 'https://www.facebook.com/theverge', name: 'The Verge' },
      { url: 'https://www.facebook.com/wired', name: 'WIRED' },
      { url: 'https://www.facebook.com/engadget', name: 'Engadget' },
      { url: 'https://www.facebook.com/gizmodo', name: 'Gizmodo' }
    ],
    gaming: [
      { url: 'https://www.facebook.com/IGN', name: 'IGN' },
      { url: 'https://www.facebook.com/GameSpot', name: 'GameSpot' },
      { url: 'https://www.facebook.com/polygon', name: 'Polygon' }
    ],
    fitness: [
      { url: 'https://www.facebook.com/MensHealth', name: 'Men\'s Health' },
      { url: 'https://www.facebook.com/WomensHealth', name: 'Women\'s Health' }
    ]
  }
  return pageMap[niche.toLowerCase()] || pageMap.tech || []
}

/**
 * Discover Facebook competitors
 */
async function discoverCompetitors(niche: string, logger: any): Promise<Competitor[]> {
  const competitors: Competitor[] = []
  const maxCompetitors = 5
  // Lower threshold for testing - can be adjusted based on actual data availability
  const minFollowers = 50000  // Lowered from 100000
    const maxFollowers = 10000000  // 10M to capture major pages

  if (!isApifyConfigured()) {
    logger.warn('FacebookPlatformWorkflow: Apify not configured, skipping discovery')
    return competitors
  }

  try {
    const fallbackPages = getFallbackPages(niche)
    const actorInput = {
      startUrls: fallbackPages.slice(0, 5).map(page => ({ url: page.url })),
      resultsLimit: 5
    }

    const results = await runApifyActor<any>(
      'apify/facebook-pages-scraper',
      actorInput,
      logger
    )

    if (!results || results.length === 0) {
      return competitors
    }

    const errorResults = results.filter((item: any) => item.error || item.errorDescription)
    if (errorResults.length > 0) {
      const validResults = results.filter((item: any) => !item.error && !item.errorDescription)
      if (validResults.length === 0) {
        return competitors
      }
      results.splice(0, results.length, ...validResults)
    }

    // Log all pages before filtering
    logger.info('FacebookPlatformWorkflow: Pages before filtering', {
      totalPages: results.length,
      pages: results.map((p: any) => ({
        pageId: p.pageId || p.id || p.page_id || 'unknown',
        pageName: p.pageName || p.name || p.title || 'unknown',
        followersCount: p.followersCount || p.followers || p.follower_count || p.likes || p.likesCount || 0,
        hasPageId: !!(p.pageId || p.id || p.page_id)
      }))
    })

    const filtered = results
      .filter((page: any) => {
        const followerCount = page.followersCount || page.followers || page.follower_count || page.likes || page.likesCount || 0
        const inRange = followerCount >= minFollowers && followerCount <= maxFollowers
        const hasPageId = !!(page.pageId || page.id || page.page_id)
        const isValid = inRange && hasPageId

        logger.debug('FacebookPlatformWorkflow: Page filter check', {
          pageId: page.pageId || page.id || page.page_id || 'unknown',
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
        const followerCount = page.followersCount || page.followers || page.follower_count || page.likes || page.likesCount || 0
        return {
          platform: 'facebook' as Platform,
          external_id: page.pageId || page.id || page.page_id || '',
          name: page.pageName || page.name || page.title || 'Unknown',
          follower_count: followerCount,
          category: page.category || ''
        }
      })
      .sort((a: Competitor, b: Competitor) => b.follower_count - a.follower_count)
      .slice(0, maxCompetitors)

    competitors.push(...filtered)

    logger.info('FacebookPlatformWorkflow: Filtering completed', {
      totalPages: results.length,
      filteredCount: filtered.length,
      finalCompetitorCount: competitors.length,
      minFollowers,
      maxFollowers,
      competitors: competitors.map(c => ({
        pageId: c.external_id,
        name: c.name,
        followers: c.follower_count.toLocaleString()
      }))
    })

  } catch (error) {
    logger.error('FacebookPlatformWorkflow: Discovery error', {
      error: error instanceof Error ? error.message : String(error)
    })
  }

  return competitors
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
      const profileUrl = `https://www.facebook.com/${competitor.external_id}`
      const profileId = await persistCompetitorProfile(
        state,
        'facebook',
        competitor.external_id,
        competitor.name,
        profileUrl,
        competitor.follower_count,
        (competitor as any).category
      )
      profileIds.push(profileId)
      logger.info('FacebookPlatformWorkflow: Persisted profile', {
        profileId,
        name: competitor.name,
        followers: competitor.follower_count
      })
    } catch (error) {
      logger.error('FacebookPlatformWorkflow: Failed to persist profile', {
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
  state: any,
  logger: any
): Promise<{ profileId: string; posts: FacebookPost[] }[]> {
  const results: { profileId: string; posts: FacebookPost[] }[] = []
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000

  if (!isApifyConfigured()) {
    logger.warn('FacebookPlatformWorkflow: Apify not configured, skipping content fetch')
    return results
  }

  for (const competitor of competitors) {
    try {
      const profileId = getProfileId('facebook', competitor.external_id)
      
      const actorInput = {
        pageIds: [competitor.external_id],
        maxPosts: 30
      }

      const apifyResults = await runApifyActor<any>(
        'apify/facebook-posts-scraper',
        actorInput,
        logger
      )

      if (!apifyResults || apifyResults.length === 0) {
        logger.warn('FacebookPlatformWorkflow: No posts found', {
          pageId: competitor.external_id
        })
        results.push({ profileId, posts: [] })
        continue
      }

      const posts: FacebookPost[] = []

      for (const item of apifyResults) {
        try {
          let createdTime: number | null = null
          if (item.createdTime) {
            createdTime = new Date(item.createdTime).getTime()
          } else if (item.created_time) {
            createdTime = new Date(item.created_time).getTime()
          } else if (item.timestamp) {
            createdTime = typeof item.timestamp === 'number' ? item.timestamp * 1000 : new Date(item.timestamp).getTime()
          }

          if (!createdTime || createdTime < thirtyDaysAgo) {
            continue
          }

          const postType = item.type || item.postType || 'status'
          const normalizedPostType = ['photo', 'video', 'link', 'status'].includes(postType)
            ? (postType as 'photo' | 'video' | 'link' | 'status')
            : 'status'

          const postId = item.id || item.postId || ''
          const contentUrl = item.url || `https://www.facebook.com/${postId}`

          const post: FacebookPost = {
            post_id: postId,
            content_id: postId,
            content_url: contentUrl,
            created_time: new Date(createdTime).toISOString(),
            created_at: new Date(createdTime).toISOString(),
            post_type: normalizedPostType,
            likes_count: item.reactionsCount || item.reactions || item.likes || 0,
            comments_count: item.commentsCount || item.comments || 0,
            shares_count: item.sharesCount || item.shares || 0,
            views_count: item.viewsCount || item.views
          }

          posts.push(post)

          logger.debug('FacebookPlatformWorkflow: Processing post', {
            pageId: competitor.external_id,
            postId,
            postType: normalizedPostType,
            likesCount: post.likes_count,
            commentsCount: post.comments_count,
            createdTime: post.created_time
          })

          // Persist content item
          const contentItem = facebookPostToContentItem(post, profileId)
          await persistContentItem(
            state,
            'facebook',
            profileId,
            contentItem.contentId,
            contentItem.contentType,
            contentItem.contentUrl,
            contentItem.createdAt,
            contentItem.metrics,
            contentItem.rawMetrics
          )

        } catch (itemError) {
          logger.warn('FacebookPlatformWorkflow: Error processing post', {
            pageId: competitor.external_id,
            postId: item.id || item.postId || 'unknown',
            error: itemError instanceof Error ? itemError.message : String(itemError),
            stack: itemError instanceof Error ? itemError.stack : undefined
          })
        }
      }

      results.push({ profileId, posts })
      logger.info('FacebookPlatformWorkflow: Fetched and persisted content', {
        profileId,
        postCount: posts.length
      })

    } catch (error) {
      logger.error('FacebookPlatformWorkflow: Failed to fetch content', {
        competitorId: competitor.external_id,
        error: error instanceof Error ? error.message : String(error)
      })
      results.push({ profileId: getProfileId('facebook', competitor.external_id), posts: [] })
    }
  }

  return results
}

export const handler = async (input: any, ctx: any) => {
  const { creatorId, niche } = input || {}
  const fileLogger = createFileLogger(`facebook-platform-${creatorId}-${Date.now()}`, ctx.logger)

  fileLogger.info('FacebookPlatformWorkflow: Starting', {
    creatorId,
    niche,
    traceId: ctx.traceId
  })

  if (!creatorId || !niche) {
    fileLogger.warn('FacebookPlatformWorkflow: Missing required data')
    return
  }

  try {
    // Update platform status to running
    const state = await ctx.state.get(
      'competitorBenchmarking',
      creatorId
    ) as CompetitorBenchmarkingState | null

    if (!state) {
      fileLogger.error('FacebookPlatformWorkflow: State not found')
      return
    }

    const updatedState: CompetitorBenchmarkingState = {
      ...state,
      platform_status: {
        ...state.platform_status,
        facebook: 'running'
      },
      updated_at: new Date().toISOString()
    }
    await ctx.state.set('competitorBenchmarking', creatorId, updatedState)

    // Step 1: Discover competitors
    fileLogger.info('FacebookPlatformWorkflow: Step 1 - Discovering competitors')
    const competitors = await discoverCompetitors(niche, fileLogger)
    fileLogger.info('FacebookPlatformWorkflow: Discovered competitors', {
      count: competitors.length
    })

    if (competitors.length === 0) {
      fileLogger.warn('FacebookPlatformWorkflow: No competitors found - completing workflow')
      const finalState: CompetitorBenchmarkingState = {
        ...updatedState,
        platform_status: {
          ...updatedState.platform_status,
          facebook: 'completed'
        },
        updated_at: new Date().toISOString()
      }
      await ctx.state.set('competitorBenchmarking', creatorId, finalState)
      
      fileLogger.info('FacebookPlatformWorkflow: Emitting completion event (no competitors)', {
        creatorId,
        platform: 'facebook',
        success: true
      })
      
      try {
        const emitResult = await ctx.emit({
          topic: 'competitor.platform.completed',
          data: { creatorId, platform: 'facebook', success: true }
        })
        fileLogger.info('FacebookPlatformWorkflow: Completion event emitted successfully (no competitors)', {
          emitResult: emitResult ? 'success' : 'no result',
          topic: 'competitor.platform.completed'
        })
      } catch (emitError) {
        fileLogger.error('FacebookPlatformWorkflow: Failed to emit completion event', {
          error: emitError instanceof Error ? emitError.message : String(emitError),
          stack: emitError instanceof Error ? emitError.stack : undefined,
          topic: 'competitor.platform.completed'
        })
        // Still update state even if emit fails - the GET endpoint will handle completion
      }
      return
    }

    // Step 2: Fetch and persist profiles
    fileLogger.info('FacebookPlatformWorkflow: Step 2 - Persisting profiles')
    const profileIds = await fetchAndPersistProfiles(competitors, ctx.state, fileLogger)
    fileLogger.info('FacebookPlatformWorkflow: Persisted profiles', {
      count: profileIds.length
    })

    // Step 3: Fetch and persist content
    fileLogger.info('FacebookPlatformWorkflow: Step 3 - Fetching and persisting content')
    const contentResults = await fetchAndPersistContent(competitors, ctx.state, fileLogger)
    const totalPosts = contentResults.reduce((sum, r) => sum + r.posts.length, 0)
    fileLogger.info('FacebookPlatformWorkflow: Fetched and persisted content', {
      totalPosts,
      competitorsWithContent: contentResults.filter(r => r.posts.length > 0).length
    })

    // Step 4: Run AI analysis per platform
    fileLogger.info('FacebookPlatformWorkflow: Step 4 - Running AI analysis')
    try {
      const summaryData = {
        competitorCount: competitors.length,
        totalPosts,
        avgFollowers: competitors.reduce((sum, c) => sum + c.follower_count, 0) / competitors.length,
        posts: contentResults.flatMap(r => r.posts).slice(0, 20)
      }

      const aiInsights = await generatePlatformAnalysis(
        'facebook',
        summaryData,
        { logger: fileLogger }
      )

      if (aiInsights) {
        const finalState: CompetitorBenchmarkingState = {
          ...updatedState,
          platform_status: {
            ...updatedState.platform_status,
            facebook: 'completed'
          },
          platform_insights: {
            ...updatedState.platform_insights,
            facebook: aiInsights
          },
          updated_at: new Date().toISOString()
        }
        await ctx.state.set('competitorBenchmarking', creatorId, finalState)
        fileLogger.info('FacebookPlatformWorkflow: AI analysis completed')
      } else {
        throw new Error('AI analysis returned null')
      }
    } catch (aiError) {
      fileLogger.error('FacebookPlatformWorkflow: AI analysis failed', {
        error: aiError instanceof Error ? aiError.message : String(aiError)
      })
      const finalState: CompetitorBenchmarkingState = {
        ...updatedState,
        platform_status: {
          ...updatedState.platform_status,
          facebook: 'completed'
        },
        updated_at: new Date().toISOString()
      }
      await ctx.state.set('competitorBenchmarking', creatorId, finalState)
    }

    // ALWAYS emit completion event - this is critical for workflow progression
    fileLogger.info('FacebookPlatformWorkflow: Emitting completion event', {
      creatorId,
      platform: 'facebook',
      success: true
    })
    
    try {
      await ctx.emit({
        topic: 'competitor.platform.completed',
        data: { creatorId, platform: 'facebook', success: true }
      })
      fileLogger.info('FacebookPlatformWorkflow: Completion event emitted successfully')
    } catch (emitError) {
      fileLogger.error('FacebookPlatformWorkflow: Failed to emit completion event', {
        error: emitError instanceof Error ? emitError.message : String(emitError),
        stack: emitError instanceof Error ? emitError.stack : undefined
      })
      // Still try to continue - the state is already updated
    }

    fileLogger.info('FacebookPlatformWorkflow: Completed successfully', {
      competitors: competitors.length,
      totalPosts
    })

  } catch (error) {
    fileLogger.error('FacebookPlatformWorkflow: Failed', {
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
          facebook: 'failed'
        },
        updated_at: new Date().toISOString()
      }
      await ctx.state.set('competitorBenchmarking', creatorId, failedState)
    }

    await ctx.emit({
      topic: 'competitor.platform.completed',
      data: { creatorId, platform: 'facebook', success: false }
    })
  }
}

