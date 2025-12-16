export type Platform = 'instagram' | 'youtube' | 'facebook'
export type ContentType = 'reel' | 'video' | 'post' | 'short'
export type Country = 'India' | 'US'

export type BaselineInput = {
    followers: number
    platform: Platform
    contentType: ContentType
    country?: Country
}

export type EngagementInput = {
    avgLikes: number
    avgComments: number
    avgShares: number
    followers: number
}

export type ReachConsistencyInput = {
    avgViews: number
    followers: number
    postsLast30Days: number
}

export type RateOutputs = {
    baselineRate: number
    engagementRate: number
    engagementMultiplier: number
    engagementAdjustedRate: number
    viewRatio: number
    viewMultiplier: number
    consistencyMultiplier: number
    reachAdjustedRate: number
}

export function calculateBaselineRate(input: BaselineInput): number
export function calculateEngagementAdjustedRate(
    baseRate: number,
    metrics: EngagementInput
): { engagementRate: number; engagementMultiplier: number; engagementAdjustedRate: number }
export function calculateReachAdjustedRate(
    engagementAdjustedRate: number,
    metrics: ReachConsistencyInput
): {
    viewRatio: number
    viewMultiplier: number
    consistencyMultiplier: number
    reachAdjustedRate: number
}
export function calculateRateStack(params: {
    baseline: BaselineInput
    engagement: EngagementInput
    reach: ReachConsistencyInput
}): RateOutputs

