export type Trend = {
    topic: string
    velocityScore: number
    competitionLevel: string
    engagementSpike: string
    confidence: number
    tags: string[]
}

export type PlatformResult = {
    platform: string
    niche: string
    creatorId: string
    collectedAt: string
    trends: Trend[]
}

export type TrendScoutState = {
    status: 'idle' | 'running' | 'completed' | 'failed'
    startTime?: string
    platforms: {
        youtube?: 'pending' | 'completed'
        googleTrends?: 'pending' | 'completed'
        twitter?: 'pending' | 'completed'
        facebook?: 'pending' | 'completed'
        instagram?: 'pending' | 'completed'
    }
    results: PlatformResult[]
    aggregatedTrends?: any
    message?: string
    timestamp?: string
    completionTime?: string
}

export type ContentIdea = {
    title: string
    angle: string
    format: string
    hooks: string[]
    thumbnail_concept: string
    estimated_views: string
    difficulty: 'Easy' | 'Medium' | 'Hard'
}

export type TrendAnalysis = {
    ranked_trends: Array<{
        topic: string
        category: 'HOT' | 'RISING' | 'EMERGING'
        reasoning: string
        content_ideas: ContentIdea[]
    }>
    daily_action_plan: {
        youtube: string
        instagram: string
        twitter: string
        facebook: string
        global_momentum: string
    }
}
