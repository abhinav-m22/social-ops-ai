import type { EventConfig, Handlers } from 'motia'
import type { CompetitorBenchmarkingState, BenchmarkingStatus, Platform } from './types.js'

export const config: EventConfig = {
  type: 'event',
  name: 'OrchestratePlatforms',
  subscribes: ['competitor.platform.completed'],
  emits: ['competitor.notify.creator'],
  description: 'Orchestrates platform workflows and tracks completion status',
  flows: ['competitor-benchmarking'],
  input: {
    type: 'object',
    properties: {
      creatorId: { type: 'string' },
      platform: { type: 'string' },
      success: { type: 'boolean' }
    },
    required: ['creatorId', 'platform', 'success']
  }
}

export const handler: Handlers['OrchestratePlatforms'] = async (input, ctx) => {
  const { creatorId, platform, success } = input || {}

  ctx.logger.info('OrchestratePlatforms: Platform completed', {
    creatorId,
    platform,
    success,
    traceId: ctx.traceId
  })

  if (!creatorId || !platform) {
    ctx.logger.warn('OrchestratePlatforms: Missing required data')
    return
  }

  try {
    // Read state fresh each time to avoid race conditions
    // Use a small retry loop to handle concurrent updates
    let state: CompetitorBenchmarkingState | null = null
    let retries = 3
    while (retries > 0 && !state) {
      state = await ctx.state.get(
        'competitorBenchmarking',
        creatorId
      ) as CompetitorBenchmarkingState | null
      if (!state && retries > 1) {
        await new Promise(resolve => setTimeout(resolve, 100)) // Small delay
      }
      retries--
    }

    if (!state) {
      ctx.logger.error('OrchestratePlatforms: State not found after retries', { creatorId })
      return
    }

    ctx.logger.info('OrchestratePlatforms: Current state before update', {
      creatorId,
      platform,
      currentStatus: state.platform_status,
      overallStatus: state.status
    })

    // Ensure platform_status exists (defensive check)
    const currentPlatformStatus = state.platform_status || {
      instagram: 'pending' as const,
      facebook: 'pending' as const,
      youtube: 'pending' as const
    }

    // Update platform status
    const updatedPlatformStatus = {
      ...currentPlatformStatus,
      [platform as Platform]: success ? 'completed' : 'failed'
    }

    ctx.logger.info('OrchestratePlatforms: Platform status after update', {
      creatorId,
      platform,
      newStatus: updatedPlatformStatus[platform as Platform],
      allPlatformsStatus: updatedPlatformStatus
    })

    // Check if all platforms are done
    const allPlatforms = ['instagram', 'facebook', 'youtube'] as Platform[]
    const completedPlatforms = allPlatforms.filter(p => 
      updatedPlatformStatus[p] === 'completed' || updatedPlatformStatus[p] === 'failed'
    )
    const allCompleted = completedPlatforms.length === allPlatforms.length
    const hasFailures = allPlatforms.some(p => updatedPlatformStatus[p] === 'failed')
    const hasSuccesses = allPlatforms.some(p => updatedPlatformStatus[p] === 'completed')

    // Determine overall status
    let overallStatus: BenchmarkingStatus = 'running'
    if (allCompleted) {
      if (hasSuccesses && !hasFailures) {
        overallStatus = 'completed'
      } else if (hasSuccesses && hasFailures) {
        overallStatus = 'completed_with_partial_data'
      } else {
        overallStatus = 'failed'
      }
    }

    const updatedState: CompetitorBenchmarkingState = {
      ...state,
      platform_status: updatedPlatformStatus,
      status: overallStatus,
      updated_at: new Date().toISOString()
    }

    await ctx.state.set('competitorBenchmarking', creatorId, updatedState)

    ctx.logger.info('OrchestratePlatforms: Updated status', {
      creatorId,
      platform,
      overallStatus,
      completedPlatforms: completedPlatforms.length,
      totalPlatforms: allPlatforms.length,
      allCompleted,
      platformStatus: updatedPlatformStatus,
      allPlatformsStatus: {
        instagram: updatedPlatformStatus.instagram,
        facebook: updatedPlatformStatus.facebook,
        youtube: updatedPlatformStatus.youtube
      },
      completedPlatformsList: completedPlatforms
    })

    // If all platforms are done, emit notification
    if (allCompleted) {
      ctx.logger.info('OrchestratePlatforms: ALL PLATFORMS COMPLETED - Emitting notification', {
        creatorId,
        overallStatus,
        platformStatus: updatedPlatformStatus,
        completedPlatforms: completedPlatforms.length
      })

      await ctx.emit({
        topic: 'competitor.notify.creator',
        data: { creatorId }
      })

      ctx.logger.info('OrchestratePlatforms: Notification event emitted - workflow should complete', {
        creatorId,
        overallStatus,
        platformStatus: updatedPlatformStatus
      })
    } else {
      ctx.logger.info('OrchestratePlatforms: Waiting for more platforms', {
        creatorId,
        completed: completedPlatforms.length,
        total: allPlatforms.length,
        missing: allPlatforms.filter(p => 
          updatedPlatformStatus[p] !== 'completed' && updatedPlatformStatus[p] !== 'failed'
        )
      })
    }

  } catch (error) {
    ctx.logger.error('OrchestratePlatforms: Failed', {
      creatorId,
      platform,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
  }
}

