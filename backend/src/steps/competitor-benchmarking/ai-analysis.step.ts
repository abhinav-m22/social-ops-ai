import type { EventConfig, Handlers } from 'motia'
import type { CompetitorBenchmarkingState } from './types'
import { generateCompetitorAnalysis, type AnalysisInput } from '../../lib/competitor-benchmarking/groqAnalysis'

export const config: EventConfig = {
  type: 'event',
  name: 'AIAnalysis',
  subscribes: ['competitor.ai.analyze'],
  emits: ['competitor.notify.creator'],
  description: 'Performs AI analysis on competitor benchmarking data to generate insights',
  flows: ['competitor-benchmarking'],
  input: {
    type: 'object',
    properties: {
      creatorId: { type: 'string' }
    },
    required: ['creatorId']
  }
}

export const handler: Handlers['AIAnalysis'] = async (input, ctx) => {
  const { creatorId } = input || {}

  ctx.logger.info('AIAnalysis: Starting AI analysis', {
    creatorId,
    traceId: ctx.traceId
  })

  if (!creatorId) {
    ctx.logger.warn('AIAnalysis: Missing creatorId')
    return
  }

  try {
    // Get current state
    const state = await ctx.state.get<CompetitorBenchmarkingState>(
      'competitorBenchmarking',
      creatorId
    )

    if (!state) {
      ctx.logger.error('AIAnalysis: State not found', { creatorId })
      return
    }

    // Check if we have enough data for analysis
    if (state.competitors.length === 0) {
      ctx.logger.warn('AIAnalysis: No competitors found, skipping analysis', {
        creatorId
      })
      // Still emit to continue workflow
      await ctx.emit({
        topic: 'competitor.notify.creator',
        data: { creatorId }
      })
      return
    }

    // Prepare input for AI analysis
    // Map creator metrics from cache format to analysis format
    const creatorMetricsCache = await ctx.state.get('creatorMetricsCache', `metrics-${creatorId}`)
    const rawCreatorMetrics = creatorMetricsCache?.metrics || state.creator_metrics || {}
    
    // Normalize creator metrics to match expected format
    const normalizedCreatorMetrics = {
      avg_views: rawCreatorMetrics.avgViews || rawCreatorMetrics.avg_views || 0,
      engagement_rate: rawCreatorMetrics.engagementRate || rawCreatorMetrics.engagement_rate || 0,
      posting_frequency: rawCreatorMetrics.postsLast30Days 
        ? (rawCreatorMetrics.postsLast30Days / 4.33) // Convert posts in 30 days to per week
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
      competitors: state.competitors
        .filter(c => c.metrics) // Only include competitors with calculated metrics
        .map(c => ({
          platform: c.platform,
          name: c.name,
          follower_count: c.follower_count,
          metrics: c.metrics
        }))
    }

    ctx.logger.info('AIAnalysis: Normalized creator metrics', {
      creatorId,
      avgViews: normalizedCreatorMetrics.avg_views,
      engagementRate: normalizedCreatorMetrics.engagement_rate,
      postingFrequency: normalizedCreatorMetrics.posting_frequency
    })

    ctx.logger.info('AIAnalysis: Prepared analysis input', {
      creatorId,
      competitorCount: analysisInput.competitors.length,
      hasCreatorMetrics: !!analysisInput.creatorMetrics,
      niche: analysisInput.creatorMetadata.niche
    })

    // Generate AI analysis
    const analysisResult = await generateCompetitorAnalysis(analysisInput, {
      logger: ctx.logger
    })

    // Log the parsed AI analysis result
    if (analysisResult) {
      ctx.logger.info('AIAnalysis: AI analysis result received', {
        creatorId,
        overallPosition: analysisResult.summary?.overall_position,
        keyStrengths: analysisResult.summary?.key_strengths?.length || 0,
        keyWeaknesses: analysisResult.summary?.key_weaknesses?.length || 0,
        recommendationsCount: analysisResult.recommendations?.length || 0,
        contentGapsCount: analysisResult.content_gaps?.length || 0,
        postingFrequencyGap: analysisResult.comparisons?.posting_frequency_gap_percent,
        engagementRateDelta: analysisResult.comparisons?.engagement_rate_delta_percent,
        avgViewsDelta: analysisResult.comparisons?.avg_views_delta_percent,
        fullResult: JSON.stringify(analysisResult, null, 2)
      })
    }

    if (!analysisResult) {
      ctx.logger.warn('AIAnalysis: Failed to generate analysis, using fallback', {
        creatorId
      })
      
      // Fallback: Create a basic analysis structure
      const fallbackResult = {
        summary: {
          overall_position: 'competitive' as const,
          key_strengths: ['Analysis pending - insufficient data'],
          key_weaknesses: ['Analysis pending - insufficient data']
        },
        comparisons: {
          posting_frequency_gap_percent: 0,
          engagement_rate_delta_percent: 0,
          avg_views_delta_percent: 0
        },
        content_gaps: [],
        recommendations: [
          {
            action: 'Gather more competitor data for accurate analysis',
            expected_impact: 'Better insights and recommendations',
            priority: 'medium' as const
          }
        ],
        optimal_strategy: {
          posts_per_week: 3,
          best_days: ['Monday', 'Wednesday', 'Friday'],
          best_time_window: '9 AM - 11 AM'
        },
        growth_projection: {
          '30_days': 'Insufficient data for projection',
          '60_days': 'Insufficient data for projection',
          '90_days': 'Insufficient data for projection'
        }
      }

      const updatedState: CompetitorBenchmarkingState = {
        ...state,
        analysis_result: fallbackResult,
        updated_at: new Date().toISOString()
      }

      await ctx.state.set('competitorBenchmarking', creatorId, updatedState)

      await ctx.emit({
        topic: 'competitor.notify.creator',
        data: { creatorId }
      })

      ctx.logger.info('AIAnalysis: Fallback analysis stored', {
        creatorId
      })
      return
    }

    // Update state with AI analysis
    const updatedState: CompetitorBenchmarkingState = {
      ...state,
      analysis_result: analysisResult,
      updated_at: new Date().toISOString()
    }

    await ctx.state.set('competitorBenchmarking', creatorId, updatedState)

    ctx.logger.info('AIAnalysis: AI analysis completed and stored', {
      creatorId,
      overallPosition: analysisResult.summary.overall_position,
      recommendationsCount: analysisResult.recommendations.length,
      contentGapsCount: analysisResult.content_gaps.length
    })

    // Emit event to notify creator
    await ctx.emit({
      topic: 'competitor.notify.creator',
      data: {
        creatorId
      }
    })

    ctx.logger.info('AIAnalysis: Workflow continued to notification step', {
      creatorId
    })
  } catch (error) {
    ctx.logger.error('AIAnalysis: Failed', {
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

