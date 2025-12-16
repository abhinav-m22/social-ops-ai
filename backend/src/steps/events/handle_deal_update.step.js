// Event handler: Handles deal update events (for logging, notifications, etc.)
export const config = {
    type: 'event',
    name: 'HandleDealUpdate',
    subscribes: ['deal.updated'],
    emits: [],
    description: 'Handles deal update events - logs changes, sends notifications if needed',
    flows: ['dealflow', 'notifications']
}

export const handler = async (input, ctx) => {
    const { dealId, previousStatus, newStatus, updates } = input
    
    ctx.logger.info('='.repeat(80))
    ctx.logger.info(`Handling deal update: ${dealId}`)
    ctx.logger.info(`Status Change: ${previousStatus} → ${newStatus}`)
    ctx.logger.info('='.repeat(80))
    
    try {
        // Fetch updated deal
        const deal = await ctx.state.get('deals', dealId)
        
        if (!deal) {
            ctx.logger.warn(`Deal ${dealId} not found after update`)
            return
        }
        
        // Log the update
        ctx.logger.info('📝 Deal Update Details', {
            dealId,
            previousStatus,
            newStatus,
            updatedFields: updates,
            brandName: deal.brand?.name
        })
        
        // Send notifications for important status changes
        if (previousStatus !== newStatus) {
            const importantStatusChanges = [
                { from: 'inquiry', to: 'negotiating' },
                { from: 'negotiating', to: 'active' },
                { from: 'active', to: 'completed' }
            ]
            
            const isImportantChange = importantStatusChanges.some(
                change => change.from === previousStatus && change.to === newStatus
            )
            
            if (isImportantChange) {
                ctx.logger.info('🔔 Important status change detected - notification needed', {
                    dealId,
                    change: `${previousStatus} → ${newStatus}`
                })
                
                // Store notification for future email/SMS integration
                await ctx.state.set('notifications', `notif-update-${dealId}`, {
                    id: `notif-update-${dealId}`,
                    type: 'deal_status_changed',
                    dealId: dealId,
                    creatorId: deal.creatorId,
                    previousStatus,
                    newStatus,
                    brandName: deal.brand?.name,
                    createdAt: new Date().toISOString(),
                    sent: false
                })
            }
        }
        
        ctx.logger.info('✅ Deal update handled', {
            dealId,
            newStatus
        })
        ctx.logger.info('='.repeat(80))
        
        return {
            success: true,
            dealId,
            statusChange: `${previousStatus} → ${newStatus}`
        }
        
    } catch (error) {
        ctx.logger.error('❌ Failed to handle deal update', {
            dealId,
            error: error.message,
            stack: error.stack
        })
        // Don't throw - update handling failure shouldn't break the flow
        return { success: false, error: error.message }
    }
}






