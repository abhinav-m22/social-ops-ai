/**
 * API endpoint: Get Invoice
 * GET /api/invoice/:invoiceId
 * 
 * Returns a single invoice by ID or by dealId
 */
import type { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { invoiceSchema } from './schemas'
import { getInvoice, getInvoiceByDealId } from './service'

export const config: ApiRouteConfig = {
  name: 'GetInvoice',
  type: 'api',
  path: '/api/invoice/:invoiceId',
  method: 'GET',
  description: 'Get a single invoice by invoiceId',
  emits: [],
  flows: ['invoice'],
  queryParams: [
    { name: 'dealId', description: 'Alternative: get invoice by dealId instead' }
  ],
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

export const handler: Handlers['GetInvoice'] = async (
  req,
  { logger, state }
) => {
  const { invoiceId } = req.pathParams || {}
  const { dealId } = req.query || {}

  logger.info('GetInvoice: received request', {
    invoiceId,
    dealId
  })

  try {
    let invoice = null

    if (dealId) {
      // Get by dealId
      invoice = await getInvoiceByDealId(dealId, state)
      logger.debug('GetInvoice: searched by dealId', {
        dealId,
        found: !!invoice
      })
    } else if (invoiceId) {
      // Get by invoiceId
      invoice = await getInvoice(invoiceId, state)
      logger.debug('GetInvoice: searched by invoiceId', {
        invoiceId,
        found: !!invoice
      })
    } else {
      return {
        status: 400,
        body: {
          success: false,
          error: 'Either invoiceId or dealId query param is required'
        }
      }
    }

    if (!invoice) {
      return {
        status: 404,
        body: {
          success: false,
          error: 'Invoice not found'
        }
      }
    }

    logger.info('GetInvoice: invoice returned', {
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
    logger.error('GetInvoice: error', {
      invoiceId,
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
