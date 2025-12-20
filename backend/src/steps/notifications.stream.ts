import { StreamConfig } from 'motia'
import { z } from 'zod'

export const config: StreamConfig = {
    name: 'notifications',
    schema: z.object({
        title: z.string(),
        body: z.string(),
        tone: z.enum(['success', 'info', 'warning']).optional(),
        dealId: z.string().optional()
    }),
    baseConfig: {
        storageType: 'default'
    }
}
