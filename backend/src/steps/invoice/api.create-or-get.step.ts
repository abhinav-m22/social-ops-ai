/**
 * API endpoint: Create or Get Invoice for Deal
 * POST /api/invoice/create-or-get
 * 
 * Manually triggers invoice creation for a deal.
 * Useful when:
 * - Deal is accepted but invoice wasn't created automatically
 * - Testing invoice creation
 * - Manual invoice creation needed
 */
import type { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { invoiceSchema } from './schemas'
import { createOrGetDraftInvoice, getInvoiceByDealId } from './service'

export const config: ApiRouteConfig = {
  name: 'CreateOrGetInvoice',
  type: 'api',
  path: '/api/invoice/create-or-get',
  method: 'POST',
  description: 'Create or get invoice for a deal (idempotent)',
  emits: ['invoice.draft_created'],
  flows: ['invoice'],
  bodySchema: z.object({
    dealId: z.string(),
    creatorId: z.string().optional()
  }),
  responseSchema: {
    200: z.object({
      success: z.boolean(),
      status: z.enum(['created', 'exists']),
      invoice: invoiceSchema
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

export const handler: Handlers['CreateOrGetInvoice'] = async (
  req,
  { logger, state, emit }
) => {
  const { dealId, creatorId } = req.body || {}

  logger.info('CreateOrGetInvoice: received request', {
    dealId,
    creatorId
  })

  if (!dealId) {
    return {
      status: 400,
      body: {
        success: false,
        error: 'dealId is required'
      }
    }
  }

  try {
    // Fetch the deal
    const deal = await state.get('deals', dealId)

    if (!deal) {
      logger.error('CreateOrGetInvoice: Deal not found', {
        dealId
      })
      return {
        status: 404,
        body: {
          success: false,
          error: 'Deal not found'
        }
      }
    }

    // Fetch creator profile
    const effectiveCreatorId = creatorId || deal.creatorId || 'default-creator'
    let creatorProfile = await state.get('creatorProfiles', effectiveCreatorId)

    if (!creatorProfile) {
      logger.warn('CreateOrGetInvoice: Creator profile not found, using minimal defaults', {
        creatorId: effectiveCreatorId
      })
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
      state
    )

    if (result.status === 'created') {
      logger.info('CreateOrGetInvoice: New invoice created', {
        invoiceId: result.invoice.invoiceId,
        dealId,
        status: result.invoice.status
      })

      // Emit event for newly created invoices
      await emit({
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
    } else {
      logger.info('CreateOrGetInvoice: Invoice already exists', {
        invoiceId: result.invoice.invoiceId,
        dealId,
        status: result.invoice.status
      })
    }

    return {
      status: 200,
      body: {
        success: true,
        status: result.status,
        invoice: result.invoice
      }
    }
  } catch (error: any) {
    logger.error('CreateOrGetInvoice: error', {
      dealId,
      error: error.message,
      stack: error.stack
    })

    return {
      status: 500,
      body: {
        success: false,
        error: 'Failed to create or get invoice'
      }
    }
  }
}


