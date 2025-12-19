/**
 * TypeScript types for Competitor Benchmarking workflow
 */

export type BenchmarkingStatus = 'idle' | 'running' | 'completed' | 'failed'

export type Platform = 'facebook' | 'youtube'

export interface Competitor {
  platform: Platform
  external_id: string
  name: string
  follower_count: number
  metrics?: Record<string, any> // Placeholder for future metrics
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

