/**
 * Helper functions for persisting competitor profiles and content
 */

import type { CompetitorProfile, CompetitorContentItem, Platform, FacebookPost, InstagramPost, YouTubeVideo } from './types.js'

/**
 * Generate unique ID for competitor profile
 */
export function getProfileId(platform: Platform, externalId: string): string {
  return `${platform}-${externalId}`
}

/**
 * Generate unique ID for content item
 */
export function getContentId(platform: Platform, competitorId: string, contentId: string): string {
  return `${platform}-${competitorId}-${contentId}`
}

/**
 * Persist competitor profile
 */
export async function persistCompetitorProfile(
  state: any,
  platform: Platform,
  externalId: string,
  name: string,
  profileUrl: string,
  followerCount: number,
  category?: string
): Promise<string> {
  const profileId = getProfileId(platform, externalId)
  const now = new Date().toISOString()

  const profile: CompetitorProfile = {
    id: profileId,
    platform,
    external_id: externalId,
    name,
    profile_url: profileUrl,
    follower_count: followerCount,
    category,
    fetched_at: now,
    created_at: now,
    updated_at: now
  }

  // Check if profile exists
  const existing = await state.get('competitorProfiles', profileId)
  if (existing) {
    // Update existing profile
    profile.created_at = existing.created_at
    profile.updated_at = now
  }

  await state.set('competitorProfiles', profileId, profile)
  return profileId
}

/**
 * Persist content item
 */
export async function persistContentItem(
  state: any,
  platform: Platform,
  competitorId: string,
  contentId: string,
  contentType: 'reel' | 'post' | 'video' | 'short',
  contentUrl: string,
  createdAt: string,
  metrics: {
    likes_count: number
    comments_count: number
    views_count?: number
    shares_count?: number
    duration?: string
  },
  rawMetrics: Record<string, any>
): Promise<void> {
  const itemId = getContentId(platform, competitorId, contentId)
  const now = new Date().toISOString()

  const contentItem: CompetitorContentItem = {
    id: itemId,
    platform,
    competitor_id: competitorId,
    content_id: contentId,
    content_type: contentType,
    content_url: contentUrl,
    created_at: createdAt,
    likes_count: metrics.likes_count,
    comments_count: metrics.comments_count,
    views_count: metrics.views_count,
    shares_count: metrics.shares_count,
    duration: metrics.duration,
    raw_metrics: rawMetrics
  }

  // Check if content exists (idempotency)
  const existing = await state.get('competitorContent', itemId)
  if (existing) {
    // Update existing content
    contentItem.created_at = existing.created_at
  }

  await state.set('competitorContent', itemId, contentItem)
}

/**
 * Convert Facebook post to content item
 */
export function facebookPostToContentItem(
  post: FacebookPost,
  competitorId: string
): {
  contentId: string
  contentType: 'post' | 'video'
  contentUrl: string
  createdAt: string
  metrics: {
    likes_count: number
    comments_count: number
    views_count?: number
    shares_count: number
  }
  rawMetrics: Record<string, any>
} {
  const contentType: 'post' | 'video' = post.post_type === 'video' ? 'video' : 'post'
  // Generate content URL if not provided
  const contentUrl = post.content_url || (post.post_id ? `https://www.facebook.com/${post.post_id}` : `https://www.facebook.com/`)
  
  return {
    contentId: post.content_id || post.post_id,
    contentType,
    contentUrl,
    createdAt: post.created_at || post.created_time,
    metrics: {
      likes_count: post.likes_count,
      comments_count: post.comments_count,
      views_count: post.views_count,
      shares_count: post.shares_count
    },
    rawMetrics: {
      ...post,
      post_type: post.post_type
    }
  }
}

/**
 * Convert Instagram post to content item
 */
export function instagramPostToContentItem(
  post: InstagramPost,
  competitorId: string
): {
  contentId: string
  contentType: 'reel' | 'post'
  contentUrl: string
  createdAt: string
  metrics: {
    likes_count: number
    comments_count: number
    views_count?: number
  }
  rawMetrics: Record<string, any>
} {
  // Generate content URL if not provided
  const contentUrl = post.content_url || (post.post_id ? `https://www.instagram.com/p/${post.post_id}/` : `https://www.instagram.com/`)
  
  return {
    contentId: post.content_id || post.post_id,
    contentType: post.contentType,
    contentUrl,
    createdAt: post.created_at || post.timestamp,
    metrics: {
      likes_count: post.likeCount,
      comments_count: post.commentCount,
      views_count: post.views_count || post.playCount
    },
    rawMetrics: {
      ...post,
      contentType: post.contentType
    }
  }
}

/**
 * Convert YouTube video to content item
 */
export function youtubeVideoToContentItem(
  video: YouTubeVideo,
  competitorId: string
): {
  contentId: string
  contentType: 'video'
  contentUrl: string
  createdAt: string
  metrics: {
    likes_count: number
    comments_count: number
    views_count: number
    duration?: string
  }
  rawMetrics: Record<string, any>
} {
  const contentUrl = video.content_url || `https://www.youtube.com/watch?v=${video.video_id}`
  
  return {
    contentId: video.content_id || video.video_id,
    contentType: 'video',
    contentUrl,
    createdAt: video.created_at || video.published_at,
    metrics: {
      likes_count: video.like_count,
      comments_count: video.comment_count,
      views_count: video.view_count,
      duration: video.duration
    },
    rawMetrics: {
      title: video.title,
      duration: video.duration,
      ...video
    }
  }
}

