import PDFDocument from 'pdfkit'
import type { Invoice } from '../types.js'

/**
 * Generates a professional PDF invoice using pdfkit
 * Returns a Promise that resolves to a Buffer
 */
export async function generateInvoicePDF(invoice: Invoice): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' })
      const chunks: Buffer[] = []

      doc.on('data', (chunk: Buffer) => chunks.push(chunk))
      doc.on('end', () => {
        const result = Buffer.concat(chunks)
        resolve(result)
      })
      doc.on('error', (err: any) => {
        reject(err)
      })

      // Standard Colors (matching UI)
      const slate900 = '#0F172A'
      const slate600 = '#475569'
      const slate500 = '#64748B'
      const slate400 = '#94A3B8'
      const indigo600 = '#4F46E5'
      const indigo50 = '#EEF2FF'
      const backgroundSlate = '#F8FAFC'

      // Background accent
      doc.rect(0, 0, 612, 10).fill(indigo600)

      // Header
      doc.fillColor(slate900)
        .fontSize(28)
        .font('Helvetica-Bold')
        .text('TAX INVOICE', 50, 50, { characterSpacing: -1 })

      const invoiceNumber = invoice.invoiceNumber || invoice.invoiceId || 'DRAFT'
      doc.fillColor(slate500)
        .fontSize(10)
        .font('Helvetica')
        .text(`#${invoiceNumber}`, 50, 85)

      // Top Right Dates
      const dateY = 50
      doc.fillColor(slate400).fontSize(8).font('Helvetica-Bold').text('DATE', 400, dateY, { align: 'right', width: 145 })
      doc.fillColor(slate900).fontSize(10).font('Helvetica-Bold').text(invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString('en-IN') : 'TBD', 400, dateY + 12, { align: 'right', width: 145 })

      doc.fillColor(slate400).fontSize(8).font('Helvetica-Bold').text('DUE DATE', 400, dateY + 40, { align: 'right', width: 145 })
      doc.fillColor(slate900).fontSize(10).font('Helvetica-Bold').text(invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-IN') : 'TBD', 400, dateY + 52, { align: 'right', width: 145 })

      // Divider Line
      doc.moveTo(50, 120).lineTo(545, 120).strokeColor('#E2E8F0').lineWidth(0.5).stroke()

      // Addresses
      let currentY = 150

      // FROM
      doc.fillColor(indigo600).fontSize(8).font('Helvetica-Bold').text('FROM', 50, currentY, { characterSpacing: 1 })
      doc.fillColor(slate900).fontSize(12).font('Helvetica-Bold').text(invoice.creatorSnapshot.fullName || invoice.creatorSnapshot.name || 'Creator Name', 50, currentY + 15)
      doc.fillColor(slate600).fontSize(9).font('Helvetica').text(invoice.creatorSnapshot.email || '', 50, currentY + 30)
      if (invoice.creatorSnapshot.gstin) {
        doc.fillColor(slate500).text(`GSTIN: ${invoice.creatorSnapshot.gstin}`, 50, currentY + 42)
      }
      doc.fillColor(slate500).text(invoice.creatorSnapshot.address || '', 50, currentY + (invoice.creatorSnapshot.gstin ? 54 : 42), { width: 220, lineGap: 2 })

      // BILL TO
      doc.fillColor(indigo600).fontSize(8).font('Helvetica-Bold').text('BILL TO', 300, currentY, { characterSpacing: 1 })
      doc.fillColor(slate900).fontSize(12).font('Helvetica-Bold').text(invoice.brandSnapshot.name || 'Brand Name', 300, currentY + 15)
      doc.fillColor(slate600).fontSize(9).font('Helvetica').text(invoice.brandSnapshot.email || '', 300, currentY + 30)
      if (invoice.brandSnapshot.gstin) {
        doc.fillColor(slate500).text(`GSTIN: ${invoice.brandSnapshot.gstin}`, 300, currentY + 42)
      }
      doc.fillColor(slate500).text(invoice.brandSnapshot.address || '', 300, currentY + (invoice.brandSnapshot.gstin ? 54 : 42), { width: 245, lineGap: 2 })

      // Table Header
      currentY = 280
      doc.rect(50, currentY, 495, 25).fill(backgroundSlate)
      doc.fillColor(slate400).fontSize(8).font('Helvetica-Bold').text('DESCRIPTION', 65, currentY + 9, { characterSpacing: 1 })
      doc.text('AMOUNT', 445, currentY + 9, { align: 'right', width: 90, characterSpacing: 1 })

      // Deliverables
      currentY += 35
      const deliverables = invoice.deliverables || []
      if (deliverables.length === 0) {
        doc.fillColor(slate400).fontSize(10).font('Helvetica-Oblique').text('No deliverables listed', 65, currentY)
        doc.fillColor(slate900).font('Helvetica-Bold').text(`INR ${(invoice.amount || 0).toLocaleString('en-IN')}`, 445, currentY, { align: 'right', width: 90 })
        currentY += 25
      } else {
        deliverables.forEach((del, index) => {
          doc.fillColor(slate600).fontSize(10).font('Helvetica').text(del, 65, currentY, { width: 350 })
          if (index === 0) {
            doc.fillColor(slate900).font('Helvetica-Bold').text(`INR ${(invoice.amount || 0).toLocaleString('en-IN')}`, 445, currentY, { align: 'right', width: 90 })
          }
          currentY += 25
        })
      }

      // Calculation Section
      currentY = Math.max(currentY + 20, 420)
      const calcX = 350
      const calcLabelWidth = 100
      const calcValWidth = 95

      // Subtotal
      doc.fillColor(slate500).fontSize(9).font('Helvetica').text('Subtotal', calcX, currentY)
      doc.fillColor(slate900).font('Helvetica-Bold').text(`INR ${(invoice.amount || 0).toLocaleString('en-IN')}`, calcX + calcLabelWidth, currentY, { align: 'right', width: calcValWidth })
      currentY += 20

      // GST
      if (invoice.gstAmount && invoice.gstAmount > 0) {
        doc.fillColor(slate500).font('Helvetica').text('GST @ 18%', calcX, currentY)
        doc.fillColor(slate900).font('Helvetica-Bold').text(`INR ${invoice.gstAmount.toLocaleString('en-IN')}`, calcX + calcLabelWidth, currentY, { align: 'right', width: calcValWidth })
        currentY += 20
      }

      // Net Payable Box
      currentY += 10
      doc.rect(340, currentY, 210, 40).fill(indigo50)
      doc.fillColor(indigo600).fontSize(10).font('Helvetica-Bold').text('NET PAYABLE', 355, currentY + 14, { characterSpacing: 0.5 })
      const netPayable = invoice.netPayable || ((invoice.amount || 0) + (invoice.gstAmount || 0))
      doc.fontSize(16).text(`INR ${netPayable.toLocaleString('en-IN')}`, calcX + 50, currentY + 11, { align: 'right', width: 140 })

      // Payment Details Box
      currentY += 70
      doc.rect(50, currentY, 495, 100).fill(backgroundSlate)
      doc.fillColor(slate400).fontSize(8).font('Helvetica-Bold').text('PAYMENT INFORMATION', 65, currentY + 15, { characterSpacing: 1 })

      const gridY = currentY + 35
      // Left Col
      doc.fillColor(slate500).fontSize(8).text('BANK NAME', 65, gridY)
      doc.fillColor(slate900).fontSize(10).font('Helvetica-Bold').text(invoice.creatorSnapshot.bankName || 'HDFC Bank', 65, gridY + 12)

      doc.fillColor(slate500).font('Helvetica').fontSize(8).text('IFSC CODE', 65, gridY + 35)
      doc.fillColor(slate900).fontSize(10).font('Helvetica-Bold').text(invoice.creatorSnapshot.ifsc || invoice.creatorSnapshot.ifscCode || 'HDFC0001234', 65, gridY + 47)

      // Right Col
      doc.fillColor(slate500).font('Helvetica').fontSize(8).text('ACCOUNT NUMBER', 250, gridY)
      doc.fillColor(slate900).fontSize(10).font('Helvetica-Bold').text(invoice.creatorSnapshot.accountNumber || '•••• •••• 4242', 250, gridY + 12)

      doc.fillColor(slate500).font('Helvetica').fontSize(8).text('ACCOUNT HOLDER', 250, gridY + 35)
      doc.fillColor(slate900).fontSize(10).font('Helvetica-Bold').text(invoice.creatorSnapshot.fullName || invoice.creatorSnapshot.name || 'Creator Name', 250, gridY + 47)

      // Footer
      doc.fontSize(8).fillColor(slate400).font('Helvetica').text('Generated by SocialOps AI • Thank you for the collaboration!', 50, 750, { align: 'center', width: 495 })

      doc.end()
    } catch (err: any) {
      reject(err)
    }
  })
}
