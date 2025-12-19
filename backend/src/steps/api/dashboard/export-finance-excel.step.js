// FinanceHub API: Export finance data as Excel
import ExcelJS from 'exceljs'

export const config = {
    type: 'api',
    name: 'ExportFinanceExcel',
    path: '/api/finance/export/excel',
    method: 'GET',
    emits: [],
    description: 'Exports finance data as Excel',
    flows: ['dashboard']
}

export const handler = async (req, ctx) => {
    ctx.logger.info('FinanceHub: Generating Excel export', {
        traceId: ctx.traceId
    })

    try {
        // Fetch finance data
        let deals = await ctx.state.getGroup('deals')
        const activeDeals = deals.filter(deal => {
            const status = (deal.status || '').toLowerCase()
            return status === 'active' || status === 'completed'
        })

        // Calculate aggregations
        let totalEarnings = 0
        let totalGST = 0
        let totalTDS = 0
        const platformEarnings = {}
        const gstTableData = []
        const tdsTableData = []
        const dealsSummary = []

        activeDeals.forEach(deal => {
            const amount = deal.terms?.agreedRate || 0
            const gst = deal.terms?.gst || 0
            const tds = deal.terms?.tds || 0
            const total = deal.terms?.total || 0

            totalEarnings += amount
            totalGST += gst
            totalTDS += tds

            let platform = (deal.platform || deal.source || 'other').toLowerCase()
            if (platform === 'unknown') platform = 'other'
            platformEarnings[platform] = (platformEarnings[platform] || 0) + amount

            dealsSummary.push({
                dealId: deal.dealId,
                brand: deal.brand?.name || 'Unknown',
                platform: platform,
                amount: amount,
                gst: gst,
                tds: tds,
                total: total,
                status: deal.status,
                createdAt: deal.timeline?.dealCreated || ''
            })

            if (gst > 0) {
                gstTableData.push({
                    invoiceId: deal.dealId,
                    brand: deal.brand?.name || 'Unknown',
                    amount: amount,
                    gst: gst,
                    total: total
                })
            }

            if (tds > 0) {
                tdsTableData.push({
                    brand: deal.brand?.name || 'Unknown',
                    grossAmount: amount,
                    tds: tds,
                    netAmount: amount - tds
                })
            }
        })

        // Create Excel workbook
        const workbook = new ExcelJS.Workbook()
        
        // Sheet 1: Deals Summary
        const dealsSheet = workbook.addWorksheet('Deals Summary')
        dealsSheet.columns = [
            { header: 'Deal ID', key: 'dealId', width: 20 },
            { header: 'Brand', key: 'brand', width: 25 },
            { header: 'Platform', key: 'platform', width: 15 },
            { header: 'Amount', key: 'amount', width: 15 },
            { header: 'GST', key: 'gst', width: 15 },
            { header: 'TDS', key: 'tds', width: 15 },
            { header: 'Total', key: 'total', width: 15 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Created At', key: 'createdAt', width: 20 }
        ]
        dealsSheet.addRows(dealsSummary)
        dealsSheet.getRow(1).font = { bold: true }

        // Sheet 2: Platform-wise Earnings
        const platformSheet = workbook.addWorksheet('Platform Earnings')
        platformSheet.columns = [
            { header: 'Platform', key: 'platform', width: 20 },
            { header: 'Earnings', key: 'earnings', width: 20 },
            { header: 'Deal Count', key: 'count', width: 15 }
        ]
        const platformData = Object.entries(platformEarnings)
            .sort((a, b) => b[1] - a[1])
            .map(([platform, earnings]) => ({
                platform: platform.charAt(0).toUpperCase() + platform.slice(1),
                earnings: earnings,
                count: activeDeals.filter(d => {
                    const p = (d.platform || d.source || 'other').toLowerCase()
                    return (p === 'unknown' ? 'other' : p) === platform
                }).length
            }))
        platformSheet.addRows(platformData)
        platformSheet.getRow(1).font = { bold: true }

        // Sheet 3: GST Data
        const gstSheet = workbook.addWorksheet('GST Data')
        gstSheet.columns = [
            { header: 'Invoice ID', key: 'invoiceId', width: 20 },
            { header: 'Brand', key: 'brand', width: 25 },
            { header: 'Amount', key: 'amount', width: 15 },
            { header: 'GST', key: 'gst', width: 15 },
            { header: 'Total', key: 'total', width: 15 }
        ]
        gstSheet.addRows(gstTableData)
        gstSheet.getRow(1).font = { bold: true }

        // Sheet 4: TDS Data
        const tdsSheet = workbook.addWorksheet('TDS Data')
        tdsSheet.columns = [
            { header: 'Brand', key: 'brand', width: 25 },
            { header: 'Gross Amount', key: 'grossAmount', width: 18 },
            { header: 'TDS', key: 'tds', width: 15 },
            { header: 'Net Amount', key: 'netAmount', width: 18 }
        ]
        tdsSheet.addRows(tdsTableData)
        tdsSheet.getRow(1).font = { bold: true }

        // Generate buffer
        const buffer = await workbook.xlsx.writeBuffer()

        return {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="finance-report-${Date.now()}.xlsx"`
            },
            body: Buffer.from(buffer)
        }
    } catch (error) {
        ctx.logger.error('FinanceHub: Failed to generate Excel', {
            error: error.message,
            stack: error.stack,
            traceId: ctx.traceId
        })

        return {
            status: 500,
            body: {
                success: false,
                error: 'Failed to generate Excel',
                message: error.message
            }
        }
    }
}

