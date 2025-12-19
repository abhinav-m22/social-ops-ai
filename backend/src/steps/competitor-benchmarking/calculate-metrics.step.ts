import type { EventConfig, Handlers } from 'motia'
import type { CompetitorBenchmarkingState } from './types'

export const config: EventConfig = {
  type: 'event',
  name: 'CalculateMetrics',
  subscribes: ['competitor.metrics.calculate'],
  emits: ['competitor.ai.analyze'],
  description: 'Calculates comparative metrics between creator and competitors',
  flows: ['competitor-benchmarking'],
  input: {
    type: 'object',
    properties: {
      creatorId: { type: 'string' }
    },
    required: ['creatorId']
  }
}

export const handler: Handlers['CalculateMetrics'] = async (input, ctx) => {
  const { creatorId } = input || {}

  ctx.logger.info('CalculateMetrics: Starting metrics calculation', {
    creatorId,
    traceId: ctx.traceId
  })

  if (!creatorId) {
    ctx.logger.warn('CalculateMetrics: Missing creatorId')
    return
  }

  try {
    // Get current state
    const state = await ctx.state.get<CompetitorBenchmarkingState>(
      'competitorBenchmarking',
      creatorId
    )

    if (!state) {
      ctx.logger.error('CalculateMetrics: State not found', { creatorId })
      return
    }

    // TODO: Implement metrics calculation logic
    // This should:
    // 1. Fetch creator's own metrics (from existing metrics cache or calculate fresh)
    // 2. Compare creator metrics with competitor metrics
    // 3. Calculate:
    //    - Engagement rate comparisons
    //    - Growth rate comparisons
    //    - Content frequency comparisons
    //    - Audience overlap (if available)
    // 4. Store calculated metrics in state.creator_metrics

    ctx.logger.info('CalculateMetrics: TODO - Implement metrics calculation', {
      creatorId,
      competitorCount: state.competitors.length
    })

    // Placeholder: Empty creator metrics for now
    const creatorMetrics = {}

    // Update state with calculated metrics
    const updatedState: CompetitorBenchmarkingState = {
      ...state,
      creator_metrics: creatorMetrics,
      updated_at: new Date().toISOString()
    }

    await ctx.state.set('competitorBenchmarking', creatorId, updatedState)

    // Emit event for AI analysis
    await ctx.emit({
      topic: 'competitor.ai.analyze',
      data: {
        creatorId
      }
    })

    ctx.logger.info('CalculateMetrics: Metrics calculation completed', {
      creatorId
    })
  } catch (error) {
    ctx.logger.error('CalculateMetrics: Failed', {
      creatorId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })

    // Update state to failed
    const state = await ctx.state.get<CompetitorBenchmarkingState>(
      'competitorBenchmarking',
      creatorId
    )
    if (state) {
      const failedState: CompetitorBenchmarkingState = {
        ...state,
        status: 'failed',
        updated_at: new Date().toISOString()
      }
      await ctx.state.set('competitorBenchmarking', creatorId, failedState)
    }
  }
}

