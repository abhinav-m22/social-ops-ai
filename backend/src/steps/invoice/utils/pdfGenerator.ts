/**
 * PDF Generator for Invoices
 * 
 * Generates PDF from invoice data
 * Uses simple HTML to PDF conversion
 */

import type { Invoice } from '../types'

/**
 * Generate PDF buffer from invoice data
 * 
 * For now, returns a simple HTML representation
 * In production, use a proper PDF library like:
 * - pdfkit
 * - puppeteer
 * - @react-pdf/renderer
 */
export async function generateInvoicePDF(invoice: Invoice): Promise<Buffer> {
  // Generate HTML invoice
  const html = generateInvoiceHTML(invoice)
  
  // For now, return HTML as buffer (will be converted to PDF in production)
  // TODO: Implement actual PDF generation using a library
  // For testing, we'll return HTML that can be converted server-side
  
  return Buffer.from(html, 'utf-8')
}

/**
 * Generate HTML representation of invoice
 */
function generateInvoiceHTML(invoice: Invoice): string {
  const brandName = invoice.brandSnapshot.name || 'Brand'
  const creatorName = invoice.creatorSnapshot.fullName || invoice.creatorSnapshot.businessName || 'Creator'
  const invoiceNumber = invoice.invoiceNumber || invoice.invoiceId
  const invoiceDate = new Date(invoice.invoiceDate).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  const dueDate = new Date(invoice.dueDate).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoiceNumber}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 40px;
      color: #333;
    }
    .header {
      border-bottom: 2px solid #333;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .invoice-title {
      font-size: 32px;
      font-weight: bold;
      margin-bottom: 10px;
    }
    .invoice-number {
      font-size: 18px;
      color: #666;
    }
    .details {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
    }
    .bill-to, .bill-from {
      width: 45%;
    }
    .section-title {
      font-weight: bold;
      margin-bottom: 10px;
      font-size: 14px;
      text-transform: uppercase;
      color: #666;
    }
    .deliverables {
      margin: 30px 0;
    }
    .deliverable-item {
      padding: 10px 0;
      border-bottom: 1px solid #eee;
    }
    .totals {
      margin-top: 30px;
      text-align: right;
    }
    .total-row {
      padding: 8px 0;
      display: flex;
      justify-content: flex-end;
    }
    .total-label {
      width: 150px;
      text-align: right;
      font-weight: bold;
    }
    .total-value {
      width: 120px;
      text-align: right;
    }
    .grand-total {
      font-size: 20px;
      font-weight: bold;
      border-top: 2px solid #333;
      padding-top: 10px;
      margin-top: 10px;
    }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      font-size: 12px;
      color: #666;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="invoice-title">INVOICE</div>
    <div class="invoice-number">Invoice #${invoiceNumber}</div>
  </div>

  <div class="details">
    <div class="bill-from">
      <div class="section-title">From</div>
      <div><strong>${creatorName}</strong></div>
      ${invoice.creatorSnapshot.email ? `<div>${invoice.creatorSnapshot.email}</div>` : ''}
      ${invoice.creatorSnapshot.phone ? `<div>${invoice.creatorSnapshot.phone}</div>` : ''}
      ${invoice.creatorSnapshot.address ? `<div>${invoice.creatorSnapshot.address}</div>` : ''}
      ${invoice.creatorSnapshot.gstin ? `<div>GSTIN: ${invoice.creatorSnapshot.gstin}</div>` : ''}
    </div>

    <div class="bill-to">
      <div class="section-title">Bill To</div>
      <div><strong>${brandName}</strong></div>
      ${invoice.brandSnapshot.email ? `<div>${invoice.brandSnapshot.email}</div>` : ''}
      ${invoice.brandSnapshot.pocName ? `<div>Contact: ${invoice.brandSnapshot.pocName}</div>` : ''}
      ${invoice.brandSnapshot.address ? `<div>${invoice.brandSnapshot.address}</div>` : ''}
      ${invoice.brandSnapshot.gstin ? `<div>GSTIN: ${invoice.brandSnapshot.gstin}</div>` : ''}
    </div>
  </div>

  <div style="margin: 30px 0;">
    <div><strong>Invoice Date:</strong> ${invoiceDate}</div>
    <div><strong>Due Date:</strong> ${dueDate}</div>
    ${invoice.campaignName ? `<div><strong>Campaign:</strong> ${invoice.campaignName}</div>` : ''}
  </div>

  <div class="deliverables">
    <div class="section-title">Deliverables</div>
    ${invoice.deliverables.map((del, idx) => `
      <div class="deliverable-item">
        ${idx + 1}. ${del}
      </div>
    `).join('')}
  </div>

  <div class="totals">
    <div class="total-row">
      <div class="total-label">Subtotal:</div>
      <div class="total-value">₹${invoice.amount.toLocaleString('en-IN')}</div>
    </div>
    ${invoice.gstAmount ? `
      <div class="total-row">
        <div class="total-label">GST:</div>
        <div class="total-value">₹${invoice.gstAmount.toLocaleString('en-IN')}</div>
      </div>
    ` : ''}
    ${invoice.tdsAmount ? `
      <div class="total-row">
        <div class="total-label">TDS:</div>
        <div class="total-value">₹${invoice.tdsAmount.toLocaleString('en-IN')}</div>
      </div>
    ` : ''}
    <div class="total-row grand-total">
      <div class="total-label">Total Amount:</div>
      <div class="total-value">₹${(invoice.netPayable || invoice.amount).toLocaleString('en-IN')}</div>
    </div>
  </div>

  ${invoice.creatorSnapshot.bankName ? `
    <div style="margin-top: 40px; padding: 20px; background: #f5f5f5; border-radius: 5px;">
      <div class="section-title">Payment Details</div>
      <div><strong>Bank:</strong> ${invoice.creatorSnapshot.bankName}</div>
      <div><strong>Account Number:</strong> ${invoice.creatorSnapshot.accountNumber}</div>
      <div><strong>IFSC:</strong> ${invoice.creatorSnapshot.ifsc}</div>
      ${invoice.creatorSnapshot.upiId ? `<div><strong>UPI ID:</strong> ${invoice.creatorSnapshot.upiId}</div>` : ''}
    </div>
  ` : ''}

  <div class="footer">
    <div>Thank you for your business!</div>
    <div style="margin-top: 10px;">This is a computer-generated invoice.</div>
  </div>
</body>
</html>
  `.trim()

  return html
}


