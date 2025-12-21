import { StreamConfig } from 'motia'
import { z } from 'zod'

export const config: StreamConfig = {
    name: 'trendScout',
    schema: z.object({
        status: z.enum(['idle', 'running', 'completed', 'failed']),
        platforms: z.object({
            youtube: z.string(),
            googleTrends: z.string(),
            twitter: z.string(),
            facebook: z.string(),
            instagram: z.string()
        }).optional(),
        results: z.array(z.object({
            platform: z.string(),
            trends: z.array(z.any())
        })).optional(),
        aggregatedTrends: z.any().optional(),
        message: z.string().optional(),
        timestamp: z.string().optional()
    }),
    baseConfig: {
        storageType: 'default'
    }
}
