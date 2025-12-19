import type { EventConfig, Handlers } from 'motia'
import type { CompetitorBenchmarkingState, Competitor } from './types'

export const config: EventConfig = {
  type: 'event',
  name: 'FetchCompetitorContent',
  subscribes: ['competitor.content.fetch'],
  emits: ['competitor.metrics.calculate'],
  description: 'Fetches content and engagement data for discovered competitors',
  flows: ['competitor-benchmarking'],
  input: {
    type: 'object',
    properties: {
      creatorId: { type: 'string' },
      competitors: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            platform: { type: 'string' },
            external_id: { type: 'string' },
            name: { type: 'string' },
            follower_count: { type: 'number' }
          }
        }
      }
    },
    required: ['creatorId']
  }
}

export const handler: Handlers['FetchCompetitorContent'] = async (input, ctx) => {
  const { creatorId, competitors = [] } = input || {}

  ctx.logger.info('FetchCompetitorContent: Starting content fetch', {
    creatorId,
    competitorCount: competitors.length,
    traceId: ctx.traceId
  })

  if (!creatorId) {
    ctx.logger.warn('FetchCompetitorContent: Missing creatorId')
    return
  }

  try {
    // Get current state
    const state = await ctx.state.get<CompetitorBenchmarkingState>(
      'competitorBenchmarking',
      creatorId
    )

    if (!state) {
      ctx.logger.error('FetchCompetitorContent: State not found', { creatorId })
      return
    }

    // TODO: Implement competitor content fetching logic
    // This should:
    // 1. For each competitor, fetch recent posts/videos from their platform
    // 2. Fetch engagement metrics (likes, comments, shares, views)
    // 3. Store content and metrics in competitor.metrics field
    // 4. Handle rate limiting and API errors gracefully

    ctx.logger.info('FetchCompetitorContent: TODO - Implement content fetching', {
      creatorId,
      competitorCount: competitors.length,
      platforms: competitors.map(c => c.platform)
    })

    // Placeholder: Update competitors with empty metrics
    const updatedCompetitors: Competitor[] = competitors.map(competitor => ({
      ...competitor,
      metrics: {}
    }))

    // Update state with fetched content
    const updatedState: CompetitorBenchmarkingState = {
      ...state,
      competitors: updatedCompetitors,
      updated_at: new Date().toISOString()
    }

    await ctx.state.set('competitorBenchmarking', creatorId, updatedState)

    // Emit event to calculate metrics
    await ctx.emit({
      topic: 'competitor.metrics.calculate',
      data: {
        creatorId
      }
    })

    ctx.logger.info('FetchCompetitorContent: Content fetch completed', {
      creatorId,
      competitorCount: updatedCompetitors.length
    })
  } catch (error) {
    ctx.logger.error('FetchCompetitorContent: Failed', {
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

