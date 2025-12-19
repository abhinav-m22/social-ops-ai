/**
 * TypeScript types for Competitor Benchmarking workflow
 */

export type BenchmarkingStatus = 'idle' | 'running' | 'completed' | 'failed'

export type Platform = 'facebook' | 'youtube' | 'instagram'

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
  title?: string
}

export interface InstagramPost {
  post_id: string
  timestamp: string
  contentType: 'reel' | 'post'
  likeCount: number
  commentCount: number
  playCount?: number // For reels
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

  // AI analysis result
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

