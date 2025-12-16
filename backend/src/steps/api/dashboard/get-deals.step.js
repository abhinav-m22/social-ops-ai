// Dashboard API: Get all deals with filtering and sorting
export const config = {
    type: 'api',
    name: 'GetDeals',
    path: '/api/deals',
    method: 'GET',
    emits: [],
    description: 'Returns all deals for the dashboard with optional filters',
    flows: ['dashboard'],
    queryParams: [
        { name: 'status', description: 'Filter by status: inquiry|negotiating|active|completed|cancelled' },
        { name: 'creatorId', description: 'Filter by creator ID' },
        { name: 'sortBy', description: 'Sort by: date|rate|status (default: date)' }
    ]
}

export const handler = async (req, ctx) => {
    const { status, creatorId, sortBy = 'date' } = req.query || {}

    ctx.logger.info('Dashboard: Fetching deals', {
        status,
        creatorId,
        sortBy,
        traceId: ctx.traceId
    })

    try {
        // Fetch all deals from Motia state
        let deals = await ctx.state.getGroup('deals')

        ctx.logger.debug('Deals fetched from state', {
            totalCount: deals.length,
            traceId: ctx.traceId
        })

        // Apply filters
        if (status) {
            deals = deals.filter(deal => deal.status === status)
            ctx.logger.debug(`Filtered by status=${status}`, { count: deals.length })
        }

        if (creatorId) {
            deals = deals.filter(deal => deal.creatorId === creatorId)
            ctx.logger.debug(`Filtered by creatorId=${creatorId}`, { count: deals.length })
        }

        // Sort deals
        deals.sort((a, b) => {
            if (sortBy === 'rate') {
                return (b.terms?.agreedRate || 0) - (a.terms?.agreedRate || 0)
            } else if (sortBy === 'status') {
                return (a.status || '').localeCompare(b.status || '')
            } else {
                // Default: sort by creation date (newest first)
                return new Date(b.timeline?.dealCreated || 0) - new Date(a.timeline?.dealCreated || 0)
            }
        })

        ctx.logger.info('Dashboard: Deals returned successfully', {
            count: deals.length,
            traceId: ctx.traceId
        })

        return {
            status: 200,
            body: {
                success: true,
                count: deals.length,
                deals: deals,
                filters: { status, creatorId, sortBy }
            }
        }
    } catch (error) {
        ctx.logger.error('Dashboard: Failed to fetch deals', {
            error: error.message,
            stack: error.stack,
            traceId: ctx.traceId
        })

        return {
            status: 500,
            body: {
                success: false,
                error: 'Failed to fetch deals'
            }
        }
    }
}
