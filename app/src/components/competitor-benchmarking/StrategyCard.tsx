"use client"

import { Calendar, Clock, TrendingUp } from "lucide-react"

type Props = {
  analysis: any
}

export const StrategyCard = ({ analysis }: Props) => {
  if (!analysis || !analysis.optimal_strategy) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        No strategy recommendations available yet
      </div>
    )
  }

  const strategy = analysis.optimal_strategy || {}
  const growth = analysis.growth_projection || {}

  const days = strategy.best_days || []
  const timeWindow = strategy.best_time_window || 'Not specified'

  return (
    <div className="space-y-6">
      {/* Posting Frequency */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="text-emerald-600" size={18} />
          <span className="font-semibold text-sm text-gray-700">Recommended Posting Frequency</span>
        </div>
        <div className="text-2xl font-bold text-gray-900">
          {strategy.posts_per_week || 'N/A'} posts/week
        </div>
      </div>

      {/* Best Days */}
      {days.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="text-blue-600" size={18} />
            <span className="font-semibold text-sm text-gray-700">Best Days to Post</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {days.map((day: string, idx: number) => (
              <span
                key={idx}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-900"
              >
                {day}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Best Time Window */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="text-amber-600" size={18} />
          <span className="font-semibold text-sm text-gray-700">Optimal Time Window</span>
        </div>
        <div className="text-lg font-semibold text-gray-900">{timeWindow}</div>
      </div>

      {/* Growth Projection */}
      {growth && Object.keys(growth).length > 0 && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="text-emerald-700" size={18} />
            <span className="font-semibold text-sm text-emerald-900">Growth Projection</span>
          </div>
          <div className="space-y-2">
            {growth['30_days'] && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-emerald-800">30 days</span>
                <span className="text-sm font-semibold text-emerald-900">{growth['30_days']}</span>
              </div>
            )}
            {growth['60_days'] && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-emerald-800">60 days</span>
                <span className="text-sm font-semibold text-emerald-900">{growth['60_days']}</span>
              </div>
            )}
            {growth['90_days'] && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-emerald-800">90 days</span>
                <span className="text-sm font-semibold text-emerald-900">{growth['90_days']}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

