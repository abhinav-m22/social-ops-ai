import type { EventConfig, Handlers } from 'motia'
import type { CompetitorBenchmarkingState, Competitor } from './types.js'

export const config: EventConfig = {
  type: 'event',
  name: 'AggregateCompetitors',
  subscribes: ['competitor.instagram.found', 'competitor.facebook.found', 'competitor.youtube.found'],
  emits: ['competitor.content.fetch'],
  description: 'Aggregates competitors found by parallel platform discovery',
  flows: ['competitor-benchmarking'],
  input: {
    type: 'object',
    properties: {
      creatorId: { type: 'string' },
      platform: { type: 'string' },
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
    required: ['creatorId', 'platform']
  }
}

export const handler: Handlers['AggregateCompetitors'] = async (input, ctx) => {
  const { creatorId, platform, competitors = [] } = input || {}

  ctx.logger.info('AggregateCompetitors: Received competitors from platform', {
    creatorId,
    platform,
    competitorCount: competitors.length,
    traceId: ctx.traceId
  })

  if (!creatorId) {
    ctx.logger.warn('AggregateCompetitors: Missing creatorId')
    return
  }

  try {
    // Get current state
    const state = await ctx.state.get<CompetitorBenchmarkingState>(
      'competitorBenchmarking',
      creatorId
    )

    if (!state) {
      ctx.logger.error('AggregateCompetitors: State not found', { creatorId })
      return
    }

    // Add competitors from this platform to the state
    const updatedCompetitors = [...state.competitors]

    // Filter out duplicates (by platform + external_id)
    const existingKeys = new Set(updatedCompetitors.map(c => `${c.platform}:${c.external_id}`))
    const newCompetitors = (competitors as Competitor[]).filter(c =>
      !existingKeys.has(`${c.platform}:${c.external_id}`)
    )

    updatedCompetitors.push(...newCompetitors)

    // Update state
    const updatedState: CompetitorBenchmarkingState = {
      ...state,
      competitors: updatedCompetitors,
      updated_at: new Date().toISOString()
    }

    await ctx.state.set('competitorBenchmarking', creatorId, updatedState)

    ctx.logger.info('AggregateCompetitors: Updated state with new competitors', {
      creatorId,
      platform,
      newCompetitors: newCompetitors.length,
      totalCompetitors: updatedCompetitors.length,
      platforms: {
        instagram: updatedCompetitors.filter(c => c.platform === 'instagram').length,
        facebook: updatedCompetitors.filter(c => c.platform === 'facebook').length,
        youtube: updatedCompetitors.filter(c => c.platform === 'youtube').length
      }
    })

    // Check if we have results from all platforms (or enough time has passed)
    // For now, we'll emit content fetch after each platform completes
    // In a more sophisticated setup, we could wait for all platforms
    await ctx.emit({
      topic: 'competitor.content.fetch',
      data: {
        creatorId,
        competitors: updatedCompetitors
      }
    })

    ctx.logger.info('AggregateCompetitors: Emitted content fetch event', {
      creatorId,
      totalCompetitors: updatedCompetitors.length
    })

  } catch (error) {
    ctx.logger.error('AggregateCompetitors: Failed to aggregate competitors', {
      creatorId,
      platform,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
  }
}

