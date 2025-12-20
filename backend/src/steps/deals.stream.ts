import { StreamConfig } from 'motia'
import { z } from 'zod'

// We'll use a loose schema for now to match the existing Deal type
// or we can just use z.any() if we want to be flexible, 
// but it's better to define the structure if possible.
// Given the complexity of the Deal type, z.any() or a partial schema is safer for an MVP.

export const config: StreamConfig = {
    name: 'deals',
    schema: z.object({}).passthrough(),
    baseConfig: {
        storageType: 'default'
    }
}
