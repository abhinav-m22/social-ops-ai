/**
 * API endpoint: Get Invoice by Deal ID
 * GET /api/invoice/by-deal/:dealId
 * 
 * Returns a single invoice by dealId
 */
import type { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { invoiceSchema } from './schemas'
import { getInvoiceByDealId } from './service'

export const config: ApiRouteConfig = {
  name: 'GetInvoiceByDeal',
  type: 'api',
  path: '/api/invoice/by-deal/:dealId',
  method: 'GET',
  description: 'Get invoice by dealId',
  emits: [],
  flows: ['invoice'],
  responseSchema: {
    200: z.object({
      success: z.boolean(),
      invoice: invoiceSchema
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

export const handler: Handlers['GetInvoiceByDeal'] = async (
  req,
  { logger, state }
) => {
  const { dealId } = req.pathParams || {}

  logger.info('GetInvoiceByDeal: received request', {
    dealId
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
    const invoice = await getInvoiceByDealId(dealId, state)

    if (!invoice) {
      logger.debug('GetInvoiceByDeal: invoice not found', {
        dealId
      })
      return {
        status: 404,
        body: {
          success: false,
          error: 'Invoice not found for this deal'
        }
      }
    }

    logger.info('GetInvoiceByDeal: invoice returned', {
      invoiceId: invoice.invoiceId,
      dealId: invoice.dealId,
      status: invoice.status
    })

    return {
      status: 200,
      body: {
        success: true,
        invoice
      }
    }
  } catch (error: any) {
    logger.error('GetInvoiceByDeal: error', {
      dealId,
      error: error.message,
      stack: error.stack
    })

    return {
      status: 500,
      body: {
        success: false,
        error: 'Internal server error'
      }
    }
  }
}


