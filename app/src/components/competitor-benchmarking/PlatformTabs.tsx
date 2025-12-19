"use client"

import { useState } from "react"
import { Youtube, Instagram, Facebook } from "lucide-react"

type Platform = 'youtube' | 'instagram' | 'facebook'

type Props = {
  activePlatform: Platform
  onPlatformChange: (platform: Platform) => void
  platformStatus?: {
    youtube?: 'pending' | 'running' | 'completed' | 'failed'
    instagram?: 'pending' | 'running' | 'completed' | 'failed'
    facebook?: 'pending' | 'running' | 'completed' | 'failed'
  }
}

export const PlatformTabs = ({ activePlatform, onPlatformChange, platformStatus }: Props) => {
  const platforms: { id: Platform; label: string; icon: any }[] = [
    { id: 'youtube', label: 'YouTube', icon: Youtube },
    { id: 'instagram', label: 'Instagram', icon: Instagram },
    { id: 'facebook', label: 'Facebook', icon: Facebook },
  ]

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200'
      case 'running':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'failed':
        return 'bg-rose-100 text-rose-700 border-rose-200'
      default:
        return 'bg-gray-100 text-gray-500 border-gray-200'
    }
  }

  return (
    <div className="flex gap-2 border-b border-gray-200">
      {platforms.map((platform) => {
        const Icon = platform.icon
        const status = platformStatus?.[platform.id]
        const isActive = activePlatform === platform.id
        
        return (
          <button
            key={platform.id}
            onClick={() => onPlatformChange(platform.id)}
            className={`
              relative px-6 py-3 text-sm font-medium transition-all
              border-b-2 -mb-[1px]
              ${isActive 
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50' 
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }
            `}
          >
            <div className="flex items-center gap-2">
              <Icon size={18} />
              <span>{platform.label}</span>
              {status && (
                <span className={`
                  ml-2 px-2 py-0.5 text-xs font-medium rounded-full border
                  ${getStatusColor(status)}
                `}>
                  {status === 'completed' ? '✓' : status === 'running' ? '⟳' : status === 'failed' ? '✗' : '○'}
                </span>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}

