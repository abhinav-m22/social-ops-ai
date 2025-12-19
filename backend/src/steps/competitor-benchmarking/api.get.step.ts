import type { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import type { CompetitorBenchmarkingState } from './types.js'

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
    const state = await ctx.state.get<CompetitorBenchmarkingState>(
      'competitorBenchmarking',
      creatorId
    )

    if (!state) {
      return {
        status: 404,
        body: {
          success: false,
          error: 'No benchmarking data found for this creator'
        }
      }
    }

    return {
      status: 200,
      body: {
        success: true,
        state
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
