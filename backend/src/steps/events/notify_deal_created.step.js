// Event handler: Notifies creator when deal is created
export const config = {
    type: 'event',
    name: 'NotifyDealCreated',
    subscribes: ['deal.created'],
    emits: [],
    description: 'Sends notification to creator when a new deal is created from inquiry',
    flows: ['dealflow', 'notifications']
}

export const handler = async (input, ctx) => {
    const { dealId, inquiryId, brand, status } = input
    
    ctx.logger.info('='.repeat(80))
    ctx.logger.info(`Notifying creator about new deal: ${dealId}`)
    ctx.logger.info('='.repeat(80))
    
    try {
        // Fetch deal details for notification
        const deal = await ctx.state.get('deals', dealId)
        
        if (!deal) {
            ctx.logger.warn(`Deal ${dealId} not found for notification`)
            return
        }
        
        // TODO: Send email/SMS notification to creator
        // For now, just log the notification
        ctx.logger.info('📧 Deal Created Notification', {
            dealId,
            brandName: brand?.name || 'Unknown Brand',
            status,
            creatorId: deal.creatorId
        })
        
        // Store notification in state for future email/SMS integration
        await ctx.state.set('notifications', `notif-${dealId}`, {
            id: `notif-${dealId}`,
            type: 'deal_created',
            dealId: dealId,
            creatorId: deal.creatorId,
            brandName: brand?.name,
            status: status,
            createdAt: new Date().toISOString(),
            sent: false // Will be true when email/SMS is sent
        })
        
        ctx.logger.info('✅ Notification logged', {
            dealId,
            notificationId: `notif-${dealId}`
        })
        ctx.logger.info('='.repeat(80))
        
        return {
            success: true,
            dealId,
            notificationId: `notif-${dealId}`
        }
        
    } catch (error) {
        ctx.logger.error('❌ Failed to notify creator', {
            dealId,
            error: error.message,
            stack: error.stack
        })
        // Don't throw - notification failure shouldn't break the flow
        return { success: false, error: error.message }
    }
}






