import type { EventConfig, Handlers } from 'motia'
import type { CompetitorBenchmarkingState, Competitor } from './types'

export const config: EventConfig = {
  type: 'event',
  name: 'DiscoverCompetitors',
  subscribes: ['competitor.discover'],
  emits: ['competitor.content.fetch'],
  description: 'Discovers competitors for a creator based on niche/category',
  flows: ['competitor-benchmarking'],
  input: {
    type: 'object',
    properties: {
      creatorId: { type: 'string' }
    },
    required: ['creatorId']
  }
}

export const handler: Handlers['DiscoverCompetitors'] = async (input, ctx) => {
  const { creatorId } = input || {}

  ctx.logger.info('DiscoverCompetitors: Starting competitor discovery', {
    creatorId,
    traceId: ctx.traceId
  })

  if (!creatorId) {
    ctx.logger.warn('DiscoverCompetitors: Missing creatorId')
    return
  }

  try {
    // Get current state
    const state = await ctx.state.get<CompetitorBenchmarkingState>(
      'competitorBenchmarking',
      creatorId
    )

    if (!state) {
      ctx.logger.error('DiscoverCompetitors: State not found', { creatorId })
      // Update state to failed
      const failedState: CompetitorBenchmarkingState = {
        creatorMetadata: { creatorId },
        competitors: [],
        status: 'failed',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      await ctx.state.set('competitorBenchmarking', creatorId, failedState)
      return
    }

    // TODO: Implement competitor discovery logic
    // This should:
    // 1. Fetch creator profile to get niche/category/platforms
    // 2. Search for competitors on connected platforms (Facebook, YouTube)
    // 3. Identify competitors based on niche, follower count range, etc.
    // 4. Store discovered competitors in state

    ctx.logger.info('DiscoverCompetitors: TODO - Implement competitor discovery', {
      creatorId,
      niche: state.creatorMetadata.niche,
      platforms: state.creatorMetadata.platformsConnected
    })

    // Placeholder: Empty competitors list for now
    const competitors: Competitor[] = []

    // Update state with discovered competitors
    const updatedState: CompetitorBenchmarkingState = {
      ...state,
      competitors,
      updated_at: new Date().toISOString()
    }

    await ctx.state.set('competitorBenchmarking', creatorId, updatedState)

    // Emit event to fetch competitor content
    await ctx.emit({
      topic: 'competitor.content.fetch',
      data: {
        creatorId,
        competitors
      }
    })

    ctx.logger.info('DiscoverCompetitors: Competitor discovery completed', {
      creatorId,
      competitorCount: competitors.length
    })
  } catch (error) {
    ctx.logger.error('DiscoverCompetitors: Failed', {
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

