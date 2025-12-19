import type { EventConfig, Handlers } from 'motia'
import { createFileLogger } from '../../lib/competitor-benchmarking/fileLogger.js'
import type { CompetitorBenchmarkingState, Platform, PlatformStatus, Competitor, InstagramPost } from './types.js'
import { 
  persistCompetitorProfile, 
  persistContentItem,
  instagramPostToContentItem,
  getProfileId
} from './persist-competitor-data'
import { runApifyActor, isApifyConfigured } from '../../lib/competitor-benchmarking/apifyClient.js'
import { generatePlatformAnalysis } from '../../lib/competitor-benchmarking/groqAnalysis.js'

export const config: EventConfig = {
  type: 'event',
  name: 'InstagramPlatformWorkflow',
  subscribes: ['competitor.platform.instagram'],
  emits: ['competitor.platform.completed'],
  description: 'Complete Instagram competitor benchmarking workflow: discover, fetch, persist, analyze',
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
 * Discover Instagram competitors
 */
async function discoverCompetitors(niche: string, logger: any): Promise<Competitor[]> {
  const competitors: Competitor[] = []
  const maxCompetitors = 5
  // Lower threshold for testing - can be adjusted based on actual data availability
  const minFollowers = 50000  // Lowered from 100000
  const maxFollowers = 1000000  // Increased from 500000

  if (!isApifyConfigured()) {
    logger.warn('InstagramPlatformWorkflow: Apify not configured, skipping discovery')
    return competitors
  }

  try {
    const keywords = getNicheKeywords(niche)
    const search = keywords.slice(0, 3).join(', ')

    const searchInput = {
      search: search,
      searchType: 'user',
      resultsLimit: 5
    }

    const searchResults = await runApifyActor<any>(
      'apify/instagram-search-scraper',
      searchInput,
      logger
    )

    if (!searchResults || searchResults.length === 0) {
      logger.warn('InstagramPlatformWorkflow: No profiles found')
      return competitors
    }

    // Extract usernames from search results - handle different response formats
    const usernames = new Set<string>()
    for (const result of searchResults) {
      if (result.username) usernames.add(result.username)
      if (result.user?.username) usernames.add(result.user.username)
      if (result.profileUsername) usernames.add(result.profileUsername)
      // Some search results might have the profile data directly
      if (result.id && result.followersCount) {
        // This might be a profile result, not just a search result
        if (result.username) usernames.add(result.username)
      }
    }

    logger.info('InstagramPlatformWorkflow: Extracted usernames from search', {
      usernameCount: usernames.size,
      usernames: Array.from(usernames).slice(0, 20),
      searchResultsCount: searchResults.length
    })

    if (usernames.size === 0) {
      logger.warn('InstagramPlatformWorkflow: No usernames extracted from search results', {
        searchResultsCount: searchResults.length,
        sampleResult: searchResults[0] ? {
          keys: Object.keys(searchResults[0]),
          data: JSON.stringify(searchResults[0], null, 2)
        } : null
      })
      return competitors
    }

    const profileInput = {
      usernames: Array.from(usernames).slice(0, 10),
      resultsLimit: 10
    }

    logger.info('InstagramPlatformWorkflow: Fetching detailed profiles', {
      usernameCount: profileInput.usernames.length,
      usernames: profileInput.usernames
    })

    const results = await runApifyActor<any>(
      'apify/instagram-profile-scraper',
      profileInput,
      logger
    )

    if (!results || results.length === 0) {
      return competitors
    }

    // Log all profiles before filtering
    logger.info('InstagramPlatformWorkflow: Profiles before filtering', {
      totalProfiles: results.length,
      profiles: results.map((p: any) => ({
        username: p.username || p.handle || p.id || 'unknown',
        followersCount: p.followersCount || p.followers || 0,
        isPrivate: p.isPrivate || p.private || false,
        hasUsername: !!(p.username || p.handle || p.id)
      }))
    })

    const filtered = results
      .filter((profile: any) => {
        const followerCount = profile.followersCount || profile.followers || 0
        const inRange = followerCount >= minFollowers && followerCount <= maxFollowers
        const isPublic = !profile.isPrivate && !profile.private
        const hasUsername = !!(profile.username || profile.handle || profile.id)
        const isValid = inRange && isPublic && hasUsername

        logger.debug('InstagramPlatformWorkflow: Profile filter check', {
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
        const followerCount = profile.followersCount || profile.followers || 0
        return {
          platform: 'instagram' as Platform,
          external_id: profile.username || profile.handle || profile.id || '',
          name: profile.fullName || profile.name || profile.username || 'Unknown',
          follower_count: followerCount
        }
      })
      .sort((a: Competitor, b: Competitor) => {
        // Prefer profiles in the 100k-500k range, but accept any in our expanded range
        const aInPreferredRange = a.follower_count >= 100000 && a.follower_count <= 500000
        const bInPreferredRange = b.follower_count >= 100000 && b.follower_count <= 500000
        if (aInPreferredRange && !bInPreferredRange) return -1
        if (!aInPreferredRange && bInPreferredRange) return 1
        return b.follower_count - a.follower_count
      })
      .slice(0, maxCompetitors)

    competitors.push(...filtered)

    logger.info('InstagramPlatformWorkflow: Filtering completed', {
      totalProfiles: results.length,
      filteredCount: filtered.length,
      finalCompetitorCount: competitors.length,
      minFollowers,
      maxFollowers,
      competitors: competitors.map(c => ({
        username: c.external_id,
        name: c.name,
        followers: c.follower_count.toLocaleString()
      }))
    })

  } catch (error) {
    logger.error('InstagramPlatformWorkflow: Discovery error', {
      error: error instanceof Error ? error.message : String(error)
    })
  }

  return competitors
}

/**
 * Get niche keywords
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
      const profileUrl = `https://www.instagram.com/${competitor.external_id}/`
      const profileId = await persistCompetitorProfile(
        state,
        'instagram',
        competitor.external_id,
        competitor.name,
        profileUrl,
        competitor.follower_count
      )
      profileIds.push(profileId)
      logger.info('InstagramPlatformWorkflow: Persisted profile', {
        profileId,
        name: competitor.name,
        followers: competitor.follower_count
      })
    } catch (error) {
      logger.error('InstagramPlatformWorkflow: Failed to persist profile', {
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
): Promise<{ profileId: string; posts: InstagramPost[] }[]> {
  const results: { profileId: string; posts: InstagramPost[] }[] = []
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000

  if (!isApifyConfigured()) {
    logger.warn('InstagramPlatformWorkflow: Apify not configured, skipping content fetch')
    return results
  }

  for (const competitor of competitors) {
    try {
      const profileId = getProfileId('instagram', competitor.external_id)
      
      const actorInput = {
        usernames: [competitor.external_id],
        resultsType: 'posts',
        resultsLimit: 30 // Get last 30 posts
      }

      const apifyResults = await runApifyActor<any>(
        'apify/instagram-profile-scraper',
        actorInput,
        logger
      )

      if (!apifyResults || apifyResults.length === 0) {
        logger.warn('InstagramPlatformWorkflow: No results from Apify', {
          username: competitor.external_id
        })
        results.push({ profileId, posts: [] })
        continue
      }

      // Extract posts from Apify response
      // Apify can return either:
      // 1. Array of post objects directly (in latestPosts)
      // 2. Profile object(s) with latestPosts nested inside
      let postItems: any[] = []
      
      for (const result of apifyResults) {
        if (Array.isArray(result.latestPosts) && result.latestPosts.length > 0) {
          // Profile object with nested latestPosts
          postItems.push(...result.latestPosts)
        } else if (result.id && (result.type || result.shortCode)) {
          // Direct post object
          postItems.push(result)
        }
      }

      logger.info('InstagramPlatformWorkflow: Extracted posts from Apify response', {
        username: competitor.external_id,
        apifyResultsCount: apifyResults.length,
        extractedPostsCount: postItems.length,
        samplePost: postItems[0] ? {
          id: postItems[0].id,
          shortCode: postItems[0].shortCode,
          type: postItems[0].type,
          timestamp: postItems[0].timestamp,
          likesCount: postItems[0].likesCount
        } : null
      })

      if (postItems.length === 0) {
        logger.warn('InstagramPlatformWorkflow: No posts extracted from Apify response', {
          username: competitor.external_id,
          apifyResultsStructure: apifyResults[0] ? {
            keys: Object.keys(apifyResults[0]),
            hasLatestPosts: !!apifyResults[0].latestPosts,
            latestPostsCount: apifyResults[0].latestPosts?.length || 0
          } : null
        })
        results.push({ profileId, posts: [] })
        continue
      }

      const posts: InstagramPost[] = []

      for (const item of postItems) {
        try {
          // Extract timestamp - handle multiple formats
          let timestamp: number | null = null
          if (item.timestamp) {
            // Timestamp might be ISO string or number
            if (typeof item.timestamp === 'string') {
              timestamp = new Date(item.timestamp).getTime()
            } else if (typeof item.timestamp === 'number') {
              // If it's a number, check if it's seconds or milliseconds
              timestamp = item.timestamp < 10000000000 ? item.timestamp * 1000 : item.timestamp
            }
          } else if (item.createdAt) {
            timestamp = new Date(item.createdAt).getTime()
          }

          if (!timestamp || timestamp < thirtyDaysAgo) {
            logger.debug('InstagramPlatformWorkflow: Post filtered out (date)', {
              username: competitor.external_id,
              postId: item.id || item.shortCode || 'unknown',
              timestamp: timestamp ? new Date(timestamp).toISOString() : 'unknown',
              thirtyDaysAgo: new Date(thirtyDaysAgo).toISOString(),
              rawTimestamp: item.timestamp
            })
            continue
          }

          // Determine content type - handle reels/clips
          const isVideo = item.isVideo || 
                         item.type === 'Video' || 
                         item.type === 'video' || 
                         item.isReel || 
                         item.type === 'reel' ||
                         item.productType === 'clips' ||
                         item.productType === 'reels'
          const contentType: 'reel' | 'post' = isVideo ? 'reel' : 'post'
          
          // Extract post ID - use shortCode if available (more reliable for URLs)
          const postId = item.shortCode || item.id || item.postId || item.shortcode || ''
          const contentUrl = item.url || `https://www.instagram.com/p/${postId}/`

          // Use shortCode for content_id if available (more reliable)
          const contentId = item.shortCode || postId
          const finalContentUrl = item.url || contentUrl

          const post: InstagramPost = {
            post_id: postId,
            content_id: contentId,
            content_url: finalContentUrl,
            timestamp: new Date(timestamp).toISOString(),
            created_at: new Date(timestamp).toISOString(),
            contentType,
            likeCount: item.likesCount || item.likeCount || item.likes || 0,
            commentCount: item.commentsCount || item.commentCount || item.comments || 0,
            playCount: isVideo ? (item.videoViewCount || item.playCount || item.views || 0) : undefined,
            views_count: isVideo ? (item.videoViewCount || item.playCount || item.views || 0) : undefined,
            caption: item.caption || item.text || '',
            hashtags: extractHashtags(item.caption || item.text || '')
          }

          posts.push(post)

          logger.debug('InstagramPlatformWorkflow: Processing post', {
            username: competitor.external_id,
            postId,
            contentType,
            likeCount: post.likeCount,
            commentCount: post.commentCount,
            timestamp: post.timestamp
          })

          // Persist content item
          const contentItem = instagramPostToContentItem(post, profileId)
          await persistContentItem(
            state,
            'instagram',
            profileId,
            contentItem.contentId,
            contentItem.contentType,
            contentItem.contentUrl,
            contentItem.createdAt,
            contentItem.metrics,
            contentItem.rawMetrics
          )

        } catch (itemError) {
          logger.warn('InstagramPlatformWorkflow: Error processing post', {
            username: competitor.external_id,
            postId: item.id || item.shortCode || 'unknown',
            error: itemError instanceof Error ? itemError.message : String(itemError),
            stack: itemError instanceof Error ? itemError.stack : undefined
          })
        }
      }

      results.push({ profileId, posts })
      logger.info('InstagramPlatformWorkflow: Fetched and persisted content', {
        profileId,
        postCount: posts.length
      })

    } catch (error) {
      logger.error('InstagramPlatformWorkflow: Failed to fetch content', {
        competitorId: competitor.external_id,
        error: error instanceof Error ? error.message : String(error)
      })
      results.push({ profileId: getProfileId('instagram', competitor.external_id), posts: [] })
    }
  }

  return results
}

/**
 * Extract hashtags from text
 */
function extractHashtags(text: string): string[] {
  const hashtagRegex = /#[\w]+/g
  const matches = text.match(hashtagRegex)
  return matches ? matches.map(h => h.substring(1)) : []
}

export const handler = async (input: any, ctx: any) => {
  const { creatorId, niche } = input || {}
  const fileLogger = createFileLogger(`instagram-platform-${creatorId}-${Date.now()}`, ctx.logger)

  fileLogger.info('InstagramPlatformWorkflow: Starting', {
    creatorId,
    niche,
    traceId: ctx.traceId
  })

  if (!creatorId || !niche) {
    fileLogger.warn('InstagramPlatformWorkflow: Missing required data')
    return
  }

  try {
    // Update platform status to running
    const state = await ctx.state.get(
      'competitorBenchmarking',
      creatorId
    ) as CompetitorBenchmarkingState | null

    if (!state) {
      fileLogger.error('InstagramPlatformWorkflow: State not found')
      return
    }

    const updatedState: CompetitorBenchmarkingState = {
      ...state,
      platform_status: {
        ...state.platform_status,
        instagram: 'running'
      },
      updated_at: new Date().toISOString()
    }
    await ctx.state.set('competitorBenchmarking', creatorId, updatedState)

    // Step 1: Discover competitors
    fileLogger.info('InstagramPlatformWorkflow: Step 1 - Discovering competitors')
    const competitors = await discoverCompetitors(niche, fileLogger)
    fileLogger.info('InstagramPlatformWorkflow: Discovered competitors', {
      count: competitors.length
    })

    if (competitors.length === 0) {
      fileLogger.warn('InstagramPlatformWorkflow: No competitors found - completing workflow')
      const finalState: CompetitorBenchmarkingState = {
        ...updatedState,
        platform_status: {
          ...updatedState.platform_status,
          instagram: 'completed'
        },
        updated_at: new Date().toISOString()
      }
      await ctx.state.set('competitorBenchmarking', creatorId, finalState)
      
      fileLogger.info('InstagramPlatformWorkflow: Emitting completion event (no competitors)', {
        creatorId,
        platform: 'instagram',
        success: true
      })
      
      try {
        await ctx.emit({
          topic: 'competitor.platform.completed',
          data: { creatorId, platform: 'instagram', success: true }
        })
        fileLogger.info('InstagramPlatformWorkflow: Completion event emitted successfully (no competitors)')
      } catch (emitError) {
        fileLogger.error('InstagramPlatformWorkflow: Failed to emit completion event', {
          error: emitError instanceof Error ? emitError.message : String(emitError)
        })
      }
      return
    }

    // Step 2: Fetch and persist profiles
    fileLogger.info('InstagramPlatformWorkflow: Step 2 - Persisting profiles')
    const profileIds = await fetchAndPersistProfiles(competitors, ctx.state, fileLogger)
    fileLogger.info('InstagramPlatformWorkflow: Persisted profiles', {
      count: profileIds.length
    })

    // Step 3: Fetch and persist content
    fileLogger.info('InstagramPlatformWorkflow: Step 3 - Fetching and persisting content')
    const contentResults = await fetchAndPersistContent(competitors, ctx.state, fileLogger)
    const totalPosts = contentResults.reduce((sum, r) => sum + r.posts.length, 0)
    fileLogger.info('InstagramPlatformWorkflow: Fetched and persisted content', {
      totalPosts,
      competitorsWithContent: contentResults.filter(r => r.posts.length > 0).length
    })

    // Step 4: Run AI analysis per platform
    fileLogger.info('InstagramPlatformWorkflow: Step 4 - Running AI analysis')
    try {
      // Extract key details for AI (not everything)
      const summaryData = {
        competitorCount: competitors.length,
        totalPosts,
        avgFollowers: competitors.reduce((sum, c) => sum + c.follower_count, 0) / competitors.length,
        posts: contentResults.flatMap(r => r.posts).slice(0, 20) // Limit to 20 posts for AI
      }

      const aiInsights = await generatePlatformAnalysis(
        'instagram',
        summaryData,
        { logger: fileLogger }
      )

      if (aiInsights) {
        const finalState: CompetitorBenchmarkingState = {
          ...updatedState,
          platform_status: {
            ...updatedState.platform_status,
            instagram: 'completed'
          },
          platform_insights: {
            ...updatedState.platform_insights,
            instagram: aiInsights
          },
          updated_at: new Date().toISOString()
        }
        await ctx.state.set('competitorBenchmarking', creatorId, finalState)
        fileLogger.info('InstagramPlatformWorkflow: AI analysis completed', {
          hasInsights: !!aiInsights
        })
      } else {
        throw new Error('AI analysis returned null')
      }
    } catch (aiError) {
      fileLogger.error('InstagramPlatformWorkflow: AI analysis failed', {
        error: aiError instanceof Error ? aiError.message : String(aiError)
      })
      // Continue with fallback
      const finalState: CompetitorBenchmarkingState = {
        ...updatedState,
        platform_status: {
          ...updatedState.platform_status,
          instagram: 'completed'
        },
        updated_at: new Date().toISOString()
      }
      await ctx.state.set('competitorBenchmarking', creatorId, finalState)
    }

    // ALWAYS emit completion event - this is critical for workflow progression
    fileLogger.info('InstagramPlatformWorkflow: Emitting completion event', {
      creatorId,
      platform: 'instagram',
      success: true
    })
    
    try {
      const emitResult = await ctx.emit({
        topic: 'competitor.platform.completed',
        data: { creatorId, platform: 'instagram', success: true }
      })
      fileLogger.info('InstagramPlatformWorkflow: Completion event emitted successfully', {
        emitResult: emitResult ? 'success' : 'no result',
        topic: 'competitor.platform.completed'
      })
    } catch (emitError) {
      fileLogger.error('InstagramPlatformWorkflow: Failed to emit completion event', {
        error: emitError instanceof Error ? emitError.message : String(emitError),
        stack: emitError instanceof Error ? emitError.stack : undefined,
        topic: 'competitor.platform.completed'
      })
      // Still try to continue - the state is already updated
    }

    fileLogger.info('InstagramPlatformWorkflow: Completed successfully', {
      competitors: competitors.length,
      totalPosts
    })

  } catch (error) {
    fileLogger.error('InstagramPlatformWorkflow: Failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })

    // Update status to failed
    const state = await ctx.state.get(
      'competitorBenchmarking',
      creatorId
    ) as CompetitorBenchmarkingState | null
    if (state) {
      const failedState: CompetitorBenchmarkingState = {
        ...state,
        platform_status: {
          ...state.platform_status,
          instagram: 'failed'
        },
        updated_at: new Date().toISOString()
      }
      await ctx.state.set('competitorBenchmarking', creatorId, failedState)
    }

    await ctx.emit({
      topic: 'competitor.platform.completed',
      data: { creatorId, platform: 'instagram', success: false }
    })
  }
}

