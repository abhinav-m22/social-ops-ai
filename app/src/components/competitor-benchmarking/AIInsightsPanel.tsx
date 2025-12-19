"use client"

import { CheckCircle2, XCircle, AlertCircle, Lightbulb, TrendingUp } from "lucide-react"

type Props = {
  analysis: any
}

export const AIInsightsPanel = ({ analysis }: Props) => {
  if (!analysis) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        No AI insights available yet
      </div>
    )
  }

  const summary = analysis.summary || {}
  const recommendations = analysis.recommendations || []
  const contentGaps = analysis.content_gaps || []

  const getPositionColor = (position: string) => {
    switch (position) {
      case 'outperforming':
        return 'text-emerald-700 bg-emerald-50 border-emerald-200'
      case 'competitive':
        return 'text-blue-700 bg-blue-50 border-blue-200'
      case 'underposting':
        return 'text-amber-700 bg-amber-50 border-amber-200'
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-rose-700 bg-rose-50 border-rose-200'
      case 'medium':
        return 'text-amber-700 bg-amber-50 border-amber-200'
      case 'low':
        return 'text-blue-700 bg-blue-50 border-blue-200'
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200'
    }
  }

  return (
    <div className="space-y-6">
      {/* Overall Position */}
      {summary.overall_position && (
        <div className={`rounded-xl border p-4 ${getPositionColor(summary.overall_position)}`}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="text-current" size={18} />
            <span className="font-semibold text-sm uppercase tracking-wide">Overall Position</span>
          </div>
          <div className="text-lg font-bold capitalize">{summary.overall_position.replace('_', ' ')}</div>
        </div>
      )}

      {/* Key Strengths */}
      {summary.key_strengths && summary.key_strengths.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <CheckCircle2 className="text-emerald-600" size={16} />
            Key Strengths
          </h3>
          <ul className="space-y-2">
            {summary.key_strengths.map((strength: any, idx: number) => {
              const strengthText = typeof strength === 'string' ? strength : String(strength)
              return (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-emerald-600 mt-0.5">•</span>
                  <span>{strengthText}</span>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Key Weaknesses */}
      {summary.key_weaknesses && summary.key_weaknesses.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <XCircle className="text-rose-600" size={16} />
            Areas for Improvement
          </h3>
          <ul className="space-y-2">
            {summary.key_weaknesses.map((weakness: any, idx: number) => {
              const weaknessText = typeof weakness === 'string' ? weakness : String(weakness)
              return (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-rose-600 mt-0.5">•</span>
                  <span>{weaknessText}</span>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Content Gaps */}
      {contentGaps.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <AlertCircle className="text-amber-600" size={16} />
            Content Gaps
          </h3>
          <ul className="space-y-2">
            {contentGaps.map((gap: any, idx: number) => {
              // Handle both string and object formats
              const gapText = typeof gap === 'string' 
                ? gap 
                : gap.topic_or_format || gap.reason || gap.content_type || JSON.stringify(gap)
              return (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-amber-600 mt-0.5">•</span>
                  <span>{gapText}</span>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Lightbulb className="text-blue-600" size={16} />
            Top Recommendations
          </h3>
          <div className="space-y-3">
            {recommendations.slice(0, 5).map((rec: any, idx: number) => (
              <div
                key={idx}
                className="rounded-lg border border-gray-200 bg-gray-50 p-3"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-900">{rec.action}</span>
                  {rec.priority && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${getPriorityColor(rec.priority)}`}>
                      {rec.priority}
                    </span>
                  )}
                </div>
                {rec.expected_impact && (
                  <p className="text-xs text-gray-600 mt-1">{rec.expected_impact}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

