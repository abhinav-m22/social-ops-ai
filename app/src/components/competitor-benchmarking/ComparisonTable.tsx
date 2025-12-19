"use client"

import { TrendingUp, TrendingDown, Minus } from "lucide-react"

type Props = {
  state: any
}

export const ComparisonTable = ({ state }: Props) => {
  const competitors = state?.competitors || []
  const creatorMetrics = state?.creator_metrics || {}
  const creatorMetadata = state?.creatorMetadata || {}

  // Get creator's metrics for comparison
  const creatorRow = {
    name: "You",
    platform: creatorMetadata.platformsConnected?.[0] || "N/A",
    followers: creatorMetrics.followers || creatorMetrics.subscribers || 0,
    avgViews: creatorMetrics.avgViews || creatorMetrics.avg_views || 0,
    engagementRate: creatorMetrics.engagementRate || creatorMetrics.engagement_rate || 0,
    postingFrequency: creatorMetrics.postingFrequency || creatorMetrics.posting_frequency || 0,
    isCreator: true
  }

  const allRows = [creatorRow, ...competitors.map((c: any) => ({
    name: c.name,
    platform: c.platform === 'facebook' ? 'Facebook' : 'YouTube',
    followers: c.follower_count || 0,
    avgViews: c.metrics?.avg_views || 0,
    engagementRate: c.metrics?.engagement_rate || 0,
    postingFrequency: c.metrics?.posting_frequency || 0,
    isCreator: false
  }))]

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toLocaleString()
  }

  const formatPercent = (num: number) => {
    return `${num.toFixed(2)}%`
  }

  const getComparisonIcon = (value: number, creatorValue: number) => {
    if (value > creatorValue * 1.1) return <TrendingDown className="text-rose-500" size={16} />
    if (value < creatorValue * 0.9) return <TrendingUp className="text-emerald-500" size={16} />
    return <Minus className="text-gray-400" size={16} />
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Name</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Platform</th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Followers</th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Avg Views</th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Engagement</th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Posts/Week</th>
          </tr>
        </thead>
        <tbody>
          {allRows.map((row, idx) => (
            <tr
              key={idx}
              className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                row.isCreator ? 'bg-emerald-50/50' : ''
              }`}
            >
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  {row.isCreator && (
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      YOU
                    </span>
                  )}
                  <span className={`font-medium ${row.isCreator ? 'text-emerald-900' : 'text-gray-900'}`}>
                    {row.name}
                  </span>
                </div>
              </td>
              <td className="py-3 px-4 text-sm text-gray-600">{row.platform}</td>
              <td className="py-3 px-4 text-right">
                <div className="flex items-center justify-end gap-1">
                  {!row.isCreator && getComparisonIcon(row.followers, creatorRow.followers)}
                  <span className="text-sm font-medium text-gray-900">{formatNumber(row.followers)}</span>
                </div>
              </td>
              <td className="py-3 px-4 text-right">
                <div className="flex items-center justify-end gap-1">
                  {!row.isCreator && getComparisonIcon(row.avgViews, creatorRow.avgViews)}
                  <span className="text-sm font-medium text-gray-900">{formatNumber(row.avgViews)}</span>
                </div>
              </td>
              <td className="py-3 px-4 text-right">
                <div className="flex items-center justify-end gap-1">
                  {!row.isCreator && getComparisonIcon(row.engagementRate, creatorRow.engagementRate)}
                  <span className="text-sm font-medium text-gray-900">{formatPercent(row.engagementRate)}</span>
                </div>
              </td>
              <td className="py-3 px-4 text-right">
                <div className="flex items-center justify-end gap-1">
                  {!row.isCreator && getComparisonIcon(row.postingFrequency, creatorRow.postingFrequency)}
                  <span className="text-sm font-medium text-gray-900">{row.postingFrequency.toFixed(1)}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {allRows.length === 0 && (
        <div className="text-center py-8 text-gray-500 text-sm">No competitor data available</div>
      )}
    </div>
  )
}

