/**
 * TypeScript types for Competitor Benchmarking workflow
 */

export type BenchmarkingStatus = 'idle' | 'running' | 'completed' | 'failed'

export type Platform = 'facebook' | 'youtube'

export interface FacebookPost {
  post_id: string
  created_time: string
  post_type: 'photo' | 'video' | 'link' | 'status'
  likes_count: number
  comments_count: number
  shares_count: number
}

export interface YouTubeVideo {
  video_id: string
  published_at: string
  duration?: string
  view_count: number
  like_count: number
  comment_count: number
}

export interface CompetitorContent {
  platform: Platform
  external_id: string
  facebook_posts?: FacebookPost[]
  youtube_videos?: YouTubeVideo[]
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

export interface CompetitorBenchmarkingState {
  // Creator metadata
  creatorMetadata: CreatorMetadata

  // Competitors list
  competitors: Competitor[]

  // Creator metrics (placeholder)
  creator_metrics?: Record<string, any>

  // AI analysis result (placeholder)
  analysis_result?: {
    insights?: string[]
    recommendations?: string[]
    summary?: string
    [key: string]: any
  }

  // Workflow status
  status: BenchmarkingStatus

  // Timestamps
  last_run_at?: string
  created_at: string
  updated_at: string
}

