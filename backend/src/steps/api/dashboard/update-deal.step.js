// Dashboard API: Update deal status and details (manual actions)
export const config = {
    type: 'api',
    name: 'UpdateDeal',
    path: '/api/deals/:dealId',
    method: 'PATCH',
    emits: ['deal.updated'],
    description: 'Updates a deal (status, terms, notes) from dashboard',
    flows: ['dashboard', 'dealflow']
}

export const handler = async (req, ctx) => {
    const { dealId } = req.pathParams || {}
    const updates = req.body || {}

    ctx.logger.info('Dashboard: Updating deal', {
        dealId,
        updates: Object.keys(updates),
        traceId: ctx.traceId
    })

    if (!dealId) {
        return {
            status: 400,
            body: { success: false, error: 'dealId is required' }
        }
    }

    try {
        // Fetch current deal
        const currentDeal = await ctx.state.get('deals', dealId)

        if (!currentDeal) {
            ctx.logger.warn('Dashboard: Deal not found for update', { dealId })
            return {
                status: 404,
                body: { success: false, error: 'Deal not found' }
            }
        }

        const timestamp = new Date().toISOString()

        // Prepare update (merge with existing)
        const updatedDeal = {
            ...currentDeal,
            ...updates,
            // Preserve critical fields
            dealId: currentDeal.dealId,
            inquiryId: currentDeal.inquiryId,
            creatorId: currentDeal.creatorId,
            // Add to history
            history: [
                ...(currentDeal.history || []),
                {
                    timestamp,
                    event: 'manual_update',
                    data: {
                        updatedFields: Object.keys(updates),
                        updatedBy: 'dashboard_user', // TODO: Add auth to get real user ID
                        traceId: ctx.traceId
                    }
                }
            ]
        }

        // Add decline/transition notes
        if (updates.status === 'declined') {
            updatedDeal.history.push({
                timestamp,
                event: 'deal_declined',
                data: {
                    reason: updates.declineReason || 'Not specified'
                }
            })
        }
        if (updates.status === 'awaiting_response') {
            updatedDeal.history.push({
                timestamp,
                event: 'reply_sent',
                data: { note: 'Status moved to awaiting_response' }
            })
        }

        // Save updated deal
        await ctx.state.set('deals', dealId, updatedDeal)

        ctx.logger.info('Dashboard: Deal updated successfully', {
            dealId,
            newStatus: updatedDeal.status,
            traceId: ctx.traceId
        })

        // Emit update event for downstream processing
        await ctx.emit({
            topic: 'deal.updated',
            data: {
                dealId,
                previousStatus: currentDeal.status,
                newStatus: updatedDeal.status,
                updates: Object.keys(updates)
            }
        })

        return {
            status: 200,
            body: {
                success: true,
                deal: updatedDeal
            }
        }
    } catch (error) {
        ctx.logger.error('Dashboard: Failed to update deal', {
            dealId,
            error: error.message,
            stack: error.stack,
            traceId: ctx.traceId
        })

        return {
            status: 500,
            body: { success: false, error: 'Failed to update deal' }
        }
    }
}
