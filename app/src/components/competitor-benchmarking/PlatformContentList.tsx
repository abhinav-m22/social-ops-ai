import { ExternalLink, Heart, MessageCircle, Eye, Share2, Calendar, ChevronDown, ChevronUp, PlayCircle, Image as ImageIcon } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

type Platform = 'youtube' | 'instagram' | 'facebook'

type Props = {
  platform: Platform
  content: any[]
  profiles: any[]
}

export const PlatformContentList = ({ platform, content, profiles }: Props) => {
  const [expandedCompetitors, setExpandedCompetitors] = useState<Record<string, boolean>>({})

  const toggleCompetitor = (id: string) => {
    setExpandedCompetitors(prev => ({ ...prev, [id]: !prev[id] }))
  }

  // Filter content by platform
  const platformContent = content.filter(c => c.platform === platform)

  // Group content by competitor
  const contentByCompetitor = platformContent.reduce((acc, item) => {
    const competitorId = item.competitor_profile_id || item.competitor_id || item.profile_id || 'unknown'
    if (!acc[competitorId]) {
      acc[competitorId] = []
    }
    acc[competitorId].push(item)
    return acc
  }, {} as Record<string, any[]>)

  // Sort content by date (newest first)
  Object.keys(contentByCompetitor).forEach(competitorId => {
    contentByCompetitor[competitorId].sort((a: any, b: any) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  })

  if (Object.keys(contentByCompetitor).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
        <PlayCircle className="mb-4 opacity-20" size={48} />
        <p className="text-sm font-medium">No content found for {platform}</p>
      </div>
    )
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toLocaleString()
  }

  const getContentTypeInfo = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'reel':
      case 'short':
        return { label: 'Short Form', color: 'text-pink-600 bg-pink-50 border-pink-100', icon: <PlayCircle size={12} /> }
      case 'video':
        return { label: 'Long Form', color: 'text-red-600 bg-red-50 border-red-100', icon: <PlayCircle size={12} /> }
      case 'post':
        return { label: 'Static Post', color: 'text-indigo-600 bg-indigo-50 border-indigo-100', icon: <ImageIcon size={12} /> }
      default:
        return { label: type || 'Content', color: 'text-slate-600 bg-slate-50 border-slate-100', icon: null }
    }
  }

  const getProfileName = (competitorId: string) => {
    const profile = profiles.find(p =>
      p.profile_id === competitorId ||
      p.id === competitorId ||
      p.competitor_id === competitorId ||
      (p.platform === platform && p.external_id === competitorId)
    )
    return profile?.name || 'Unknown'
  }

  return (
    <div className="space-y-4">
      {Object.entries(contentByCompetitor).map(([competitorId, items]: [string, any]) => {
        const profileName = getProfileName(competitorId)
        const isExpanded = expandedCompetitors[competitorId] || false
        const displayItems = isExpanded ? items : items.slice(0, 3)

        return (
          <div key={competitorId} className="group rounded-3xl border border-slate-100 bg-white overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
            <button
              onClick={() => toggleCompetitor(competitorId)}
              className="w-full px-6 py-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold">
                  {profileName.charAt(0)}
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-slate-900">{profileName}</h3>
                  <p className="text-xs font-medium text-slate-400">
                    {(items as any[]).length} recent {(items as any[]).length === 1 ? 'post' : 'posts'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                  {isExpanded ? 'Collapse' : 'Expand'}
                </span>
                {isExpanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
              </div>
            </button>

            <div className={cn(
              "p-2 space-y-2",
              isExpanded ? "block" : "hidden md:block"
            )}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {displayItems.map((item: any) => {
                  const info = getContentTypeInfo(item.content_type)
                  return (
                    <div key={item.content_id || item.id} className="relative flex flex-col p-4 rounded-2xl border border-slate-50 bg-slate-50/30 hover:bg-white hover:border-slate-200 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                      <div className="flex items-center justify-between mb-3">
                        <div className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-tight",
                          info.color
                        )}>
                          {info.icon}
                          {info.label}
                        </div>
                        {item.created_at && (
                          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase tracking-tighter">
                            <Calendar size={10} />
                            {new Date(item.created_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      <div className="flex-1 space-y-2 mb-4">
                        {item.title && (
                          <h4 className="text-sm font-bold text-slate-900 line-clamp-1">
                            {item.title}
                          </h4>
                        )}
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                          {item.caption || "No caption provided"}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100/50">
                        <div className="flex items-center gap-3">
                          {item.likes_count !== undefined && (
                            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-600">
                              <Heart size={12} className="text-rose-500" fill="currentColor" />
                              <span>{formatNumber(item.likes_count)}</span>
                            </div>
                          )}
                          {item.views_count !== undefined && (
                            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-600">
                              <PlayCircle size={12} className="text-cyan-500" />
                              <span>{formatNumber(item.views_count)}</span>
                            </div>
                          )}
                        </div>
                        {item.content_url && (
                          <a
                            href={item.content_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-white border border-slate-100 text-slate-400 hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm"
                          >
                            <ExternalLink size={14} />
                          </a>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
              {!isExpanded && items.length > 3 && (
                <button
                  onClick={() => toggleCompetitor(competitorId)}
                  className="w-full py-2 text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-widest"
                >
                  +{items.length - 3} more posts
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

