/**
 * Event Step: Request Missing Invoice Details
 * 
 * When invoice is created with missing mandatory brand details:
 * 1. Update invoice status to 'awaiting_details'
 * 2. Send Facebook message asking for missing info
 * 
 * Subscribes to: invoice.draft_created
 * Emits: invoice.awaiting_details, invoice.fb_message_sent
 */
import type { EventConfig, Handlers } from 'motia'
import { getInvoiceByDealId, updateInvoice } from './service'
import { sendMessageWithRetry, validateFacebookCredentials } from '../../lib/integrations/facebookMessenger'

export const config: EventConfig = {
  name: 'RequestMissingInvoiceDetails',
  type: 'event',
  subscribes: ['invoice.draft_created'],
  emits: ['invoice.awaiting_details', 'invoice.fb_message_sent'],
  description: 'Detects missing brand details and requests them via Facebook',
  flows: ['invoice'],
  input: {
    type: 'object',
    properties: {
      invoiceId: { type: 'string' },
      dealId: { type: 'string' },
      creatorId: { type: 'string' },
      status: { type: 'string' },
      missingFields: { type: 'array' }
    },
    required: ['invoiceId', 'dealId']
  }
}

export const handler: any = async (
  input: any,
  ctx: any
) => {
  const { invoiceId, dealId, status, missingFields } = input

  ctx.logger.info('='.repeat(80))
  ctx.logger.info(`RequestMissingInvoiceDetails: Processing invoice ${invoiceId}`)
  ctx.logger.info('='.repeat(80))

  if (!invoiceId || !dealId) {
    ctx.logger.error('RequestMissingInvoiceDetails: Missing invoiceId or dealId')
    return
  }

  try {
    // Get the invoice to check current state
    const invoice = await getInvoiceByDealId(dealId, ctx.state)
    
    if (!invoice) {
      ctx.logger.error(`RequestMissingInvoiceDetails: Invoice not found for dealId ${dealId}`)
      return
    }

    // Check if brand email is missing (mandatory field)
    const isEmailMissing = !invoice.brandSnapshot?.email || invoice.brandSnapshot.email.trim() === ''
    const hasMissingFields = (missingFields && missingFields.length > 0) || isEmailMissing

    if (!hasMissingFields) {
      ctx.logger.info('RequestMissingInvoiceDetails: No missing fields, skipping', {
        invoiceId,
        dealId
      })
      return
    }

    // Only proceed if invoice is in draft status (not already awaiting_details or sent)
    if (invoice.status !== 'draft' && invoice.status !== 'awaiting_details') {
      ctx.logger.info('RequestMissingInvoiceDetails: Invoice not in draft/awaiting_details, skipping', {
        invoiceId,
        currentStatus: invoice.status
      })
      return
    }

    // Get the deal to find Facebook recipient info
    const deal = await ctx.state.get('deals', dealId)
    if (!deal) {
      ctx.logger.error(`RequestMissingInvoiceDetails: Deal ${dealId} not found`)
      return
    }

    // Only proceed for Facebook deals
    if (deal.platform !== 'facebook') {
      ctx.logger.info('RequestMissingInvoiceDetails: Not a Facebook deal, skipping FB message', {
        dealId,
        platform: deal.platform
      })
      
      // Still update status to awaiting_details if email is missing
      if (isEmailMissing) {
        await updateInvoice(invoiceId, {
          status: 'awaiting_details',
          missingFields: ['brand.email']
        }, ctx.state)
        
        await ctx.emit({
          topic: 'invoice.awaiting_details',
          data: {
            invoiceId,
            dealId,
            missingFields: ['brand.email'],
            reason: 'email_missing'
          }
        })
      }
      return
    }

    // Get Facebook recipient ID
    const recipientPsid = deal.brand?.platformAccountId || deal.brand?.senderId
    if (!recipientPsid) {
      ctx.logger.error('RequestMissingInvoiceDetails: Facebook recipient PSID not found', {
        dealId,
        brandData: deal.brand
      })
      
      // Still update status
      if (isEmailMissing) {
        await updateInvoice(invoiceId, {
          status: 'awaiting_details',
          missingFields: ['brand.email']
        }, ctx.state)
      }
      return
    }

    // Validate Facebook credentials
    const fbValidation = validateFacebookCredentials()
    if (!fbValidation.valid) {
      ctx.logger.error('RequestMissingInvoiceDetails: Facebook credentials missing', {
        error: fbValidation.error
      })
      return
    }

    // Build missing fields message
    const missingFieldsList: string[] = []
    if (isEmailMissing) {
      missingFieldsList.push('Billing Email (required)')
    }
    
    // Optional fields (informational only)
    const optionalFields: string[] = []
    if (!invoice.brandSnapshot?.gstin) {
      optionalFields.push('GSTIN (if applicable)')
    }
    if (!invoice.brandSnapshot?.address) {
      optionalFields.push('Company Address')
    }

    // Construct message
    let messageText = `Thanks for confirming the collaboration! 🙌\n\nTo generate and send the invoice, could you please share:\n\n`
    
    if (missingFieldsList.length > 0) {
      messageText += missingFieldsList.map(f => `• ${f}`).join('\n') + '\n\n'
    }
    
    if (optionalFields.length > 0) {
      messageText += optionalFields.map(f => `• ${f} (optional)`).join('\n') + '\n\n'
    }
    
    messageText += `You can reply here directly. Thanks!`

    // Update invoice status to awaiting_details
    const updatedInvoice = await updateInvoice(invoiceId, {
      status: 'awaiting_details',
      missingFields: isEmailMissing ? ['brand.email'] : []
    }, ctx.state)

    if (!updatedInvoice.success || !updatedInvoice.invoice) {
      ctx.logger.error('RequestMissingInvoiceDetails: Failed to update invoice status', {
        invoiceId,
        error: updatedInvoice.error
      })
      return
    }

    // Send Facebook message
    try {
      const fbResult = await sendMessageWithRetry(
        recipientPsid,
        messageText,
        fbValidation.token!,
        ctx.logger,
        2
      )

      ctx.logger.info('RequestMissingInvoiceDetails: Facebook message sent successfully', {
        invoiceId,
        dealId,
        recipientPsid,
        messageId: fbResult.messageId,
        missingFields: isEmailMissing ? ['brand.email'] : []
      })

      // Emit events
      await ctx.emit({
        topic: 'invoice.awaiting_details',
        data: {
          invoiceId,
          dealId,
          creatorId: invoice.creatorId,
          missingFields: isEmailMissing ? ['brand.email'] : [],
          reason: 'email_missing'
        }
      })

      await ctx.emit({
        topic: 'invoice.fb_message_sent',
        data: {
          invoiceId,
          dealId,
          recipientPsid,
          messageId: fbResult.messageId,
          messageType: 'request_missing_details'
        }
      })

      ctx.logger.info('='.repeat(80))
      ctx.logger.info('RequestMissingInvoiceDetails: ✅ Completed successfully')
      ctx.logger.info('='.repeat(80))

    } catch (error: any) {
      ctx.logger.error('RequestMissingInvoiceDetails: Failed to send Facebook message', {
        invoiceId,
        dealId,
        recipientPsid,
        error: error.message,
        stack: error.stack
      })
      
      // Invoice status was already updated, so we still emit awaiting_details
      await ctx.emit({
        topic: 'invoice.awaiting_details',
        data: {
          invoiceId,
          dealId,
          creatorId: invoice.creatorId,
          missingFields: isEmailMissing ? ['brand.email'] : [],
          reason: 'email_missing',
          fbMessageFailed: true
        }
      })
    }

  } catch (error: any) {
    ctx.logger.error('RequestMissingInvoiceDetails: Error', {
      invoiceId,
      dealId,
      error: error.message,
      stack: error.stack
    })

    throw error
  }
}

