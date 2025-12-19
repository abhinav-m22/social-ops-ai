/**
 * TypeScript types for Competitor Benchmarking workflow
 */

export type BenchmarkingStatus = 'idle' | 'running' | 'completed' | 'failed' | 'completed_with_partial_data'

export type Platform = 'facebook' | 'youtube' | 'instagram'

export type PlatformStatus = 'pending' | 'running' | 'completed' | 'failed'

// Post-level content with URLs for UI
export interface FacebookPost {
  post_id: string
  content_id: string // Unique identifier
  content_url: string // URL to the post
  created_time: string
  created_at: string // ISO timestamp
  post_type: 'photo' | 'video' | 'link' | 'status'
  likes_count: number
  comments_count: number
  shares_count: number
  views_count?: number // If available
}

export interface YouTubeVideo {
  video_id: string
  content_id: string // Same as video_id
  content_url: string // URL to the video
  published_at: string
  created_at: string // ISO timestamp
  duration?: string
  view_count: number
  like_count: number
  comment_count: number
  title?: string
}

export interface InstagramPost {
  post_id: string
  content_id: string // Unique identifier
  content_url: string // URL to the post/reel
  timestamp: string
  created_at: string // ISO timestamp
  contentType: 'reel' | 'post'
  likeCount: number
  commentCount: number
  playCount?: number // For reels
  views_count?: number // For reels
  caption?: string
  hashtags?: string[]
}

export interface CompetitorContent {
  platform: Platform
  external_id: string
  facebook_posts?: FacebookPost[]
  youtube_videos?: YouTubeVideo[]
  instagram_posts?: InstagramPost[]
}

// Persisted competitor profile
export interface CompetitorProfile {
  id: string // Unique ID: platform-external_id
  platform: Platform
  external_id: string
  name: string
  profile_url: string
  follower_count: number
  category?: string
  fetched_at: string
  created_at: string
  updated_at: string
}

// Persisted competitor content item
export interface CompetitorContentItem {
  id: string // Unique ID: platform-competitor_id-content_id
  platform: Platform
  competitor_id: string // References CompetitorProfile.id
  content_id: string
  content_type: 'reel' | 'post' | 'video' | 'short'
  content_url: string
  created_at: string
  // Platform-specific metrics (normalized)
  likes_count: number
  comments_count: number
  views_count?: number
  shares_count?: number // FB only
  duration?: string // YT/Reels
  // Raw metrics (platform-specific)
  raw_metrics: Record<string, any>
}

export interface CompetitorMetrics {
  avg_views: number
  avg_likes: number
  avg_comments: number
  engagement_rate: number
  posting_frequency: number // posts/videos per week
  best_performing_content_type?: string
  peak_posting_days?: number[]
}

export interface Competitor {
  platform: Platform
  external_id: string
  name: string
  follower_count: number
  metrics?: CompetitorMetrics
  content?: CompetitorContent
}

export interface CreatorMetadata {
  creatorId: string
  niche?: string
  category?: string
  platformsConnected?: Platform[]
}

// Platform-specific AI insights
export interface PlatformAIInsights {
  platform: Platform
  summary: {
    positioning: string
    strengths: string[]
    weaknesses: string[]
  }
  content_insights: {
    best_formats: string[]
    underused_formats: string[]
    top_topics: string[]
  }
  posting_strategy: {
    recommended_frequency: number
    best_days: string[]
    best_time_window: string
  }
  growth_opportunities: string[]
  generated_at: string
}

export interface CompetitorBenchmarkingState {
  // Creator metadata
  creatorMetadata: CreatorMetadata

  // Competitors list (for backward compatibility)
  competitors: Competitor[]

  // Platform-wise status tracking
  platform_status: {
    instagram: PlatformStatus
    facebook: PlatformStatus
    youtube: PlatformStatus
  }

  // Platform-wise AI insights
  platform_insights: {
    instagram?: PlatformAIInsights
    facebook?: PlatformAIInsights
    youtube?: PlatformAIInsights
  }

  // Creator metrics (placeholder)
  creator_metrics?: Record<string, any>

  // Legacy AI analysis result (deprecated, use platform_insights)
  analysis_result?: {
    summary: {
      overall_position: 'underposting' | 'competitive' | 'outperforming'
      key_strengths: string[]
      key_weaknesses: string[]
    }
    comparisons: {
      posting_frequency_gap_percent: number
      engagement_rate_delta_percent: number
      avg_views_delta_percent: number
    }
    content_gaps: Array<{
      topic_or_format: string
      observed_in_competitors_count: number
      reason: string
    }>
    recommendations: Array<{
      action: string
      expected_impact: string
      priority: 'high' | 'medium' | 'low'
    }>
    optimal_strategy: {
      posts_per_week: number
      best_days: string[]
      best_time_window: string
    }
    growth_projection: {
      '30_days': string
      '60_days': string
      '90_days': string
    }
  }

  // Workflow status
  status: BenchmarkingStatus

  // Timestamps
  last_run_at?: string
  created_at: string
  updated_at: string
}

