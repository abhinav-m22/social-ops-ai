"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts"

type Props = {
  state: any
}

export const MetricsCharts = ({ state }: Props) => {
  const competitors = state?.competitors || []
  const creatorMetrics = state?.creator_metrics || {}
  const creatorMetadata = state?.creatorMetadata || {}

  // Prepare data for charts
  const avgViewsData = [
    {
      name: "You",
      views: creatorMetrics.avgViews || creatorMetrics.avg_views || 0,
      isCreator: true
    },
    ...competitors
      .filter((c: any) => c.metrics?.avg_views)
      .map((c: any) => ({
        name: c.name.length > 15 ? c.name.substring(0, 15) + "..." : c.name,
        views: c.metrics.avg_views,
        isCreator: false
      }))
  ]

  const postingFrequencyData = [
    {
      name: "You",
      frequency: creatorMetrics.postingFrequency || creatorMetrics.posting_frequency || 0,
      isCreator: true
    },
    ...competitors
      .filter((c: any) => c.metrics?.posting_frequency)
      .map((c: any) => ({
        name: c.name.length > 15 ? c.name.substring(0, 15) + "..." : c.name,
        frequency: c.metrics.posting_frequency,
        isCreator: false
      }))
  ]

  const engagementData = [
    {
      name: "You",
      engagement: creatorMetrics.engagementRate || creatorMetrics.engagement_rate || 0,
      isCreator: true
    },
    ...competitors
      .filter((c: any) => c.metrics?.engagement_rate)
      .map((c: any) => ({
        name: c.name.length > 15 ? c.name.substring(0, 15) + "..." : c.name,
        engagement: c.metrics.engagement_rate,
        isCreator: false
      }))
  ]

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toLocaleString()
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Average Views Bar Chart */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">Average Views</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={avgViewsData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: "#6B7280" }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis tick={{ fontSize: 12, fill: "#6B7280" }} />
            <Tooltip
              formatter={(value: number) => formatNumber(value)}
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #E5E7EB",
                borderRadius: "8px",
                padding: "8px"
              }}
            />
            <Bar
              dataKey="views"
              fill="#10B981"
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Posting Frequency Line Chart */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">Posting Frequency (per week)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={postingFrequencyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: "#6B7280" }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis tick={{ fontSize: 12, fill: "#6B7280" }} />
            <Tooltip
              formatter={(value: number) => `${value.toFixed(1)} posts/week`}
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #E5E7EB",
                borderRadius: "8px",
                padding: "8px"
              }}
            />
            <Line
              type="monotone"
              dataKey="frequency"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={{ fill: "#3B82F6", r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Engagement Rate Bar Chart */}
      <div className="space-y-3 md:col-span-2">
        <h3 className="text-sm font-semibold text-gray-700">Engagement Rate</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={engagementData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: "#6B7280" }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis tick={{ fontSize: 12, fill: "#6B7280" }} />
            <Tooltip
              formatter={(value: number) => `${value.toFixed(2)}%`}
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #E5E7EB",
                borderRadius: "8px",
                padding: "8px"
              }}
            />
            <Bar
              dataKey="engagement"
              fill="#F59E0B"
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

