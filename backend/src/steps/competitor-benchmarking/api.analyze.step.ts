import type { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import type { CompetitorBenchmarkingState, BenchmarkingStatus } from './types'

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'CompetitorAnalyze',
  path: '/competitor/analyze',
  method: 'POST',
  description: 'Triggers competitor benchmarking workflow for a creator',
  emits: ['competitor.discover'],
  flows: ['competitor-benchmarking'],
  bodySchema: z.object({
    creatorId: z.string().min(1, 'creatorId is required')
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
  const { creatorId } = req.body || {}

  ctx.logger.info('CompetitorAnalyze: Request received', {
    creatorId,
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

      // If workflow is already running, return 409 Conflict
      if (status === 'running') {
        ctx.logger.warn('CompetitorAnalyze: Workflow already running', {
          creatorId,
          status,
          last_run_at: existingState.last_run_at
        })

        return {
          status: 409,
          body: {
            success: false,
            error: 'A benchmarking workflow is already in progress for this creator',
            status: status as BenchmarkingStatus
          }
        }
      }

      // If workflow completed or failed, we can start a new one
      ctx.logger.info('CompetitorAnalyze: Previous run found, starting new workflow', {
        creatorId,
        previousStatus: status,
        previousRunAt: existingState.last_run_at
      })
    }

    // Fetch creator profile to get niche if available
    const creatorProfile = await ctx.state.get('creatorProfiles', creatorId)
    const profileNiche = creatorProfile ? ((creatorProfile as any).niche || (creatorProfile as any).category) : undefined
    
    // Initialize or update state to 'running'
    const now = new Date().toISOString()
    const initialState: CompetitorBenchmarkingState = {
      creatorMetadata: {
        creatorId,
        niche: profileNiche || 'tech',
        category: undefined,
        platformsConnected: undefined
      },
      competitors: [],
      status: 'running',
      last_run_at: now,
      created_at: existingState?.created_at || now,
      updated_at: now
    }

    await ctx.state.set('competitorBenchmarking', creatorId, initialState)

    // Emit event to start the workflow
    await ctx.emit({
      topic: 'competitor.discover',
      data: {
        creatorId
      }
    })

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

