import type { EventConfig, Handlers } from 'motia'
import type { CompetitorBenchmarkingState } from './types'

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

    // TODO: Implement AI analysis logic
    // This should:
    // 1. Prepare context with:
    //    - Creator metrics
    //    - Competitor metrics
    //    - Comparative analysis
    // 2. Call AI service (e.g., Groq) to generate:
    //    - Key insights about performance gaps
    //    - Actionable recommendations
    //    - Summary of findings
    // 3. Store analysis result in state.analysis_result

    ctx.logger.info('AIAnalysis: TODO - Implement AI analysis', {
      creatorId,
      competitorCount: state.competitors.length,
      hasCreatorMetrics: !!state.creator_metrics
    })

    // Placeholder: Empty analysis result for now
    const analysisResult = {
      insights: [],
      recommendations: [],
      summary: ''
    }

    // Update state with AI analysis
    const updatedState: CompetitorBenchmarkingState = {
      ...state,
      analysis_result: analysisResult,
      updated_at: new Date().toISOString()
    }

    await ctx.state.set('competitorBenchmarking', creatorId, updatedState)

    // Emit event to notify creator
    await ctx.emit({
      topic: 'competitor.notify.creator',
      data: {
        creatorId
      }
    })

    ctx.logger.info('AIAnalysis: AI analysis completed', {
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

