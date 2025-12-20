import { ExternalLink, Users, Calendar, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

type Platform = 'youtube' | 'instagram' | 'facebook'

type Props = {
  platform: Platform
  profiles: any[]
}

export const PlatformCompetitorProfiles = ({ platform, profiles }: Props) => {
  const platformProfiles = profiles.filter(p => p.platform === platform)

  if (platformProfiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
        <Users className="mb-4 opacity-20" size={48} />
        <p className="text-sm font-medium">No competitor profiles found for {platform}</p>
      </div>
    )
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toLocaleString()
  }

  const getPlatformColors = (platform: Platform) => {
    switch (platform) {
      case 'youtube':
        return {
          bg: 'bg-red-50',
          text: 'text-red-600',
          border: 'border-red-100',
          gradient: 'from-red-500 to-rose-600'
        }
      case 'instagram':
        return {
          bg: 'bg-pink-50',
          text: 'text-pink-600',
          border: 'border-pink-100',
          gradient: 'from-pink-500 to-fuchsia-600'
        }
      case 'facebook':
        return {
          bg: 'bg-blue-50',
          text: 'text-blue-600',
          border: 'border-blue-100',
          gradient: 'from-blue-500 to-indigo-600'
        }
      default:
        return {
          bg: 'bg-slate-50',
          text: 'text-slate-600',
          border: 'border-slate-100',
          gradient: 'from-slate-500 to-slate-600'
        }
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {platformProfiles.map((profile) => {
        const colors = getPlatformColors(platform)
        return (
          <div
            key={profile.profile_id || profile.id}
            className="group relative rounded-3xl border border-slate-100 bg-white p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
          >
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 duration-300 shadow-sm",
                  colors.bg
                )}>
                  <Users className={colors.text} size={24} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 line-clamp-1 mb-1">
                  {profile.name}
                </h3>
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full", colors.bg.replace('bg-', 'bg-').split(' ')[0], colors.text.replace('text-', 'bg-'))} />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {platform} creator
                  </span>
                </div>
              </div>
              <div className="pt-1">
                <div className={cn(
                  "px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-tight",
                  colors.bg, colors.text, colors.border
                )}>
                  {profile.category || "Creator"}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100/50">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mb-1">Followers</div>
                <div className="text-xl font-black text-slate-900">
                  {formatNumber(profile.follower_count || 0)}
                </div>
              </div>
              <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100/50">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mb-1">Engagement</div>
                <div className="text-xl font-black text-indigo-600">
                  {profile.engagement_rate ? `${profile.engagement_rate}%` : "--"}
                </div>
              </div>
            </div>

            {profile.profile_url && (
              <a
                href={profile.profile_url}
                target="_blank"
                rel="noopener noreferrer"
                className="group/btn flex items-center justify-between w-full p-4 rounded-2xl bg-slate-900 text-white font-bold text-sm shadow-lg shadow-slate-900/10 hover:shadow-slate-900/20 active:scale-95 transition-all"
              >
                <span>View Profile</span>
                <ArrowRight size={18} className="transition-transform group-hover/btn:translate-x-1" />
              </a>
            )}

            {/* Subtle Gradient background elements */}
            <div className={cn(
              "absolute -bottom-1 left-4 right-4 h-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r",
              colors.gradient
            )} />
          </div>
        )
      })}
    </div>
  )
}

