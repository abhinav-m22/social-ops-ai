import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'

export const config: ApiRouteConfig = {
    type: 'api',
    name: 'ClearNotifications',
    method: 'POST',
    path: '/api/notifications/clear',
    emits: [],
    description: 'Clears all real-time notifications for the creator'
}

export const handler = async (req: any, ctx: any) => {
    const creatorId = 'default-creator' // Matches our current hardcoded ID

    try {
        if (ctx.streams && ctx.streams.notifications) {
            await ctx.streams.notifications.clear(creatorId)
        }

        return {
            status: 200,
            body: { success: true }
        }
    } catch (error: any) {
        ctx.logger.error('Failed to clear notifications', { error: error.message })
        return {
            status: 500,
            body: { success: false, error: error.message }
        }
    }
}
