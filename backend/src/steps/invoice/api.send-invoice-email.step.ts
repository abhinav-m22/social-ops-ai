/**
 * API endpoint: Send Invoice via Email
 * POST /api/invoice/:invoiceId/send
 * 
 * Sends invoice to brand email with PDF attachment
 * Only works if:
 * - Invoice status = 'draft'
 * - Brand email exists
 * 
 * After success:
 * - Updates invoice status to 'sent'
 * - Locks invoice from further edits
 */
import type { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { getInvoice, updateInvoice } from './service'
import { sendEmailWithRetry, validateResendCredentials } from '../../lib/integrations/emailResend'
import { generateInvoicePDF } from './utils/pdfGenerator'

export const config: ApiRouteConfig = {
  name: 'SendInvoiceEmail',
  type: 'api',
  path: '/api/invoice/:invoiceId/send',
  method: 'POST',
  description: 'Sends invoice to brand via email with PDF attachment',
  emits: ['invoice.sent', 'invoice.email_sent'],
  flows: ['invoice'],
  responseSchema: {
    200: z.object({
      success: z.boolean(),
      message: z.string(),
      emailId: z.string().optional(),
      invoice: z.any()
    }),
    400: z.object({
      success: z.boolean(),
      error: z.string()
    }),
    404: z.object({
      success: z.boolean(),
      error: z.string()
    }),
    500: z.object({
      success: z.boolean(),
      error: z.string()
    })
  }
}

export const handler: Handlers['SendInvoiceEmail'] = async (
  req,
  { logger, state, emit }
) => {
  const { invoiceId } = req.pathParams || {}

  logger.info('SendInvoiceEmail: received request', {
    invoiceId
  })

  if (!invoiceId) {
    return {
      status: 400,
      body: {
        success: false,
        error: 'invoiceId is required'
      }
    }
  }

  try {
    // Get invoice
    const invoice = await getInvoice(invoiceId, state)
    
    if (!invoice) {
      return {
        status: 404,
        body: {
          success: false,
          error: 'Invoice not found'
        }
      }
    }

    // Validate invoice can be sent
    if (invoice.status !== 'draft') {
      return {
        status: 400,
        body: {
          success: false,
          error: `Invoice cannot be sent. Current status: ${invoice.status}. Only 'draft' invoices can be sent.`
        }
      }
    }

    // Validate brand email exists
    if (!invoice.brandSnapshot?.email || invoice.brandSnapshot.email.trim() === '') {
      return {
        status: 400,
        body: {
          success: false,
          error: 'Cannot send invoice: Brand email is missing. Please request brand details first.'
        }
      }
    }

    // Validate Resend credentials
    const resendValidation = validateResendCredentials()
    if (!resendValidation.valid) {
      logger.error('SendInvoiceEmail: Resend credentials missing', {
        error: resendValidation.error
      })
      return {
        status: 500,
        body: {
          success: false,
          error: `Email service not configured: ${resendValidation.error}`
        }
      }
    }

    // Generate PDF
    let pdfBuffer: Buffer | null = null
    try {
      pdfBuffer = await generateInvoicePDF(invoice)
      logger.info('SendInvoiceEmail: PDF generated successfully', {
        invoiceId,
        pdfSize: pdfBuffer.length
      })
    } catch (pdfError: any) {
      logger.warn('SendInvoiceEmail: PDF generation failed, sending without attachment', {
        invoiceId,
        error: pdfError.message
      })
      // Continue without PDF - send email with HTML content instead
    }

    // Get deal for context
    const deal = await state.get('deals', invoice.dealId)
    const brandName = invoice.brandSnapshot.name || deal?.brand?.name || 'Brand'

    // Generate email content
    const invoiceNumber = invoice.invoiceNumber || invoice.invoiceId
    const subject = `Invoice ${invoiceNumber} - ${brandName}`
    
    const emailBody = generateInvoiceEmailBody(invoice, deal)

    // Send email
    const emailOptions: any = {}
    
    // If PDF was generated, attach it
    if (pdfBuffer) {
      emailOptions.attachments = [{
        filename: `Invoice-${invoiceNumber}.pdf`,
        content: pdfBuffer.toString('base64'),
        type: 'application/pdf',
        disposition: 'attachment'
      }]
    }

    const emailResult = await sendEmailWithRetry(
      invoice.brandSnapshot.email,
      subject,
      emailBody,
      emailOptions,
      logger,
      2
    )

    // Update invoice status to 'sent'
    const updateResult = await updateInvoice(invoiceId, {
      status: 'sent',
      invoiceNumber: invoice.invoiceNumber || invoiceNumber
    }, state)

    if (!updateResult.success || !updateResult.invoice) {
      logger.error('SendInvoiceEmail: Failed to update invoice status', {
        invoiceId,
        error: updateResult.error
      })
      // Email was sent but status update failed - this is a partial success
      return {
        status: 200,
        body: {
          success: true,
          message: 'Invoice sent successfully, but status update failed',
          emailId: emailResult.emailId,
          invoice: invoice
        }
      }
    }

    logger.info('SendInvoiceEmail: ✅ Invoice sent successfully', {
      invoiceId,
      dealId: invoice.dealId,
      recipientEmail: invoice.brandSnapshot.email,
      emailId: emailResult.emailId,
      hasPDF: !!pdfBuffer
    })

    // Emit events
    await emit({
      topic: 'invoice.sent',
      data: {
        invoiceId,
        dealId: invoice.dealId,
        creatorId: invoice.creatorId,
        recipientEmail: invoice.brandSnapshot.email,
        emailId: emailResult.emailId
      }
    })

    await emit({
      topic: 'invoice.email_sent',
      data: {
        invoiceId,
        dealId: invoice.dealId,
        emailId: emailResult.emailId,
        recipientEmail: invoice.brandSnapshot.email,
        hasPDF: !!pdfBuffer
      }
    })

    return {
      status: 200,
      body: {
        success: true,
        message: 'Invoice sent successfully',
        emailId: emailResult.emailId,
        invoice: updateResult.invoice
      }
    }

  } catch (error: any) {
    logger.error('SendInvoiceEmail: error', {
      invoiceId,
      error: error.message,
      stack: error.stack
    })

    return {
      status: 500,
      body: {
        success: false,
        error: 'Failed to send invoice email'
      }
    }
  }
}

/**
 * Generate email body for invoice
 */
function generateInvoiceEmailBody(invoice: any, deal: any): string {
  const brandName = invoice.brandSnapshot.name || deal?.brand?.name || 'Brand'
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

  let body = `Dear ${brandName},\n\n`
  body += `Please find attached invoice ${invoiceNumber} for our collaboration.\n\n`
  body += `Invoice Details:\n`
  body += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
  body += `Invoice Number: ${invoiceNumber}\n`
  body += `Invoice Date: ${invoiceDate}\n`
  body += `Due Date: ${dueDate}\n`
  body += `Amount: ₹${invoice.amount.toLocaleString('en-IN')}\n`
  
  if (invoice.gstAmount) {
    body += `GST: ₹${invoice.gstAmount.toLocaleString('en-IN')}\n`
  }
  if (invoice.tdsAmount) {
    body += `TDS: ₹${invoice.tdsAmount.toLocaleString('en-IN')}\n`
  }
  if (invoice.netPayable) {
    body += `Net Payable: ₹${invoice.netPayable.toLocaleString('en-IN')}\n`
  }
  
  body += `\nDeliverables:\n`
  invoice.deliverables.forEach((del: string, idx: number) => {
    body += `  ${idx + 1}. ${del}\n`
  })
  
  body += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`
  body += `Payment Instructions:\n`
  body += `Please make payment to the bank account details mentioned in the attached invoice.\n\n`
  body += `If you have any questions, please reply to this email.\n\n`
  body += `Best regards,\n${creatorName}\n`

  return body
}

