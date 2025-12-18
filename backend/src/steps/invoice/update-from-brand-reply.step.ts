/**
 * Event Step: Update Invoice from Brand Reply
 * 
 * When brand replies on Facebook with missing details:
 * 1. Extract email/other details from message
 * 2. Map sender → deal → invoice
 * 3. Update invoice brandSnapshot
 * 4. Recalculate status (draft if email now exists)
 * 
 * Subscribes to: message.enriched (for Facebook messages)
 * Emits: invoice.updated, invoice.details_received
 */
import type { EventConfig, Handlers } from 'motia'
import { getInvoiceByDealId, updateInvoice } from './service'

export const config: EventConfig = {
  name: 'UpdateInvoiceFromBrandReply',
  type: 'event',
  subscribes: ['message.enriched'],
  emits: ['invoice.updated', 'invoice.details_received'],
  description: 'Updates invoice when brand replies with missing details',
  flows: ['invoice'],
  input: {
    type: 'object',
    properties: {
      messageId: { type: 'string' },
      source: { type: 'string' },
      body: { type: 'string' },
      senderId: { type: 'string' },
      sender: { type: 'object' }
    },
    required: ['messageId', 'source', 'body']
  }
}

/**
 * Extract email from message text
 */
function extractEmail(text: string): string | null {
  if (!text) return null
  
  // Common email regex
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
  const matches = text.match(emailRegex)
  
  if (matches && matches.length > 0) {
    // Return first valid email found
    return matches[0].toLowerCase().trim()
  }
  
  return null
}

/**
 * Extract GSTIN from message text
 */
function extractGSTIN(text: string): string | null {
  if (!text) return null
  
  // GSTIN format: 29ABCDE1234F1Z5 (15 characters, alphanumeric)
  const gstinRegex = /\b[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}\b/gi
  const matches = text.match(gstinRegex)
  
  if (matches && matches.length > 0) {
    return matches[0].toUpperCase().trim()
  }
  
  return null
}

export const handler: any = async (
  input: any,
  ctx: any
) => {
  const { messageId, source, body, senderId, sender } = input

  ctx.logger.info('='.repeat(80))
  ctx.logger.info(`UpdateInvoiceFromBrandReply: Processing message ${messageId}`)
  ctx.logger.info('='.repeat(80))

  // Only process Facebook messages
  if (source !== 'facebook') {
    ctx.logger.debug('UpdateInvoiceFromBrandReply: Not a Facebook message, skipping', {
      source,
      messageId
    })
    return
  }

  if (!senderId) {
    ctx.logger.debug('UpdateInvoiceFromBrandReply: No senderId, skipping', {
      messageId
    })
    return
  }

  try {
    // Find deal by Facebook sender ID
    const allDeals = await ctx.state.getGroup('deals')
    const deal = (allDeals || []).find((d: any) => 
      d.platform === 'facebook' &&
      (d.brand?.platformAccountId === senderId || 
       d.brand?.senderId === senderId) &&
      d.status === 'active' // Only active deals need invoices
    )

    if (!deal) {
      ctx.logger.debug('UpdateInvoiceFromBrandReply: No active deal found for sender', {
        senderId,
        messageId
      })
      return
    }

    // Get invoice for this deal
    const invoice = await getInvoiceByDealId(deal.dealId, ctx.state)
    
    if (!invoice) {
      ctx.logger.debug('UpdateInvoiceFromBrandReply: No invoice found for deal', {
        dealId: deal.dealId,
        messageId
      })
      return
    }

    // Only update if invoice is awaiting_details
    if (invoice.status !== 'awaiting_details') {
      ctx.logger.debug('UpdateInvoiceFromBrandReply: Invoice not awaiting details, skipping', {
        invoiceId: invoice.invoiceId,
        status: invoice.status
      })
      return
    }

    // Extract details from message body
    const extractedEmail = extractEmail(body)
    const extractedGSTIN = extractGSTIN(body)
    
    // Check if message contains any relevant details
    const hasEmail = !!extractedEmail
    const hasGSTIN = !!extractedGSTIN
    const hasAddress = body.length > 50 && (
      body.toLowerCase().includes('address') ||
      body.toLowerCase().includes('street') ||
      body.toLowerCase().includes('road') ||
      body.toLowerCase().includes('city') ||
      body.toLowerCase().includes('pincode') ||
      body.toLowerCase().includes('pin code')
    )

    if (!hasEmail && !hasGSTIN && !hasAddress) {
      ctx.logger.debug('UpdateInvoiceFromBrandReply: No invoice details found in message', {
        invoiceId: invoice.invoiceId,
        messageId,
        bodyPreview: body.substring(0, 100)
      })
      return
    }

    // Build update object
    const brandSnapshotUpdate: any = {}
    
    if (hasEmail) {
      brandSnapshotUpdate.email = extractedEmail
      ctx.logger.info('UpdateInvoiceFromBrandReply: Extracted email from message', {
        invoiceId: invoice.invoiceId,
        email: extractedEmail
      })
    }
    
    if (hasGSTIN) {
      brandSnapshotUpdate.gstin = extractedGSTIN
      ctx.logger.info('UpdateInvoiceFromBrandReply: Extracted GSTIN from message', {
        invoiceId: invoice.invoiceId,
        gstin: extractedGSTIN
      })
    }
    
    if (hasAddress) {
      // Extract address (take first substantial paragraph)
      const addressMatch = body.match(/(?:address|street|road|city|pincode|pin code)[\s:]*([^\n]{20,200})/i)
      if (addressMatch && addressMatch[1]) {
        brandSnapshotUpdate.address = addressMatch[1].trim()
        ctx.logger.info('UpdateInvoiceFromBrandReply: Extracted address from message', {
          invoiceId: invoice.invoiceId,
          addressPreview: brandSnapshotUpdate.address.substring(0, 50)
        })
      }
    }

    if (Object.keys(brandSnapshotUpdate).length === 0) {
      ctx.logger.debug('UpdateInvoiceFromBrandReply: No valid details to update', {
        invoiceId: invoice.invoiceId
      })
      return
    }

    // Update invoice
    const updateResult = await updateInvoice(invoice.invoiceId, {
      brandSnapshot: brandSnapshotUpdate
    }, ctx.state)

    if (!updateResult.success || !updateResult.invoice) {
      ctx.logger.error('UpdateInvoiceFromBrandReply: Failed to update invoice', {
        invoiceId: invoice.invoiceId,
        error: updateResult.error
      })
      return
    }

    const updatedInvoice = updateResult.invoice
    const statusChanged = updatedInvoice.status !== invoice.status

    ctx.logger.info('UpdateInvoiceFromBrandReply: ✅ Invoice updated successfully', {
      invoiceId: invoice.invoiceId,
      dealId: deal.dealId,
      previousStatus: invoice.status,
      newStatus: updatedInvoice.status,
      updatedFields: Object.keys(brandSnapshotUpdate),
      statusChanged
    })

    // Emit events
    await ctx.emit({
      topic: 'invoice.updated',
      data: {
        invoiceId: invoice.invoiceId,
        dealId: deal.dealId,
        previousStatus: invoice.status,
        newStatus: updatedInvoice.status,
        updatedFields: Object.keys(brandSnapshotUpdate),
        statusChanged
      }
    })

    if (statusChanged && updatedInvoice.status === 'draft') {
      await ctx.emit({
        topic: 'invoice.details_received',
        data: {
          invoiceId: invoice.invoiceId,
          dealId: deal.dealId,
          missingFieldsResolved: true,
          newStatus: 'draft'
        }
      })
    }

    ctx.logger.info('='.repeat(80))

  } catch (error: any) {
    ctx.logger.error('UpdateInvoiceFromBrandReply: Error', {
      messageId,
      senderId,
      error: error.message,
      stack: error.stack
    })

    // Don't throw - this is a background process
  }
}

