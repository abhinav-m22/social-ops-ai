"use client"

import { ExternalLink, Users, Calendar } from "lucide-react"

type Platform = 'youtube' | 'instagram' | 'facebook'

type Props = {
  platform: Platform
  profiles: any[]
}

export const PlatformCompetitorProfiles = ({ platform, profiles }: Props) => {
  const platformProfiles = profiles.filter(p => p.platform === platform)

  if (platformProfiles.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Users className="mx-auto mb-3 text-gray-400" size={32} />
        <p className="text-sm">No competitor profiles found for {platform}</p>
      </div>
    )
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toLocaleString()
  }

  const getPlatformBadgeColor = (platform: Platform) => {
    switch (platform) {
      case 'youtube':
        return 'bg-red-100 text-red-700 border-red-200'
      case 'instagram':
        return 'bg-pink-100 text-pink-700 border-pink-200'
      case 'facebook':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getPlatformLabel = (platform: Platform) => {
    switch (platform) {
      case 'youtube':
        return 'YouTube'
      case 'instagram':
        return 'Instagram'
      case 'facebook':
        return 'Facebook'
      default:
        return platform
    }
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {platformProfiles.map((profile) => (
        <div
          key={profile.profile_id || profile.id}
          className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">
                {profile.name}
              </h3>
              <span className={`
                inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border
                ${getPlatformBadgeColor(platform)}
              `}>
                {getPlatformLabel(platform)}
              </span>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Followers</span>
              <span className="font-semibold text-gray-900">
                {formatNumber(profile.follower_count || 0)}
              </span>
            </div>
            {profile.category && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Category</span>
                <span className="font-medium text-gray-700 capitalize">
                  {profile.category}
                </span>
              </div>
            )}
            {profile.fetched_at && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Calendar size={12} />
                <span>
                  Fetched {new Date(profile.fetched_at).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>

          {profile.profile_url && (
            <a
              href={profile.profile_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 w-full justify-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ExternalLink size={14} />
              View Profile
            </a>
          )}
        </div>
      ))}
    </div>
  )
}

