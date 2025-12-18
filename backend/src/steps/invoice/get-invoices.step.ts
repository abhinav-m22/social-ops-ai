/**
 * API endpoint: Get All Invoices
 * GET /api/invoices
 * 
 * Returns all invoices with optional filtering
 */
import type { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { invoiceSchema } from './schemas'
import type { Invoice } from './types'

export const config: ApiRouteConfig = {
  name: 'GetInvoices',
  type: 'api',
  path: '/api/invoices',
  method: 'GET',
  description: 'Get all invoices with optional filters',
  emits: [],
  flows: ['invoice'],
  queryParams: [
    { name: 'status', description: 'Filter by status: draft|awaiting_details|sent' },
    { name: 'creatorId', description: 'Filter by creator ID' },
    { name: 'dealId', description: 'Filter by deal ID' }
  ],
  responseSchema: {
    200: z.object({
      success: z.boolean(),
      invoices: z.array(invoiceSchema),
      count: z.number()
    }),
    500: z.object({
      success: z.boolean(),
      error: z.string()
    })
  }
}

export const handler: Handlers['GetInvoices'] = async (
  req,
  { logger, state }
) => {
  const { status, creatorId, dealId } = req.query || {}

  logger.info('GetInvoices: received request', {
    status,
    creatorId,
    dealId
  })

  try {
    // Fetch all invoices from state
    let invoices: Invoice[] = await state.getGroup('invoices')

    logger.debug('GetInvoices: fetched from state', {
      totalCount: invoices.length
    })

    // Apply filters
    if (status) {
      invoices = invoices.filter((inv: Invoice) => inv.status === status)
      logger.debug(`GetInvoices: filtered by status=${status}`, {
        count: invoices.length
      })
    }

    if (creatorId) {
      invoices = invoices.filter((inv: Invoice) => inv.creatorId === creatorId)
      logger.debug(`GetInvoices: filtered by creatorId=${creatorId}`, {
        count: invoices.length
      })
    }

    if (dealId) {
      invoices = invoices.filter((inv: Invoice) => inv.dealId === dealId)
      logger.debug(`GetInvoices: filtered by dealId=${dealId}`, {
        count: invoices.length
      })
    }

    // Sort by creation date (newest first)
    invoices.sort((a: Invoice, b: Invoice) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    logger.info('GetInvoices: returning invoices', {
      count: invoices.length
    })

    return {
      status: 200,
      body: {
        success: true,
        invoices,
        count: invoices.length
      }
    }
  } catch (error: any) {
    logger.error('GetInvoices: error', {
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
