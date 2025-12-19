"use client"

import { ExternalLink, Heart, MessageCircle, Eye, Share2, Calendar } from "lucide-react"
import { useState } from "react"

type Platform = 'youtube' | 'instagram' | 'facebook'

type Props = {
  platform: Platform
  content: any[]
  profiles: any[]
}

export const PlatformContentList = ({ platform, content, profiles }: Props) => {
  const [expandedCompetitor, setExpandedCompetitor] = useState<string | null>(null)

  // Filter content by platform
  const platformContent = content.filter(c => c.platform === platform)

  // Group content by competitor
  const contentByCompetitor = platformContent.reduce((acc, item) => {
    // Try multiple possible field names for competitor ID
    const competitorId = item.competitor_profile_id || item.competitor_id || item.profile_id || 'unknown'
    if (!acc[competitorId]) {
      acc[competitorId] = []
    }
    acc[competitorId].push(item)
    return acc
  }, {} as Record<string, any[]>)

  // Sort content by date (newest first)
  Object.keys(contentByCompetitor).forEach(competitorId => {
    contentByCompetitor[competitorId].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  })

  if (Object.keys(contentByCompetitor).length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-sm">No content found for {platform}</p>
      </div>
    )
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toLocaleString()
  }

  const getContentTypeLabel = (type: string) => {
    switch (type) {
      case 'reel':
        return 'Reel'
      case 'post':
        return 'Post'
      case 'video':
        return 'Video'
      case 'short':
        return 'Short'
      default:
        return type
    }
  }

  const getContentTypeColor = (type: string) => {
    switch (type) {
      case 'reel':
        return 'bg-pink-100 text-pink-700 border-pink-200'
      case 'post':
        return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'video':
        return 'bg-red-100 text-red-700 border-red-200'
      case 'short':
        return 'bg-orange-100 text-orange-700 border-orange-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getProfileName = (competitorId: string) => {
    // Try multiple possible field names for matching
    const profile = profiles.find(p => 
      p.profile_id === competitorId || 
      p.id === competitorId ||
      p.competitor_id === competitorId ||
      (p.platform === platform && p.external_id === competitorId)
    )
    return profile?.name || 'Unknown'
  }

  return (
    <div className="space-y-6">
      {Object.entries(contentByCompetitor).map(([competitorId, items]) => {
        const profileName = getProfileName(competitorId)
        const isExpanded = expandedCompetitor === competitorId
        const displayItems = isExpanded ? items : items.slice(0, 5)

        return (
          <div key={competitorId} className="border border-gray-200 rounded-xl bg-white overflow-hidden">
            <button
              onClick={() => setExpandedCompetitor(isExpanded ? null : competitorId)}
              className="w-full px-5 py-4 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-gray-900">{profileName}</h3>
                <span className="text-sm text-gray-500">
                  {items.length} {items.length === 1 ? 'item' : 'items'}
                </span>
              </div>
              <span className="text-sm text-gray-600">
                {isExpanded ? 'Show Less' : `Show All (${items.length})`}
              </span>
            </button>

            <div className="divide-y divide-gray-100">
              {displayItems.map((item) => (
                <div key={item.content_id || item.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`
                          px-2 py-0.5 text-xs font-medium rounded-full border
                          ${getContentTypeColor(item.content_type)}
                        `}>
                          {getContentTypeLabel(item.content_type)}
                        </span>
                        {item.created_at && (
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Calendar size={12} />
                            {new Date(item.created_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      {item.title && (
                        <p className="text-sm font-medium text-gray-900 mb-2 line-clamp-2">
                          {item.title}
                        </p>
                      )}

                      {item.caption && (
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                          {item.caption}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mt-3">
                        {item.likes_count !== undefined && (
                          <div className="flex items-center gap-1">
                            <Heart size={14} className="text-rose-500" />
                            <span>{formatNumber(item.likes_count)}</span>
                          </div>
                        )}
                        {item.comments_count !== undefined && (
                          <div className="flex items-center gap-1">
                            <MessageCircle size={14} className="text-blue-500" />
                            <span>{formatNumber(item.comments_count)}</span>
                          </div>
                        )}
                        {item.views_count !== undefined && (
                          <div className="flex items-center gap-1">
                            <Eye size={14} className="text-emerald-500" />
                            <span>{formatNumber(item.views_count)}</span>
                          </div>
                        )}
                        {item.shares_count !== undefined && (
                          <div className="flex items-center gap-1">
                            <Share2 size={14} className="text-purple-500" />
                            <span>{formatNumber(item.shares_count)}</span>
                          </div>
                        )}
                        {item.duration && (
                          <span className="text-xs text-gray-500">
                            {item.duration}
                          </span>
                        )}
                      </div>
                    </div>

                    {item.content_url && (
                      <a
                        href={item.content_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-200 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        <ExternalLink size={12} />
                        View
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

