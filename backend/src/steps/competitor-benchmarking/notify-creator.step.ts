import type { EventConfig, Handlers } from 'motia'
import type { CompetitorBenchmarkingState } from './types'

export const config: EventConfig = {
  type: 'event',
  name: 'NotifyCreator',
  subscribes: ['competitor.notify.creator'],
  emits: [],
  description: 'Notifies creator that competitor benchmarking analysis is complete',
  flows: ['competitor-benchmarking'],
  input: {
    type: 'object',
    properties: {
      creatorId: { type: 'string' }
    },
    required: ['creatorId']
  }
}

export const handler: Handlers['NotifyCreator'] = async (input, ctx) => {
  const { creatorId } = input || {}

  ctx.logger.info('NotifyCreator: Starting notification', {
    creatorId,
    traceId: ctx.traceId
  })

  if (!creatorId) {
    ctx.logger.warn('NotifyCreator: Missing creatorId')
    return
  }

  try {
    // Get current state
    const state = await ctx.state.get<CompetitorBenchmarkingState>(
      'competitorBenchmarking',
      creatorId
    )

    if (!state) {
      ctx.logger.error('NotifyCreator: State not found', { creatorId })
      return
    }

    // TODO: Implement notification logic
    // This should:
    // 1. Prepare notification payload with:
    //    - Summary of analysis
    //    - Key insights
    //    - Recommendations
    // 2. Send notification via:
    //    - In-app notification system
    //    - Email (optional)
    //    - Push notification (if configured)
    // 3. Log notification sent

    ctx.logger.info('NotifyCreator: TODO - Implement notification', {
      creatorId,
      hasAnalysis: !!state.analysis_result,
      competitorCount: state.competitors.length
    })

    // Update state to completed
    const completedState: CompetitorBenchmarkingState = {
      ...state,
      status: 'completed',
      updated_at: new Date().toISOString()
    }

    await ctx.state.set('competitorBenchmarking', creatorId, completedState)

    ctx.logger.info('NotifyCreator: Workflow completed successfully', {
      creatorId,
      status: 'completed',
      last_run_at: completedState.last_run_at
    })
  } catch (error) {
    ctx.logger.error('NotifyCreator: Failed', {
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

