import type { EventConfig, Handlers } from 'motia'
import type { CompetitorBenchmarkingState } from './types.js'

export const config: EventConfig = {
  type: 'event',
  name: 'NotifyCreator',
  subscribes: ['competitor.notify.creator'],
  emits: ['competitor.final.aggregate'],
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

export const handler = async (input: any, ctx: any) => {
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
    const state = await ctx.state.get(
      'competitorBenchmarking',
      creatorId
    ) as CompetitorBenchmarkingState | null

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

    ctx.logger.info('NotifyCreator: Triggering final aggregation', {
      creatorId,
      hasPlatformInsights: {
        instagram: !!state.platform_insights?.instagram,
        facebook: !!state.platform_insights?.facebook,
        youtube: !!state.platform_insights?.youtube
      },
      competitorCount: state.competitors.length,
      platformStatus: state.platform_status
    })

    // Emit event to aggregate final insights
    await ctx.emit({
      topic: 'competitor.final.aggregate',
      data: { creatorId }
    })

    ctx.logger.info('NotifyCreator: Final aggregation triggered', {
      creatorId
    })
  } catch (error) {
    ctx.logger.error('NotifyCreator: Failed', {
      creatorId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })

    // Update state to failed
    const state = await ctx.state.get(
      'competitorBenchmarking',
      creatorId
    ) as CompetitorBenchmarkingState | null
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

