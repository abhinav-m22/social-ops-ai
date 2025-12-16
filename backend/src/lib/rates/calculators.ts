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

const platformMultipliers: Record<string, number> = {
    instagram_reel: 1.2,
    youtube_video: 1.5,
    youtube_short: 1.0,
    facebook_post: 0.8
}

const countryMultipliers: Record<Country, number> = {
    India: 0.6,
    US: 1.0
}

const clampFollowers = (followers: number) => Math.max(followers || 0, 1)
const roundCurrency = (value: number) => Math.round(value / 100) * 100

export const calculateBaselineRate = (input: BaselineInput): number => {
    const { followers, platform, contentType, country = 'India' } = input
    const key = `${platform}_${contentType}`
    const platformMultiplier = platformMultipliers[key] ?? 1
    const countryMultiplier = countryMultipliers[country] ?? countryMultipliers.India
    const baseRate = (clampFollowers(followers) / 100) * platformMultiplier * countryMultiplier
    return roundCurrency(baseRate)
}

export const calculateEngagementAdjustedRate = (
    baseRate: number,
    metrics: EngagementInput
) => {
    const { avgLikes, avgComments, avgShares, followers } = metrics
    const engagementRate =
        ((avgLikes + avgComments + avgShares) / clampFollowers(followers)) * 100

    let engagementMultiplier = 1
    if (engagementRate < 2) engagementMultiplier = 0.7
    else if (engagementRate < 5) engagementMultiplier = 1.0
    else if (engagementRate < 8) engagementMultiplier = 1.3
    else engagementMultiplier = 1.5

    const engagementAdjustedRate = roundCurrency(baseRate * engagementMultiplier)

    return { engagementRate, engagementMultiplier, engagementAdjustedRate }
}

export const calculateReachAdjustedRate = (
    engagementAdjustedRate: number,
    metrics: ReachConsistencyInput
) => {
    const { avgViews, followers, postsLast30Days } = metrics
    const viewRatio = clampFollowers(followers) === 0 ? 0 : avgViews / clampFollowers(followers)

    let viewMultiplier = 1
    if (viewRatio < 0.1) viewMultiplier = 0.8
    else if (viewRatio < 0.25) viewMultiplier = 1.0
    else if (viewRatio < 0.5) viewMultiplier = 1.2
    else viewMultiplier = 1.4

    let consistencyMultiplier = 1
    if (postsLast30Days < 4) consistencyMultiplier = 0.9
    else if (postsLast30Days < 8) consistencyMultiplier = 1.0
    else if (postsLast30Days < 15) consistencyMultiplier = 1.1
    else consistencyMultiplier = 1.2

    const reachAdjustedRate = roundCurrency(
        engagementAdjustedRate * viewMultiplier * consistencyMultiplier
    )

    return { viewRatio, viewMultiplier, consistencyMultiplier, reachAdjustedRate }
}

export const calculateRateStack = (params: {
    baseline: BaselineInput
    engagement: EngagementInput
    reach: ReachConsistencyInput
}): RateOutputs => {
    const baselineRate = calculateBaselineRate(params.baseline)
    const { engagementRate, engagementMultiplier, engagementAdjustedRate } =
        calculateEngagementAdjustedRate(baselineRate, params.engagement)
    const { viewRatio, viewMultiplier, consistencyMultiplier, reachAdjustedRate } =
        calculateReachAdjustedRate(engagementAdjustedRate, params.reach)

    return {
        baselineRate,
        engagementRate,
        engagementMultiplier,
        engagementAdjustedRate,
        viewRatio,
        viewMultiplier,
        consistencyMultiplier,
        reachAdjustedRate
    }
}

