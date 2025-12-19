"use client"

import { CheckCircle2, XCircle, Lightbulb, TrendingUp, Calendar, Clock } from "lucide-react"

type Props = {
  insights: any
  platform: 'youtube' | 'instagram' | 'facebook'
}

export const PlatformAIInsights = ({ insights, platform }: Props) => {
  if (!insights) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        No AI insights available for {platform} yet
      </div>
    )
  }

  const summary = insights.summary || {}
  const contentInsights = insights.content_insights || {}
  const postingStrategy = insights.posting_strategy || {}
  const growthOpportunities = insights.growth_opportunities || []

  return (
    <div className="space-y-6">
      {/* Positioning Summary */}
      {summary.positioning && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="text-emerald-600" size={18} />
            <span className="font-semibold text-sm text-gray-700">Positioning</span>
          </div>
          <p className="text-sm text-gray-700">{summary.positioning}</p>
        </div>
      )}

      {/* Strengths */}
      {summary.strengths && summary.strengths.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <CheckCircle2 className="text-emerald-600" size={16} />
            Strengths
          </h3>
          <ul className="space-y-2">
            {summary.strengths.map((strength: string, idx: number) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-emerald-600 mt-0.5">•</span>
                <span>{strength}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Weaknesses */}
      {summary.weaknesses && summary.weaknesses.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <XCircle className="text-rose-600" size={16} />
            Areas for Improvement
          </h3>
          <ul className="space-y-2">
            {summary.weaknesses.map((weakness: string, idx: number) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-rose-600 mt-0.5">•</span>
                <span>{weakness}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Content Insights */}
      {(contentInsights.best_formats?.length > 0 || contentInsights.top_topics?.length > 0) && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Lightbulb className="text-amber-600" size={16} />
            Content Insights
          </h3>
          <div className="space-y-3">
            {contentInsights.best_formats?.length > 0 && (
              <div>
                <span className="text-xs font-medium text-gray-600">Best Formats:</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {contentInsights.best_formats.map((format: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full"
                    >
                      {format}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {contentInsights.top_topics?.length > 0 && (
              <div>
                <span className="text-xs font-medium text-gray-600">Top Topics:</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {contentInsights.top_topics.map((topic: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200 rounded-full"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Posting Strategy */}
      {postingStrategy.recommended_frequency !== undefined && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Calendar className="text-purple-600" size={16} />
            Posting Strategy
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Recommended Frequency</span>
              <span className="text-sm font-semibold text-gray-900">
                {postingStrategy.recommended_frequency} posts/week
              </span>
            </div>
            {postingStrategy.best_days?.length > 0 && (
              <div>
                <span className="text-xs text-gray-600">Best Days:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {postingStrategy.best_days.map((day: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200 rounded"
                    >
                      {day}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {postingStrategy.best_time_window && (
              <div className="flex items-center gap-2 mt-2">
                <Clock size={14} className="text-gray-500" />
                <span className="text-xs text-gray-600">
                  Best Time: {postingStrategy.best_time_window}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Growth Opportunities */}
      {growthOpportunities.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Lightbulb className="text-blue-600" size={16} />
            Growth Opportunities
          </h3>
          <ul className="space-y-2">
            {growthOpportunities.map((opportunity: string, idx: number) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>{opportunity}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

