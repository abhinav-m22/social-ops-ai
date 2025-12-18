/**
 * Event Step: Create or Get Invoice Draft
 * Triggered when a deal is accepted by creator
 * 
 * Subscribes to: deal.accepted
 * Emits: invoice.draft_created
 */
import type { EventConfig, Handlers } from 'motia'
import { createOrGetDraftInvoice } from './service'

export const config: EventConfig = {
  name: 'CreateOrGetInvoiceDraft',
  type: 'event',
  subscribes: ['deal.accepted'],
  emits: ['invoice.draft_created'],
  description: 'Creates a draft invoice when a deal is accepted (idempotent)',
  flows: ['invoice'],
  input: {
    type: 'object',
    properties: {
      dealId: { type: 'string' },
      creatorId: { type: 'string' }
    },
    required: ['dealId']
  }
}

export const handler: Handlers['CreateOrGetInvoiceDraft'] = async (
  input,
  ctx
) => {
  const { dealId, creatorId } = input

  ctx.logger.info('='.repeat(80))
  ctx.logger.info(`CreateOrGetInvoiceDraft: Processing for dealId: ${dealId}`)
  ctx.logger.info('='.repeat(80))

  if (!dealId) {
    ctx.logger.error('CreateOrGetInvoiceDraft: Missing dealId')
    return
  }

  try {
    // Fetch the deal from state
    const deal = await ctx.state.get('deals', dealId)

    if (!deal) {
      ctx.logger.error(`CreateOrGetInvoiceDraft: Deal ${dealId} not found`)
      return
    }

    // Only create invoice if deal is in accepted/active status
    if (deal.status !== 'active' && deal.status !== 'accepted') {
      ctx.logger.info(`CreateOrGetInvoiceDraft: Skipping - deal not accepted yet`, {
        dealId,
        status: deal.status
      })
      return
    }

    // Fetch creator profile
    const effectiveCreatorId = creatorId || deal.creatorId || 'default-creator'
    let creatorProfile = await ctx.state.get('creatorProfiles', effectiveCreatorId)

    if (!creatorProfile) {
      ctx.logger.warn(`CreateOrGetInvoiceDraft: Creator profile not found for ${effectiveCreatorId}, using minimal defaults`)
      creatorProfile = {
        creatorId: effectiveCreatorId,
        defaultPaymentTermsDays: 15
      }
    }

    // Create or get invoice
    const result = await createOrGetDraftInvoice(
      dealId,
      deal,
      creatorProfile,
      ctx.state
    )

    if (result.status === 'exists') {
      ctx.logger.info('CreateOrGetInvoiceDraft: Invoice already exists', {
        invoiceId: result.invoice.invoiceId,
        dealId,
        status: result.invoice.status
      })
    } else {
      ctx.logger.info('CreateOrGetInvoiceDraft: New invoice created', {
        invoiceId: result.invoice.invoiceId,
        dealId,
        status: result.invoice.status,
        amount: result.invoice.amount,
        missingFields: result.invoice.missingFields
      })

      // Emit event only for newly created invoices
      await ctx.emit({
        topic: 'invoice.draft_created',
        data: {
          invoiceId: result.invoice.invoiceId,
          dealId,
          creatorId: result.invoice.creatorId,
          status: result.invoice.status,
          amount: result.invoice.amount,
          missingFields: result.invoice.missingFields
        }
      })
    }

    ctx.logger.info('='.repeat(80))

    return {
      success: true,
      status: result.status,
      invoice: result.invoice
    }
  } catch (error: any) {
    ctx.logger.error('CreateOrGetInvoiceDraft: Error', {
      dealId,
      error: error.message,
      stack: error.stack
    })

    throw error
  }
}


