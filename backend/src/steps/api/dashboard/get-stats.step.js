// Dashboard API: Get dashboard stats/summary
export const config = {
    type: 'api',
    name: 'GetDashboardStats',
    path: '/api/dashboard/stats',
    method: 'GET',
    emits: [],
    description: 'Returns aggregated stats for dashboard overview',
    flows: ['dashboard'],
    queryParams: [
        { name: 'creatorId', description: 'Filter stats by creator' }
    ]
}

export const handler = async (req, ctx) => {
    const { creatorId } = req.query || {}

    ctx.logger.info('Dashboard: Fetching stats', {
        creatorId,
        traceId: ctx.traceId
    })

    try {
        // Fetch all deals and inquiries
        let [deals, inquiries] = await Promise.all([
            ctx.state.getGroup('deals'),
            ctx.state.getGroup('inquiries')
        ])

        ctx.logger.debug('State data fetched', {
            dealsCount: deals.length,
            inquiriesCount: inquiries.length
        })

        // Filter by creator if specified
        if (creatorId) {
            deals = deals.filter(d => d.creatorId === creatorId)
            ctx.logger.debug(`Filtered by creator: ${creatorId}`, {
                dealsCount: deals.length
            })
        }

        // Calculate stats
        const stats = {
            overview: {
                totalDeals: deals.length,
                totalInquiries: inquiries.length,
                newInquiries: inquiries.filter(i => i.status === 'new').length,
                pendingExtraction: inquiries.filter(i => i.status === 'new' || i.status === 'extraction_failed').length
            },
            dealsByStatus: {
                inquiry: deals.filter(d => d.status === 'inquiry').length,
                negotiating: deals.filter(d => d.status === 'negotiating').length,
                active: deals.filter(d => d.status === 'active').length,
                completed: deals.filter(d => d.status === 'completed').length,
                cancelled: deals.filter(d => d.status === 'cancelled').length
            },
            revenue: {
                totalActive: deals
                    .filter(d => d.status === 'active')
                    .reduce((sum, d) => sum + (d.terms?.total || 0), 0),
                totalCompleted: deals
                    .filter(d => d.status === 'completed')
                    .reduce((sum, d) => sum + (d.terms?.total || 0), 0),
                avgDealSize: deals.length > 0
                    ? deals.reduce((sum, d) => sum + (d.terms?.total || 0), 0) / deals.length
                    : 0
            },
            recentActivity: {
                last24h: {
                    newInquiries: inquiries.filter(i => {
                        const age = Date.now() - new Date(i.receivedAt).getTime()
                        return age < 24 * 60 * 60 * 1000
                    }).length,
                    dealsCreated: deals.filter(d => {
                        const age = Date.now() - new Date(d.timeline?.dealCreated || 0).getTime()
                        return age < 24 * 60 * 60 * 1000
                    }).length
                }
            }
        }

        ctx.logger.info('Dashboard: Stats calculated', {
            totalDeals: stats.overview.totalDeals,
            activeDeals: stats.dealsByStatus.active,
            traceId: ctx.traceId
        })

        return {
            status: 200,
            body: {
                success: true,
                stats: stats,
                generatedAt: new Date().toISOString()
            }
        }
    } catch (error) {
        ctx.logger.error('Dashboard: Failed to calculate stats', {
            error: error.message,
            stack: error.stack,
            traceId: ctx.traceId
        })

        return {
            status: 500,
            body: {
                success: false,
                error: 'Failed to calculate stats'
            }
        }
    }
}
