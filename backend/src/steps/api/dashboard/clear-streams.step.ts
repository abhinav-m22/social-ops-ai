import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'

export const config: ApiRouteConfig = {
    type: 'api',
    name: 'ClearStreams',
    method: 'POST',
    path: '/api/streams/clear',
    emits: [],
    description: 'Clears all streams (deals and notifications) for testing/debugging',
    flows: ['dashboard'],
    bodySchema: z.object({
        streamType: z.enum(['deals', 'notifications']).optional()
    }).optional()
}

export const handler: Handlers['ClearStreams'] = async (req, ctx) => {
    const body = req.body as { streamType?: 'deals' | 'notifications' } || {}
    const { streamType } = body
    
    ctx.logger.info('ClearStreams: Request received', {
        streamType,
        traceId: ctx.traceId
    })

    try {
        const cleared: string[] = []

        // Clear deals stream
        if (!streamType || streamType === 'deals') {
            if (ctx.streams && ctx.streams.deals) {
                // Get all items in the stream group to clear them individually
                // Note: Streams may not have a clear method for groups, so we need to get all and delete
                try {
                    const allDeals = await ctx.streams.deals.getGroup('all-deals')
                    ctx.logger.info('ClearStreams: Found deals in stream', { count: allDeals.length })
                    
                    // Delete each deal from stream
                    for (const deal of allDeals) {
                        if (deal.id) {
                            await ctx.streams.deals.delete('all-deals', deal.id)
                        }
                    }
                    cleared.push(`deals (${allDeals.length} items)`)
                    ctx.logger.info('ClearStreams: Cleared deals stream')
                } catch (error: any) {
                    ctx.logger.warn('ClearStreams: Could not clear deals stream', { error: error.message })
                }
            }
        }

        // Clear notifications stream
        if (!streamType || streamType === 'notifications') {
            if (ctx.streams && ctx.streams.notifications) {
                const creatorId = 'default-creator'
                try {
                    // Clear notifications for the creator
                    const allNotifs = await ctx.streams.notifications.getGroup(creatorId)
                    ctx.logger.info('ClearStreams: Found notifications in stream', { count: allNotifs.length })
                    
                    // Delete each notification
                    for (const notif of allNotifs) {
                        if (notif.id) {
                            await ctx.streams.notifications.delete(creatorId, notif.id)
                        }
                    }
                    cleared.push(`notifications (${allNotifs.length} items)`)
                    ctx.logger.info('ClearStreams: Cleared notifications stream')
                } catch (error: any) {
                    ctx.logger.warn('ClearStreams: Could not clear notifications stream', { error: error.message })
                }
            }
        }

        return {
            status: 200,
            body: {
                success: true,
                message: `Cleared streams: ${cleared.join(', ')}`,
                cleared
            }
        }
    } catch (error: any) {
        ctx.logger.error('ClearStreams: Failed to clear streams', {
            error: error.message,
            stack: error.stack,
            traceId: ctx.traceId
        })

        return {
            status: 500,
            body: {
                success: false,
                error: 'Failed to clear streams',
                details: error.message
            }
        }
    }
}

