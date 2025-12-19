import type { EventConfig, Handlers } from 'motia'
import type { CompetitorBenchmarkingState, PlatformAIInsights } from './types.js'
import { generateCompetitorAnalysis, type AnalysisInput } from '../../lib/competitor-benchmarking/groqAnalysis.js'

export const config: EventConfig = {
  type: 'event',
  name: 'AggregateFinalInsights',
  subscribes: ['competitor.final.aggregate'],
  emits: [],
  description: 'Aggregates all platform insights and generates final cross-platform analysis',
  flows: ['competitor-benchmarking'],
  input: {
    type: 'object',
    properties: {
      creatorId: { type: 'string' }
    },
    required: ['creatorId']
  }
}

export const handler: Handlers['AggregateFinalInsights'] = async (input, ctx) => {
  const { creatorId } = input || {}

  ctx.logger.info('AggregateFinalInsights: Starting final aggregation', {
    creatorId,
    traceId: ctx.traceId
  })

  if (!creatorId) {
    ctx.logger.warn('AggregateFinalInsights: Missing creatorId')
    return
  }

  try {
    // Get current state
    const state = await ctx.state.get(
      'competitorBenchmarking',
      creatorId
    ) as CompetitorBenchmarkingState | null

    if (!state) {
      ctx.logger.error('AggregateFinalInsights: State not found', { creatorId })
      return
    }

    ctx.logger.info('AggregateFinalInsights: Current state', {
      creatorId,
      status: state.status,
      platformStatus: state.platform_status,
      hasInstagramInsights: !!state.platform_insights?.instagram,
      hasFacebookInsights: !!state.platform_insights?.facebook,
      hasYouTubeInsights: !!state.platform_insights?.youtube,
      competitorCount: state.competitors.length
    })

    // Aggregate all platform insights
    const platformInsights: PlatformAIInsights[] = []
    if (state.platform_insights?.instagram) {
      platformInsights.push(state.platform_insights.instagram)
    }
    if (state.platform_insights?.facebook) {
      platformInsights.push(state.platform_insights.facebook)
    }
    if (state.platform_insights?.youtube) {
      platformInsights.push(state.platform_insights.youtube)
    }

    ctx.logger.info('AggregateFinalInsights: Aggregated platform insights', {
      creatorId,
      platformCount: platformInsights.length,
      platforms: platformInsights.map(p => p.platform)
    })

    // Generate final cross-platform analysis if we have insights
    if (platformInsights.length > 0) {
      // Prepare data for final analysis
      const allCompetitors = state.competitors || []
      const creatorMetricsCache = await ctx.state.get('creatorMetricsCache', `metrics-${creatorId}`)
      const rawCreatorMetrics = creatorMetricsCache?.metrics || state.creator_metrics || {}

      const normalizedCreatorMetrics = {
        avg_views: rawCreatorMetrics.avgViews || rawCreatorMetrics.avg_views || 0,
        engagement_rate: rawCreatorMetrics.engagementRate || rawCreatorMetrics.engagement_rate || 0,
        posting_frequency: rawCreatorMetrics.postsLast30Days 
          ? (rawCreatorMetrics.postsLast30Days / 4.33)
          : (rawCreatorMetrics.posting_frequency || 0),
        content_types: rawCreatorMetrics.contentType 
          ? [rawCreatorMetrics.contentType] 
          : (rawCreatorMetrics.content_types || [])
      }

      const analysisInput: AnalysisInput = {
        creatorMetadata: {
          creatorId: state.creatorMetadata.creatorId,
          niche: state.creatorMetadata.niche,
          category: state.creatorMetadata.category,
          platformsConnected: state.creatorMetadata.platformsConnected
        },
        creatorMetrics: normalizedCreatorMetrics,
        competitors: allCompetitors
          .filter(c => c.metrics)
          .map(c => ({
            platform: c.platform,
            name: c.name,
            follower_count: c.follower_count,
            metrics: c.metrics
          }))
      }

      ctx.logger.info('AggregateFinalInsights: Generating final cross-platform analysis', {
        creatorId,
        competitorCount: analysisInput.competitors.length,
        platformInsightsCount: platformInsights.length
      })

      // Generate final analysis
      const finalAnalysis = await generateCompetitorAnalysis(analysisInput, {
        logger: ctx.logger
      })

      if (finalAnalysis) {
        ctx.logger.info('AggregateFinalInsights: Final analysis generated', {
          creatorId,
          overallPosition: finalAnalysis.summary?.overall_position,
          recommendationsCount: finalAnalysis.recommendations?.length || 0,
          fullAnalysis: JSON.stringify(finalAnalysis, null, 2)
        })

        // Update state with final analysis
        const finalState: CompetitorBenchmarkingState = {
          ...state,
          analysis_result: finalAnalysis,
          status: 'completed',
          updated_at: new Date().toISOString()
        }

        await ctx.state.set('competitorBenchmarking', creatorId, finalState)

        ctx.logger.info('AggregateFinalInsights: Final state saved', {
          creatorId,
          status: 'completed',
          hasFinalAnalysis: !!finalState.analysis_result,
          platformInsightsCount: platformInsights.length
        })
      } else {
        ctx.logger.warn('AggregateFinalInsights: Final analysis generation failed, using platform insights only', {
          creatorId
        })

        // Still mark as completed even if final analysis failed
        const finalState: CompetitorBenchmarkingState = {
          ...state,
          status: 'completed',
          updated_at: new Date().toISOString()
        }

        await ctx.state.set('competitorBenchmarking', creatorId, finalState)
      }
    } else {
      ctx.logger.warn('AggregateFinalInsights: No platform insights available', {
        creatorId
      })

      // Mark as completed even without insights
      const finalState: CompetitorBenchmarkingState = {
        ...state,
        status: 'completed',
        updated_at: new Date().toISOString()
      }

      await ctx.state.set('competitorBenchmarking', creatorId, finalState)
    }

    ctx.logger.info('AggregateFinalInsights: Workflow fully completed', {
      creatorId,
      finalStatus: 'completed'
    })

  } catch (error) {
    ctx.logger.error('AggregateFinalInsights: Failed', {
      creatorId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })

    // Still mark as completed to prevent workflow from hanging
    const state = await ctx.state.get(
      'competitorBenchmarking',
      creatorId
    ) as CompetitorBenchmarkingState | null
    if (state) {
      const finalState: CompetitorBenchmarkingState = {
        ...state,
        status: 'completed',
        updated_at: new Date().toISOString()
      }
      await ctx.state.set('competitorBenchmarking', creatorId, finalState)
    }
  }
}

