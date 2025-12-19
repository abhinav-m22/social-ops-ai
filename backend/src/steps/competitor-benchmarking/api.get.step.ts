import type { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import type { CompetitorBenchmarkingState, BenchmarkingStatus, Platform } from './types.js'
import { generatePlatformAnalysis } from '../../lib/competitor-benchmarking/groqAnalysis.js'

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'CompetitorGet',
  path: '/competitor/analyze',
  method: 'GET',
  description: 'Gets competitor benchmarking state for a creator',
  emits: [],
  flows: ['competitor-benchmarking'],
  queryParams: [
    { name: 'creatorId', description: 'Creator ID to fetch benchmarking data for' }
  ],
  responseSchema: {
    200: z.object({
      success: z.boolean(),
      state: z.any().optional()
    }),
    400: z.object({
      success: z.boolean(),
      error: z.string()
    }),
    404: z.object({
      success: z.boolean(),
      error: z.string()
    }),
    500: z.object({
      success: z.boolean(),
      error: z.string()
    })
  }
}

export const handler: Handlers['CompetitorGet'] = async (req, ctx) => {
  const creatorId = typeof req.queryParams?.creatorId === 'string' 
    ? req.queryParams.creatorId 
    : Array.isArray(req.queryParams?.creatorId) 
      ? req.queryParams.creatorId[0] 
      : undefined

  ctx.logger.info('CompetitorGet: Request received', {
    creatorId,
    traceId: ctx.traceId
  })

  if (!creatorId) {
    return {
      status: 400,
      body: {
        success: false,
        error: 'creatorId is required'
      }
    }
  }

  try {
    const state = await ctx.state.get(
      'competitorBenchmarking',
      creatorId
    ) as CompetitorBenchmarkingState | null

    if (!state) {
      return {
        status: 404,
        body: {
          success: false,
          error: 'No benchmarking data found for this creator'
        }
      }
    }

    // Fetch competitor profiles and content from state FIRST
    let profiles: any[] = []
    let content: any[] = []
    
    try {
      const allProfiles = await ctx.state.getGroup('competitorProfiles')
      const allContent = await ctx.state.getGroup('competitorContent')
      
      // Filter and deduplicate profiles by platform and external_id
      const profileMap = new Map<string, any>()
      if (allProfiles && Array.isArray(allProfiles)) {
        for (const profile of allProfiles) {
          if (!profile || typeof profile !== 'object') continue
          
          const p = profile as any
          
          // Create unique key: platform-external_id
          const key = `${p.platform || 'unknown'}-${p.external_id || p.id || 'unknown'}`
          
          // Keep the most recent profile if duplicate
          const existing = profileMap.get(key)
          if (!existing || 
              (p.updated_at && existing?.updated_at && 
               new Date(p.updated_at) > new Date(existing.updated_at))) {
            profileMap.set(key, p)
          }
        }
      }
      profiles = Array.from(profileMap.values())
      
      // Filter and deduplicate content by platform, competitor_id, and content_id
      const contentMap = new Map<string, any>()
      if (allContent && Array.isArray(allContent)) {
        for (const item of allContent) {
          if (!item || typeof item !== 'object') continue
          
          const c = item as any
          
          // Create unique key: platform-competitor_id-content_id
          const key = `${c.platform || 'unknown'}-${c.competitor_id || c.competitor_profile_id || 'unknown'}-${c.content_id || c.id || 'unknown'}`
          
          // Keep the most recent content if duplicate
          const existing = contentMap.get(key)
          if (!existing || 
              (c.created_at && existing?.created_at && 
               new Date(c.created_at) > new Date(existing.created_at))) {
            contentMap.set(key, c)
          }
        }
      }
      content = Array.from(contentMap.values())
      
      ctx.logger.info('CompetitorGet: Fetched and deduplicated profiles and content', {
        creatorId,
        profilesCount: profiles.length,
        contentCount: content.length,
        uniqueProfilesByPlatform: {
          instagram: profiles.filter((p: any) => p.platform === 'instagram').length,
          facebook: profiles.filter((p: any) => p.platform === 'facebook').length,
          youtube: profiles.filter((p: any) => p.platform === 'youtube').length
        }
      })
    } catch (error) {
      ctx.logger.warn('CompetitorGet: Failed to fetch profiles/content, continuing with main state', {
        creatorId,
        error: error instanceof Error ? error.message : String(error)
      })
    }

    // TIMEOUT CHECK: If workflow started more than 1min30sec ago, show available data
    const workflowStartTime = state.last_run_at ? new Date(state.last_run_at).getTime() : Date.now()
    const elapsedMs = Date.now() - workflowStartTime
    const timeoutMs = 90 * 1000 // 1min30sec
    const shouldForceComplete = elapsedMs > timeoutMs && state.status === 'running'
    
    if (shouldForceComplete) {
      ctx.logger.info('CompetitorGet: Timeout reached - forcing completion with available data', {
        creatorId,
        elapsedSeconds: Math.round(elapsedMs / 1000),
        timeoutSeconds: timeoutMs / 1000
      })
    }

    // Safety check: If all platforms are completed but status is still "running", auto-complete
    // Also check if we have profiles/content but status shows pending/running - this means workflows completed
    const allPlatforms = ['instagram', 'facebook', 'youtube'] as const
    
    // Check if we have data but status is stale
    const hasProfiles = profiles.length > 0
    const hasContent = content.length > 0
    const hasPlatformInsights = state.platform_insights && Object.keys(state.platform_insights).length > 0
    
    // If we have data but status shows pending/running, check if platforms actually completed
    const allPlatformsCompleted = allPlatforms.every(platform => 
      state.platform_status?.[platform] === 'completed' || 
      state.platform_status?.[platform] === 'failed'
    )
    
    // Also check: if we have insights for a platform, it must have completed
    const platformsWithInsights = state.platform_insights ? Object.keys(state.platform_insights) : []
    const inferredCompletedPlatforms = new Set<string>()
    platformsWithInsights.forEach(platform => {
      if (allPlatforms.includes(platform as any)) {
        inferredCompletedPlatforms.add(platform)
      }
    })
    
    // If we have profiles/content for a platform, it likely completed
    const platformsWithData = new Set<string>()
    profiles.forEach((p: any) => {
      if (p.platform && allPlatforms.includes(p.platform)) {
        platformsWithData.add(p.platform)
      }
    })
    content.forEach((c: any) => {
      if (c.platform && allPlatforms.includes(c.platform)) {
        platformsWithData.add(c.platform)
      }
    })
    
    // Merge inferred completions - insights are definitive proof
    inferredCompletedPlatforms.forEach(p => platformsWithData.add(p))
    
    // Update platform_status if we have data but status shows pending/running
    let updatedPlatformStatus = { ...(state.platform_status || {
      instagram: 'pending' as const,
      facebook: 'pending' as const,
      youtube: 'pending' as const
    }) }
    let statusUpdated = false
    
    // Force update based on data/insights
    platformsWithData.forEach(platform => {
      const currentStatus = updatedPlatformStatus[platform as Platform]
      if (currentStatus === 'pending' || currentStatus === 'running') {
        updatedPlatformStatus[platform as Platform] = 'completed'
        statusUpdated = true
        ctx.logger.info('CompetitorGet: Inferred platform completion from data', {
          creatorId,
          platform,
          hadStatus: currentStatus,
          reason: 'has_profiles_content_or_insights'
        })
      }
    })
    
    // Also check: if platform has insights, it's definitely completed
    platformsWithInsights.forEach(platform => {
      if (allPlatforms.includes(platform as any)) {
        const currentStatus = updatedPlatformStatus[platform as Platform]
        if (currentStatus !== 'completed' && currentStatus !== 'failed') {
          updatedPlatformStatus[platform as Platform] = 'completed'
          statusUpdated = true
        }
      }
    })
    
    // TIMEOUT: Force complete any platform with data/insights after timeout
    if (shouldForceComplete) {
      allPlatforms.forEach(platform => {
        const hasData = profiles.some((p: any) => p.platform === platform) || 
                       content.some((c: any) => c.platform === platform) ||
                       state.platform_insights?.[platform]
        if (hasData && updatedPlatformStatus[platform] !== 'completed' && updatedPlatformStatus[platform] !== 'failed') {
          updatedPlatformStatus[platform] = 'completed'
          statusUpdated = true
          ctx.logger.info('CompetitorGet: Timeout - forcing platform completion', {
            creatorId,
            platform,
            reason: 'timeout_with_data'
          })
        }
      })
    }
    
    // Check again after updates
    const finalAllCompleted = allPlatforms.every(platform => 
      updatedPlatformStatus[platform] === 'completed' || 
      updatedPlatformStatus[platform] === 'failed'
    )
    
    // Auto-complete if timeout reached OR we have data or all platforms show completed
    if (shouldForceComplete || (finalAllCompleted && state.status === 'running') || statusUpdated || (hasPlatformInsights && state.status === 'running')) {
      const hasAnyData = hasProfiles || hasContent || hasPlatformInsights
      
      ctx.logger.warn('CompetitorGet: Auto-completing workflow', {
        creatorId,
        reason: shouldForceComplete ? 'timeout' : 'data_available',
        elapsedSeconds: shouldForceComplete ? Math.round(elapsedMs / 1000) : undefined,
        originalPlatformStatus: state.platform_status,
        updatedPlatformStatus,
        allPlatformsCompleted: finalAllCompleted,
        hasProfiles,
        hasContent,
        hasPlatformInsights,
        platformsWithData: Array.from(platformsWithData),
        platformsWithInsights,
        hasAnyData
      })
      
      // Determine final status
      let finalStatus: BenchmarkingStatus = 'completed'
      if (shouldForceComplete && !finalAllCompleted) {
        finalStatus = hasAnyData ? 'completed_with_partial_data' : 'completed'
      } else if (finalAllCompleted) {
        finalStatus = Object.values(updatedPlatformStatus).some(s => s === 'completed')
          ? 'completed' 
          : 'completed_with_partial_data'
      } else {
        finalStatus = hasAnyData ? 'completed_with_partial_data' : 'completed'
      }
      
      const updatedState: CompetitorBenchmarkingState = {
        ...state,
        platform_status: updatedPlatformStatus,
        status: finalStatus,
        updated_at: new Date().toISOString()
      }
      
      await ctx.state.set('competitorBenchmarking', creatorId, updatedState)
      
      // Trigger final aggregation if not already done and we have insights
      if (!state.analysis_result && hasPlatformInsights) {
        ctx.logger.info('CompetitorGet: Triggering final aggregation', { creatorId })
        await ctx.emit({
          topic: 'competitor.final.aggregate',
          data: { creatorId }
        })
      }
      
      return {
        status: 200,
        body: {
          success: true,
          state: {
            ...updatedState,
            profiles,
            content
          }
        }
      }
    }

    // TIMEOUT: After 1min30sec, always return available data even if status is running
    if (shouldForceComplete) {
      const hasAnyData = hasProfiles || hasContent || (hasPlatformInsights && Object.keys(state.platform_insights || {}).length > 0)
      if (hasAnyData) {
        const finalState: CompetitorBenchmarkingState = {
          ...state,
          platform_status: updatedPlatformStatus,
          status: finalAllCompleted ? 'completed' : 'completed_with_partial_data',
          updated_at: new Date().toISOString()
        }
        await ctx.state.set('competitorBenchmarking', creatorId, finalState)
        
        ctx.logger.info('CompetitorGet: Timeout - returning available data', {
          creatorId,
          profilesCount: profiles.length,
          contentCount: content.length,
          insightsCount: Object.keys(state.platform_insights || {}).length
        })
        
        return {
          status: 200,
          body: {
            success: true,
            state: {
              ...finalState,
              profiles,
              content
            }
          }
        }
      }
    }

    // WORKAROUND: Generate AI analysis on-the-fly if missing but data exists
    const platforms: Platform[] = ['instagram', 'facebook', 'youtube']
    let updatedPlatformInsights = { ...(state.platform_insights || {}) }
    let insightsGenerated = false

    for (const platform of platforms) {
      const platformProfiles = profiles.filter((p: any) => p.platform === platform)
      const platformContent = content.filter((c: any) => c.platform === platform)
      const hasExistingInsights = !!updatedPlatformInsights[platform]

      // If we have data but no insights, generate them
      if (!hasExistingInsights && platformProfiles.length > 0 && platformContent.length > 0) {
        ctx.logger.info('CompetitorGet: Generating missing AI analysis on-the-fly', {
          creatorId,
          platform,
          profilesCount: platformProfiles.length,
          contentCount: platformContent.length
        })

        try {
          const avgFollowers = platformProfiles.reduce((sum: number, p: any) => sum + (p.follower_count || 0), 0) / platformProfiles.length
          
          // Prepare posts data for AI
          const posts = platformContent.map((c: any) => ({
            likes_count: c.likes_count || 0,
            comments_count: c.comments_count || 0,
            views_count: c.views_count || 0,
            contentType: c.content_type,
            post_type: c.content_type,
            created_at: c.created_at
          }))

          const summaryData = {
            competitorCount: platformProfiles.length,
            totalPosts: platformContent.length,
            avgFollowers,
            posts
          }

          const aiInsights = await generatePlatformAnalysis(platform, summaryData, { logger: ctx.logger })
          
          if (aiInsights) {
            updatedPlatformInsights[platform] = aiInsights
            insightsGenerated = true
            ctx.logger.info('CompetitorGet: Generated AI insights on-the-fly', {
              creatorId,
              platform
            })
          }
        } catch (error) {
          ctx.logger.warn('CompetitorGet: Failed to generate AI insights on-the-fly', {
            creatorId,
            platform,
            error: error instanceof Error ? error.message : String(error)
          })
        }
      }
    }

    // Update state if we generated insights
    if (insightsGenerated) {
      const updatedState: CompetitorBenchmarkingState = {
        ...state,
        platform_insights: updatedPlatformInsights,
        updated_at: new Date().toISOString()
      }
      await ctx.state.set('competitorBenchmarking', creatorId, updatedState)
      ctx.logger.info('CompetitorGet: Updated state with generated insights', { creatorId })
    }

    // Log current status for debugging
    const youtubeProfiles = profiles.filter((p: any) => p.platform === 'youtube')
    const youtubeContent = content.filter((c: any) => c.platform === 'youtube')
    
    ctx.logger.info('CompetitorGet: Returning state', {
      creatorId,
      status: state.status,
      platformStatus: state.platform_status,
      allPlatformsCompleted,
      hasPlatformInsights: {
        instagram: !!updatedPlatformInsights.instagram,
        facebook: !!updatedPlatformInsights.facebook,
        youtube: !!updatedPlatformInsights.youtube
      },
      hasFinalAnalysis: !!state.analysis_result,
      profilesCount: profiles.length,
      contentCount: content.length,
      youtubeProfilesCount: youtubeProfiles.length,
      youtubeContentCount: youtubeContent.length,
      youtubeProfiles: youtubeProfiles.map((p: any) => ({ id: p.id, name: p.name, platform: p.platform })),
      insightsGenerated
    })

    return {
      status: 200,
      body: {
        success: true,
        state: {
          ...state,
          platform_insights: updatedPlatformInsights,
          // Include profiles and content for UI
          profiles,
          content
        }
      }
    }
  } catch (error) {
    ctx.logger.error('CompetitorGet: Failed to fetch state', {
      creatorId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      traceId: ctx.traceId
    })

    return {
      status: 500,
      body: {
        success: false,
        error: 'Failed to fetch competitor benchmarking state'
      }
    }
  }
}
