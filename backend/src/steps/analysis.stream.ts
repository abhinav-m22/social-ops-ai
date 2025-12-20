import { StreamConfig } from 'motia'
import { z } from 'zod'

export const config: StreamConfig = {
    name: 'analysis',
    schema: z.object({
        status: z.string(),
        progress: z.number().optional(),
        message: z.string().optional()
    }),
    baseConfig: {
        storageType: 'default'
    }
}
