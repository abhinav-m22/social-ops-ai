"use client"

import { TrendingUp, Eye, Heart, MessageCircle, Calendar, Lightbulb, Target, Zap } from "lucide-react"

type Platform = 'youtube' | 'instagram' | 'facebook'

type Props = {
  platform: Platform
  profiles: any[]
  content: any[]
  aiInsights?: any
}

export const PlatformMetricsSummary = ({ platform, profiles, content, aiInsights }: Props) => {
  const platformProfiles = profiles.filter(p => p.platform === platform)
  const platformContent = content.filter(c => c.platform === platform)

  if (platformProfiles.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        No metrics available for {platform}
      </div>
    )
  }

  // Calculate metrics
  const totalFollowers = platformProfiles.reduce((sum, p) => sum + (p.follower_count || 0), 0)
  const avgFollowers = platformProfiles.length > 0 ? totalFollowers / platformProfiles.length : 0

  const totalLikes = platformContent.reduce((sum, c) => sum + (c.likes_count || 0), 0)
  const avgLikes = platformContent.length > 0 ? totalLikes / platformContent.length : 0

  const totalComments = platformContent.reduce((sum, c) => sum + (c.comments_count || 0), 0)
  const avgComments = platformContent.length > 0 ? totalComments / platformContent.length : 0

  const totalViews = platformContent.reduce((sum, c) => sum + (c.views_count || 0), 0)
  const avgViews = platformContent.length > 0 ? totalViews / platformContent.length : 0

  const totalShares = platformContent.reduce((sum, c) => sum + (c.shares_count || 0), 0)
  const avgShares = platformContent.length > 0 ? totalShares / platformContent.length : 0

  // Calculate posting frequency (posts in last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const recentContent = platformContent.filter(c => 
    c.created_at && new Date(c.created_at) >= thirtyDaysAgo
  )
  const postingFrequency = recentContent.length / 4.33 // per week

  // Find best performing format
  const formatCounts = platformContent.reduce((acc, c) => {
    const type = c.content_type || 'unknown'
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  const bestFormat = Object.entries(formatCounts).sort((a, b) => b[1] - a[1])[0]?.[0]

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toFixed(1)
  }

  const getFormatLabel = (format: string) => {
    switch (format) {
      case 'reel':
        return 'Reels'
      case 'post':
        return 'Posts'
      case 'video':
        return 'Videos'
      case 'short':
        return 'Shorts'
      default:
        return format
    }
  }

  // Extract actionable insights from AI analysis
  const postingStrategy = aiInsights?.posting_strategy
  const bestFormats = aiInsights?.content_insights?.best_formats || []
  const growthOpportunities = aiInsights?.growth_opportunities || []
  const recommendedFrequency = postingStrategy?.recommended_frequency || postingFrequency

  // Calculate engagement rate for insights
  const totalEngagement = totalLikes + totalComments + (avgShares || 0)
  const engagementRate = platformProfiles.length > 0 && totalFollowers > 0
    ? (totalEngagement / (totalFollowers * platformContent.length)) * 100
    : 0

  // Determine posting pattern insight
  const getPostingPatternInsight = () => {
    if (postingFrequency < 2) {
      return "You're posting less than competitors. Consider increasing to 3-5 posts/week for better reach."
    } else if (postingFrequency > 7) {
      return "You're posting more than average. Focus on quality over quantity for better engagement."
    } else {
      return "Your posting frequency aligns with competitors. Maintain consistency for steady growth."
    }
  }

  // Determine format insight
  const getFormatInsight = () => {
    if (bestFormats.length > 0) {
      return `Focus on ${bestFormats[0]} content - it performs best in your niche.`
    } else if (bestFormat) {
      return `${getFormatLabel(bestFormat)} are most common. Try diversifying with other formats.`
    }
    return "Experiment with different content formats to find what resonates."
  }

  return (
    <div className="space-y-4">
      {/* Actionable Insights Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Recommended Posting Strategy */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Target className="text-emerald-600" size={18} />
            <span className="text-sm font-semibold text-emerald-900">Recommended Strategy</span>
          </div>
          <div className="space-y-2">
            <div className="text-lg font-bold text-emerald-900">
              {recommendedFrequency.toFixed(1)} posts/week
            </div>
            {postingStrategy?.best_days && postingStrategy.best_days.length > 0 && (
              <div className="text-sm text-emerald-700">
                Best days: {postingStrategy.best_days.slice(0, 3).join(', ')}
              </div>
            )}
            {postingStrategy?.best_time_window && (
              <div className="text-xs text-emerald-600">
                Optimal time: {postingStrategy.best_time_window}
              </div>
            )}
          </div>
        </div>

        {/* Content Format Insight */}
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="text-blue-600" size={18} />
            <span className="text-sm font-semibold text-blue-900">Content Focus</span>
          </div>
          <div className="text-sm text-blue-800 leading-relaxed">
            {getFormatInsight()}
          </div>
          {bestFormats.length > 1 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {bestFormats.slice(0, 3).map((format: string, idx: number) => (
                <span key={idx} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full capitalize">
                  {format}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Posting Pattern Insight */}
        <div className="rounded-xl border border-purple-200 bg-purple-50 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="text-purple-600" size={18} />
            <span className="text-sm font-semibold text-purple-900">Posting Pattern</span>
          </div>
          <div className="text-sm text-purple-800 leading-relaxed">
            {getPostingPatternInsight()}
          </div>
          <div className="mt-2 text-xs text-purple-600">
            Current: {postingFrequency.toFixed(1)} posts/week
          </div>
        </div>
      </div>

      {/* Growth Opportunities */}
      {growthOpportunities.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="text-amber-600" size={18} />
            <span className="text-sm font-semibold text-amber-900">Growth Opportunities</span>
          </div>
          <ul className="space-y-2">
            {growthOpportunities.slice(0, 3).map((opportunity: string, idx: number) => (
              <li key={idx} className="text-sm text-amber-800 flex items-start gap-2">
                <span className="text-amber-600 mt-0.5">•</span>
                <span>{opportunity}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Quick Stats (Compact) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-lg border border-gray-200 bg-white p-3 text-center">
          <div className="text-xs text-gray-500 mb-1">Competitors</div>
          <div className="text-lg font-bold text-gray-900">{platformProfiles.length}</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-3 text-center">
          <div className="text-xs text-gray-500 mb-1">Content Analyzed</div>
          <div className="text-lg font-bold text-gray-900">{platformContent.length}</div>
        </div>
        {avgViews > 0 && (
          <div className="rounded-lg border border-gray-200 bg-white p-3 text-center">
            <div className="text-xs text-gray-500 mb-1">Avg Views</div>
            <div className="text-lg font-bold text-gray-900">{formatNumber(avgViews)}</div>
          </div>
        )}
        <div className="rounded-lg border border-gray-200 bg-white p-3 text-center">
          <div className="text-xs text-gray-500 mb-1">Engagement Rate</div>
          <div className="text-lg font-bold text-gray-900">{engagementRate.toFixed(1)}%</div>
        </div>
      </div>
    </div>
  )
}

