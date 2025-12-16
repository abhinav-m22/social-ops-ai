// Dashboard API: Get single deal by ID with full details
export const config = {
    type: 'api',
    name: 'GetDealById',
    path: '/api/deals/:dealId',
    method: 'GET',
    emits: [],
    description: 'Returns a single deal with full details including inquiry history',
    flows: ['dashboard']
}

export const handler = async (req, ctx) => {
    const { dealId } = req.pathParams || {}

    ctx.logger.info('Dashboard: Fetching deal details', {
        dealId,
        traceId: ctx.traceId
    })

    if (!dealId) {
        ctx.logger.warn('Dashboard: dealId missing in request')
        return {
            status: 400,
            body: { success: false, error: 'dealId is required' }
        }
    }

    try {
        // Fetch deal from state
        const deal = await ctx.state.get('deals', dealId)

        if (!deal) {
            ctx.logger.warn('Dashboard: Deal not found', { dealId })
            return {
                status: 404,
                body: { success: false, error: 'Deal not found' }
            }
        }

        // Fetch related inquiry if available
        let inquiry = null
        if (deal.inquiryId) {
            inquiry = await ctx.state.get('inquiries', deal.inquiryId)
            ctx.logger.debug('Related inquiry fetched', {
                inquiryId: deal.inquiryId,
                found: !!inquiry
            })
        }

        ctx.logger.info('Dashboard: Deal details returned', {
            dealId,
            status: deal.status,
            brand: deal.brand?.name,
            traceId: ctx.traceId
        })

        return {
            status: 200,
            body: {
                success: true,
                deal: deal,
                inquiry: inquiry // Include original inquiry for context
            }
        }
    } catch (error) {
        ctx.logger.error('Dashboard: Failed to fetch deal', {
            dealId,
            error: error.message,
            stack: error.stack,
            traceId: ctx.traceId
        })

        return {
            status: 500,
            body: { success: false, error: 'Failed to fetch deal' }
        }
    }
}
