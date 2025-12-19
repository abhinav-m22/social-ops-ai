// FinanceHub API: Export finance data as PDF
import PDFDocument from 'pdfkit'

export const config = {
    type: 'api',
    name: 'ExportFinancePDF',
    path: '/api/finance/export/pdf',
    method: 'GET',
    emits: [],
    description: 'Exports finance data as PDF',
    flows: ['dashboard']
}

// Helper function to draw a box/rectangle
const drawBox = (doc, x, y, width, height, fillColor = null, strokeColor = '#e5e7eb') => {
    if (fillColor) {
        doc.rect(x, y, width, height).fillColor(fillColor).fill()
    }
    doc.rect(x, y, width, height).strokeColor(strokeColor).lineWidth(0.5).stroke()
}

// Helper function to draw table row
const drawTableRow = (doc, x, y, width, height, cells, cellWidths, alignments = []) => {
    let currentX = x
    cells.forEach((cell, index) => {
        const cellWidth = cellWidths[index] || (width / cells.length)
        const alignment = alignments[index] || 'left'
        
        // Draw cell border
        drawBox(doc, currentX, y, cellWidth, height, null, '#d1d5db')
        
        // Add text
        const textOptions = {
            width: cellWidth - 10,
            align: alignment
        }
        doc.fontSize(9)
            .fillColor('#111827')
            .text(cell, currentX + 5, y + (height / 2) - 6, textOptions)
        
        currentX += cellWidth
    })
}

export const handler = async (req, ctx) => {
    ctx.logger.info('FinanceHub: Generating PDF export', {
        traceId: ctx.traceId
    })

    try {
        // Fetch finance data (reuse existing aggregation logic)
        let deals = await ctx.state.getGroup('deals')
        const activeDeals = deals.filter(deal => {
            const status = (deal.status || '').toLowerCase()
            return status === 'active' || status === 'completed'
        })

        // Calculate summary
        let totalEarnings = 0
        let totalGST = 0
        let totalTDS = 0
        const platformEarnings = {}
        const gstTableData = []
        const tdsTableData = []

        activeDeals.forEach(deal => {
            const amount = deal.terms?.agreedRate || 0
            const gst = deal.terms?.gst || 0
            const tds = deal.terms?.tds || 0

            totalEarnings += amount
            totalGST += gst
            totalTDS += tds

            let platform = (deal.platform || deal.source || 'other').toLowerCase()
            if (platform === 'unknown') platform = 'other'
            platformEarnings[platform] = (platformEarnings[platform] || 0) + amount

            if (gst > 0) {
                gstTableData.push({
                    invoiceId: deal.dealId,
                    brand: deal.brand?.name || 'Unknown',
                    amount,
                    gst,
                    total: deal.terms?.total || 0
                })
            }

            if (tds > 0) {
                tdsTableData.push({
                    brand: deal.brand?.name || 'Unknown',
                    grossAmount: amount,
                    tds,
                    netAmount: amount - tds
                })
            }
        })

        const netReceivable = totalEarnings - totalTDS

        // Create PDF with better margins
        const doc = new PDFDocument({ 
            margin: 40, 
            size: 'A4',
            info: {
                Title: 'FinanceHub Report',
                Author: 'FinanceHub',
                Subject: 'Financial Analytics Report'
            }
        })
        const chunks = []

        doc.on('data', chunk => chunks.push(chunk))
        
        // Track page numbers
        let pageNumber = 0
        doc.on('pageAdded', () => {
            pageNumber++
        })
        
        // Helper to add footer
        const addFooter = () => {
            const footerY = doc.page.height - 40
            // Footer line
            doc.moveTo(50, footerY)
                .lineTo(545, footerY)
                .strokeColor(colors.border)
                .lineWidth(0.5)
                .stroke()
            
            // Footer text
            doc.fillColor(colors.textLight)
                .fontSize(8)
                .font('Helvetica')
                .text('Auto-generated for reference. Not a legal tax document.', 50, footerY + 5, {
                    align: 'center',
                    width: 495
                })
        }

        // Colors
        const colors = {
            primary: '#10b981',
            secondary: '#3b82f6',
            text: '#111827',
            textLight: '#6b7280',
            border: '#e5e7eb',
            bgLight: '#f9fafb'
        }

        // Header Section
        doc.fillColor(colors.primary)
            .fontSize(28)
            .font('Helvetica-Bold')
            .text('FinanceHub', 50, 50, { align: 'center' })
        
        doc.fillColor(colors.textLight)
            .fontSize(12)
            .font('Helvetica')
            .text('Financial Analytics Report', 50, 80, { align: 'center' })
        
        doc.fillColor(colors.textLight)
            .fontSize(10)
            .text(`Generated: ${new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}`, 50, 100, { align: 'center' })
        
        // Draw header line
        doc.moveTo(50, 120)
            .lineTo(545, 120)
            .strokeColor(colors.border)
            .lineWidth(1)
            .stroke()

        let currentY = 150

        // Summary Cards Section
        doc.fillColor(colors.text)
            .fontSize(18)
            .font('Helvetica-Bold')
            .text('Financial Summary', 50, currentY)
        
        currentY += 30

        // Summary cards in 2x2 grid
        const cardWidth = 240
        const cardHeight = 80
        const cardSpacing = 20
        const startX = 50

        // Card 1: Total Earnings
        drawBox(doc, startX, currentY, cardWidth, cardHeight, '#f0fdf4', colors.primary)
        doc.fillColor(colors.textLight)
            .fontSize(10)
            .font('Helvetica')
            .text('Total Earnings', startX + 15, currentY + 15)
        doc.fillColor(colors.primary)
            .fontSize(20)
            .font('Helvetica-Bold')
            .text(`₹${totalEarnings.toLocaleString('en-IN')}`, startX + 15, currentY + 35)

        // Card 2: GST Collected
        drawBox(doc, startX + cardWidth + cardSpacing, currentY, cardWidth, cardHeight, '#eff6ff', colors.secondary)
        doc.fillColor(colors.textLight)
            .fontSize(10)
            .font('Helvetica')
            .text('GST Collected', startX + cardWidth + cardSpacing + 15, currentY + 15)
        doc.fillColor(colors.secondary)
            .fontSize(20)
            .font('Helvetica-Bold')
            .text(`₹${totalGST.toLocaleString('en-IN')}`, startX + cardWidth + cardSpacing + 15, currentY + 35)

        // Card 3: TDS Deducted
        drawBox(doc, startX, currentY + cardHeight + cardSpacing, cardWidth, cardHeight, '#fef3c7', '#f59e0b')
        doc.fillColor(colors.textLight)
            .fontSize(10)
            .font('Helvetica')
            .text('TDS Deducted', startX + 15, currentY + cardHeight + cardSpacing + 15)
        doc.fillColor('#f59e0b')
            .fontSize(20)
            .font('Helvetica-Bold')
            .text(`₹${totalTDS.toLocaleString('en-IN')}`, startX + 15, currentY + cardHeight + cardSpacing + 35)

        // Card 4: Net Receivable
        drawBox(doc, startX + cardWidth + cardSpacing, currentY + cardHeight + cardSpacing, cardWidth, cardHeight, '#f3e8ff', '#8b5cf6')
        doc.fillColor(colors.textLight)
            .fontSize(10)
            .font('Helvetica')
            .text('Net Receivable', startX + cardWidth + cardSpacing + 15, currentY + cardHeight + cardSpacing + 15)
        doc.fillColor('#8b5cf6')
            .fontSize(20)
            .font('Helvetica-Bold')
            .text(`₹${netReceivable.toLocaleString('en-IN')}`, startX + cardWidth + cardSpacing + 15, currentY + cardHeight + cardSpacing + 35)

        currentY += (cardHeight * 2) + cardSpacing + 40

        // Platform-wise Earnings Section
        if (Object.keys(platformEarnings).length > 0) {
            // Check if we need a new page
            if (currentY > 650) {
                addFooter() // Add footer before new page
                doc.addPage()
                currentY = 50
            }

            doc.fillColor(colors.text)
                .fontSize(18)
                .font('Helvetica-Bold')
                .text('Platform-wise Earnings', 50, currentY)
            
            currentY += 30

            // Platform earnings table
            const platformTableWidth = 495
            const rowHeight = 25
            const platformCellWidths = [200, 295]
            
            // Header row
            drawBox(doc, 50, currentY, platformTableWidth, rowHeight, colors.bgLight, colors.border)
            doc.fillColor(colors.text)
                .fontSize(11)
                .font('Helvetica-Bold')
                .text('Platform', 55, currentY + 7)
                doc.text('Earnings', 255, currentY + 7, { align: 'right', width: 285 })
            
            currentY += rowHeight

            // Data rows
            Object.entries(platformEarnings)
                .sort((a, b) => b[1] - a[1])
                .forEach(([platform, earnings]) => {
                    if (currentY > 700) {
                        doc.addPage()
                        currentY = 50
                    }
                    
                    drawTableRow(
                        doc,
                        50,
                        currentY,
                        platformTableWidth,
                        rowHeight,
                        [
                            platform.charAt(0).toUpperCase() + platform.slice(1),
                            `₹${earnings.toLocaleString('en-IN')}`
                        ],
                        platformCellWidths,
                        ['left', 'right']
                    )
                    currentY += rowHeight
                })
            
            currentY += 30
        }

        // GST Summary Table
        if (gstTableData.length > 0) {
            // Check if we need a new page
            if (currentY > 600) {
                doc.addPage()
                currentY = 50
            }

            doc.fillColor(colors.text)
                .fontSize(18)
                .font('Helvetica-Bold')
                .text('GST Summary', 50, currentY)
            
            currentY += 30

            const gstTableWidth = 495
            const gstRowHeight = 22
            const gstCellWidths = [120, 150, 75, 75, 75]
            
            // Header row
            drawBox(doc, 50, currentY, gstTableWidth, gstRowHeight, colors.bgLight, colors.border)
            doc.fillColor(colors.text)
                .fontSize(10)
                .font('Helvetica-Bold')
                .text('Invoice ID', 55, currentY + 6, { width: 115 })
                doc.text('Brand', 175, currentY + 6, { width: 145 })
                doc.text('Amount', 320, currentY + 6, { align: 'right', width: 70 })
                doc.text('GST', 395, currentY + 6, { align: 'right', width: 70 })
                doc.text('Total', 470, currentY + 6, { align: 'right', width: 70 })
            
            currentY += gstRowHeight

            // Data rows
            gstTableData.forEach((row, index) => {
                if (currentY > 700) {
                    doc.addPage()
                    currentY = 50
                }
                
                // Alternate row color
                const bgColor = index % 2 === 0 ? '#ffffff' : colors.bgLight
                drawBox(doc, 50, currentY, gstTableWidth, gstRowHeight, bgColor, colors.border)
                
                doc.fillColor(colors.text)
                    .fontSize(9)
                    .font('Helvetica')
                    .text(row.invoiceId.substring(0, 18), 55, currentY + 5, { width: 115 })
                    .text(row.brand.substring(0, 22), 175, currentY + 5, { width: 145 })
                    .text(`₹${row.amount.toLocaleString('en-IN')}`, 320, currentY + 5, { align: 'right', width: 70 })
                    .text(`₹${row.gst.toLocaleString('en-IN')}`, 395, currentY + 5, { align: 'right', width: 70 })
                    .text(`₹${row.total.toLocaleString('en-IN')}`, 470, currentY + 5, { align: 'right', width: 70 })
                
                currentY += gstRowHeight
            })
            
            currentY += 30
        }

        // TDS Summary Table
        if (tdsTableData.length > 0) {
            // Check if we need a new page
            if (currentY > 600) {
                doc.addPage()
                currentY = 50
            }

            doc.fillColor(colors.text)
                .fontSize(18)
                .font('Helvetica-Bold')
                .text('TDS Summary', 50, currentY)
            
            currentY += 30

            const tdsTableWidth = 495
            const tdsRowHeight = 22
            const tdsCellWidths = [200, 100, 95, 100]
            
            // Header row
            drawBox(doc, 50, currentY, tdsTableWidth, tdsRowHeight, colors.bgLight, colors.border)
            doc.fillColor(colors.text)
                .fontSize(10)
                .font('Helvetica-Bold')
                .text('Brand', 55, currentY + 6, { width: 195 })
                doc.text('Gross Amount', 255, currentY + 6, { align: 'right', width: 95 })
                doc.text('TDS', 355, currentY + 6, { align: 'right', width: 90 })
                doc.text('Net Amount', 450, currentY + 6, { align: 'right', width: 95 })
            
            currentY += tdsRowHeight

            // Data rows
            tdsTableData.forEach((row, index) => {
                if (currentY > 700) {
                    doc.addPage()
                    currentY = 50
                }
                
                // Alternate row color
                const bgColor = index % 2 === 0 ? '#ffffff' : colors.bgLight
                drawBox(doc, 50, currentY, tdsTableWidth, tdsRowHeight, bgColor, colors.border)
                
                doc.fillColor(colors.text)
                    .fontSize(9)
                    .font('Helvetica')
                    .text(row.brand.substring(0, 28), 55, currentY + 5, { width: 195 })
                    .text(`₹${row.grossAmount.toLocaleString('en-IN')}`, 255, currentY + 5, { align: 'right', width: 95 })
                    .text(`₹${row.tds.toLocaleString('en-IN')}`, 355, currentY + 5, { align: 'right', width: 90 })
                    .text(`₹${row.netAmount.toLocaleString('en-IN')}`, 450, currentY + 5, { align: 'right', width: 95 })
                
                currentY += tdsRowHeight
            })
        }

        // Add footer to current page
        addFooter()

        // Wait for PDF to be generated
        const pdfBuffer = await new Promise((resolve, reject) => {
            doc.on('end', () => {
                resolve(Buffer.concat(chunks))
            })
            doc.on('error', reject)
            doc.end()
        })

        return {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="finance-report-${Date.now()}.pdf"`
            },
            body: pdfBuffer
        }
    } catch (error) {
        ctx.logger.error('FinanceHub: Failed to generate PDF', {
            error: error.message,
            stack: error.stack,
            traceId: ctx.traceId
        })

        return {
            status: 500,
            body: {
                success: false,
                error: 'Failed to generate PDF',
                message: error.message
            }
        }
    }
}
