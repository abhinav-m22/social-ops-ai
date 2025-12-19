import type { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import type { CompetitorBenchmarkingState, BenchmarkingStatus } from './types'

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'CompetitorAnalyze',
  path: '/competitor/analyze',
  method: 'POST',
  description: 'Triggers competitor benchmarking workflow for a creator',
  emits: ['competitor.platform.instagram', 'competitor.platform.facebook', 'competitor.platform.youtube'],
  flows: ['competitor-benchmarking'],
  bodySchema: z.object({
    creatorId: z.string().min(1, 'creatorId is required'),
    force: z.boolean().optional().describe('Force restart even if workflow is running')
  }),
  responseSchema: {
    200: z.object({
      success: z.boolean(),
      message: z.string(),
      workflowId: z.string().optional()
    }),
    409: z.object({
      success: z.boolean(),
      error: z.string(),
      status: z.enum(['running', 'completed', 'failed'])
    }),
    400: z.object({
      success: z.boolean(),
      error: z.string()
    }),
    500: z.object({
      success: z.boolean(),
      error: z.string(),
      details: z.string().optional()
    })
  }
}

export const handler: Handlers['CompetitorAnalyze'] = async (req, ctx) => {
  const { creatorId, force } = req.body || {}

  ctx.logger.info('CompetitorAnalyze: Request received', {
    creatorId,
    force,
    traceId: ctx.traceId
  })

  // Validate input
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
    // Check if a benchmarking run is already in progress for this creator
    const existingState = await ctx.state.get<CompetitorBenchmarkingState>(
      'competitorBenchmarking',
      creatorId
    )

    if (existingState) {
      const status = existingState.status

      // If workflow is already running and force is not set, return 409 Conflict
      if (status === 'running' && !force) {
        ctx.logger.warn('CompetitorAnalyze: Workflow already running', {
          creatorId,
          status,
          last_run_at: existingState.last_run_at
        })

        return {
          status: 409,
          body: {
            success: false,
            error: 'A benchmarking workflow is already in progress for this creator. Use force: true to restart.',
            status: status === 'running' ? 'running' : status === 'completed' ? 'completed' : 'failed'
          }
        }
      }

      // If force is true and workflow is running, cancel it
      if (status === 'running' && force) {
        ctx.logger.info('CompetitorAnalyze: Force restart requested, canceling existing workflow', {
          creatorId,
          previousRunAt: existingState.last_run_at
        })
      }

      // If workflow completed or failed, we can start a new one
      if (status !== 'running') {
        ctx.logger.info('CompetitorAnalyze: Previous run found, starting new workflow', {
          creatorId,
          previousStatus: status,
          previousRunAt: existingState.last_run_at
        })
      }
    }

    // Fetch creator profile to get niche if available
    const creatorProfile = await ctx.state.get('creatorProfiles', creatorId)
    const profileNiche = creatorProfile ? ((creatorProfile as any).niche || (creatorProfile as any).category) : 'tech'
    const creatorSubscribers = creatorProfile?.socials?.find((s: any) => s.platform === 'youtube')?.followers || 1

    ctx.logger.info('CompetitorAnalyze: Creator profile data', {
      creatorId,
      hasProfile: !!creatorProfile,
      profileNiche,
      creatorSubscribers,
      profileData: creatorProfile ? JSON.stringify(creatorProfile, null, 2) : 'no profile'
    })

    // Initialize or update state to 'running'
    const now = new Date().toISOString()
    const initialState: CompetitorBenchmarkingState = {
      creatorMetadata: {
        creatorId,
        niche: profileNiche,
        category: undefined,
        platformsConnected: undefined
      },
      competitors: [],
      platform_status: {
        instagram: 'pending',
        facebook: 'pending',
        youtube: 'pending'
      },
      platform_insights: {},
      status: 'running',
      last_run_at: now,
      created_at: existingState?.created_at || now,
      updated_at: now
    }

    await ctx.state.set('competitorBenchmarking', creatorId, initialState)

    // Emit parallel platform workflow events (NOT discovery events)
    const emitData = {
      instagram: { creatorId, niche: profileNiche },
      facebook: { creatorId, niche: profileNiche },
      youtube: { creatorId, niche: profileNiche, creatorSubscribers }
    }

    ctx.logger.info('CompetitorAnalyze: Emitting parallel platform workflow events', {
      emitData: JSON.stringify(emitData, null, 2)
    })

    // Trigger platform workflows in parallel
    await Promise.all([
      ctx.emit({
        topic: 'competitor.platform.instagram',
        data: emitData.instagram
      }),
      ctx.emit({
        topic: 'competitor.platform.facebook',
        data: emitData.facebook
      }),
      ctx.emit({
        topic: 'competitor.platform.youtube',
        data: emitData.youtube
      })
    ])

    ctx.logger.info('CompetitorAnalyze: Workflow started', {
      creatorId,
      workflowId: creatorId
    })

    return {
      status: 200,
      body: {
        success: true,
        message: 'Competitor benchmarking workflow started',
        workflowId: creatorId
      }
    }
  } catch (error) {
    ctx.logger.error('CompetitorAnalyze: Failed to start workflow', {
      creatorId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      traceId: ctx.traceId
    })

    return {
      status: 500,
      body: {
        success: false,
        error: 'Failed to start competitor benchmarking workflow',
        details: error instanceof Error ? error.message : String(error)
      }
    }
  }
}

