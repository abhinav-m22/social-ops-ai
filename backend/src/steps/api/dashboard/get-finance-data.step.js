// FinanceHub API: Get aggregated finance data from deals
export const config = {
    type: 'api',
    name: 'GetFinanceData',
    path: '/api/finance',
    method: 'GET',
    emits: [],
    description: 'Returns aggregated finance data from ACTIVE and COMPLETED deals',
    flows: ['dashboard']
}

export const handler = async (req, ctx) => {
    ctx.logger.info('FinanceHub: Fetching finance data', {
        traceId: ctx.traceId
    })

    try {
        // Fetch all deals from Motia state
        let deals = await ctx.state.getGroup('deals')

        ctx.logger.debug('Deals fetched from state', {
            totalCount: deals.length,
            traceId: ctx.traceId
        })

        // Filter only ACTIVE and COMPLETED deals (case-insensitive)
        const activeDeals = deals.filter(deal => {
            const status = (deal.status || '').toLowerCase()
            return status === 'active' || status === 'completed'
        })

        ctx.logger.info('Filtered active/completed deals', {
            totalDeals: deals.length,
            activeCompletedDeals: activeDeals.length,
            traceId: ctx.traceId
        })

        // Calculate summary metrics
        let totalEarnings = 0
        let totalGST = 0
        let totalTDS = 0
        let netReceivable = 0

        // Platform-wise aggregation
        const platformEarnings = {}
        const platformCounts = {}

        // Month-wise aggregation
        const monthlyEarnings = {}
        const monthlyGST = {}
        const monthlyTDS = {}

        // GST table data
        const gstTableData = []

        // TDS table data
        const tdsTableData = []

        // Process each deal
        activeDeals.forEach(deal => {
            const amount = deal.terms?.agreedRate || 0
            const gst = deal.terms?.gst || 0
            const tds = deal.terms?.tds || 0
            const total = deal.terms?.total || 0

            // Summary totals
            totalEarnings += amount
            totalGST += gst
            totalTDS += tds
            netReceivable += (amount - tds) // Net = amount - TDS

            // Platform aggregation - normalize platform names
            let platform = (deal.platform || deal.source || 'other').toLowerCase()
            // Map 'unknown' to 'other' and handle 'affiliate'
            if (platform === 'unknown') platform = 'other'
            if (!platformEarnings[platform]) {
                platformEarnings[platform] = 0
                platformCounts[platform] = 0
            }
            platformEarnings[platform] += amount
            platformCounts[platform] += 1

            // Month-wise aggregation
            const dealDate = deal.timeline?.dealCreated || deal.timeline?.inquiryReceived || new Date().toISOString()
            const monthKey = new Date(dealDate).toISOString().substring(0, 7) // YYYY-MM format
            
            if (!monthlyEarnings[monthKey]) {
                monthlyEarnings[monthKey] = 0
                monthlyGST[monthKey] = 0
                monthlyTDS[monthKey] = 0
            }
            monthlyEarnings[monthKey] += amount
            monthlyGST[monthKey] += gst
            monthlyTDS[monthKey] += tds

            // GST table entry
            if (gst > 0) {
                gstTableData.push({
                    dealId: deal.dealId,
                    invoiceId: deal.dealId, // Using dealId as invoiceId reference
                    brand: deal.brand?.name || 'Unknown Brand',
                    amount: amount,
                    gst: gst,
                    total: total,
                    createdAt: dealDate
                })
            }

            // TDS table entry
            if (tds > 0) {
                tdsTableData.push({
                    dealId: deal.dealId,
                    brand: deal.brand?.name || 'Unknown Brand',
                    grossAmount: amount,
                    tds: tds,
                    netAmount: amount - tds,
                    createdAt: dealDate
                })
            }
        })

        // Sort monthly data by date
        const sortedMonths = Object.keys(monthlyEarnings).sort()
        const monthlyTrend = sortedMonths.map(month => ({
            month: month,
            earnings: monthlyEarnings[month],
            gst: monthlyGST[month],
            tds: monthlyTDS[month]
        }))

        // Convert platform data to array for charts
        const platformData = Object.keys(platformEarnings).map(platform => ({
            platform: platform,
            earnings: platformEarnings[platform],
            count: platformCounts[platform]
        })).sort((a, b) => b.earnings - a.earnings)

        // Sort tables by date (newest first)
        gstTableData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        tdsTableData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

        // Calculate estimated GST payable (simple sum, no ITC logic)
        const estimatedGSTPayable = totalGST

        const result = {
            summary: {
                totalEarnings: Math.round(totalEarnings),
                totalGST: Math.round(totalGST),
                totalTDS: Math.round(totalTDS),
                netReceivable: Math.round(netReceivable),
                dealCount: activeDeals.length
            },
            platformData: platformData,
            monthlyTrend: monthlyTrend,
            gst: {
                collected: Math.round(totalGST),
                estimatedPayable: Math.round(estimatedGSTPayable),
                tableData: gstTableData
            },
            tds: {
                totalDeducted: Math.round(totalTDS),
                dealsWithTDS: tdsTableData.length,
                tableData: tdsTableData
            }
        }

        ctx.logger.info('FinanceHub: Data aggregated successfully', {
            summary: result.summary,
            platformCount: platformData.length,
            monthlyDataPoints: monthlyTrend.length,
            gstEntries: gstTableData.length,
            tdsEntries: tdsTableData.length,
            traceId: ctx.traceId
        })

        return {
            status: 200,
            body: {
                success: true,
                data: result
            }
        }
    } catch (error) {
        ctx.logger.error('FinanceHub: Failed to fetch finance data', {
            error: error.message,
            stack: error.stack,
            traceId: ctx.traceId
        })

        return {
            status: 500,
            body: {
                success: false,
                error: 'Failed to fetch finance data',
                message: error.message
            }
        }
    }
}

