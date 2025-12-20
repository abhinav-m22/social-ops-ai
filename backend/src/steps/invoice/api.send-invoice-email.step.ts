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
  path: '/api/invoice/send/:invoiceId',
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
      if (pdfBuffer) {
        logger.info('SendInvoiceEmail: PDF generated successfully', {
          invoiceId,
          pdfSize: pdfBuffer.length
        })
      }
    } catch (pdfError: any) {
      logger.warn('SendInvoiceEmail: PDF generation failed, sending without attachment', {
        invoiceId,
        error: pdfError.message
      })
      // Continue without PDF - send email with HTML content instead
    }

    // Get deal for context
    const deal = await state.get('deals', invoice.dealId)
    const brandName = invoice.brandSnapshot.name || (deal as any)?.brand?.name || 'Brand'

    // Generate email content
    // Generate email content
    const invoiceNumber = invoice.invoiceNumber || invoice.invoiceId
    const subject = invoice.campaignName
      ? `Invoice: ${invoice.campaignName} - ${brandName}`
      : `Invoice ${invoiceNumber} - ${brandName}`

    const emailBody = generateInvoiceEmailBody(invoice, deal)

    // Send email
    const emailOptions: any = {
      replyTo: invoice.creatorSnapshot.email
    }

    // If PDF was generated, attach it
    if (pdfBuffer) {
      emailOptions.attachments = [{
        filename: `Invoice-${invoiceNumber}.pdf`,
        content: pdfBuffer,
        type: 'application/pdf'
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
    await (emit as any)({
      topic: 'invoice.sent',
      data: {
        invoiceId,
        dealId: invoice.dealId,
        creatorId: invoice.creatorId,
        recipientEmail: invoice.brandSnapshot.email,
        emailId: emailResult.emailId
      }
    })

    await (emit as any)({
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
  const creatorName = invoice.creatorSnapshot.fullName || invoice.creatorSnapshot.businessName || invoice.creatorSnapshot.name || 'Creator'
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

  let body = `Hi ${brandName},\n\n`
  body += `Hope you're doing well!\n\n`
  body += `I'm sharing the invoice for our recent collaboration${invoice.campaignName ? ' on ' + invoice.campaignName : ''}. Please find the PDF attached to this email.\n\n`
  body += `Summary:\n`
  body += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
  body += `• Invoice #: ${invoiceNumber}\n`
  body += `• Date: ${invoiceDate}\n`
  body += `• Amount: INR ${invoice.amount.toLocaleString('en-IN')}\n`
  if (invoice.gstAmount) {
    body += `• GST (18%): INR ${invoice.gstAmount.toLocaleString('en-IN')}\n`
  }
  body += `• Net Payable: INR ${(invoice.netPayable || (invoice.amount + (invoice.gstAmount || 0))).toLocaleString('en-IN')}\n`
  body += `• Due Date: ${dueDate}\n`
  body += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`

  body += `You can find the bank details in the attached PDF for processing the payment.\n\n`
  body += `If you have any questions, feel free to reply to this email!\n\n`
  body += `Best regards,\n${creatorName}`

  return body
}
