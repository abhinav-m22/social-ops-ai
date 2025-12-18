/**
 * API endpoint: Update Invoice Draft
 * PUT/PATCH /api/invoice/draft/:invoiceId
 * 
 * Allows updating draft invoice details before sending
 */
import type { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { updateInvoiceInputSchema, updateInvoiceResponseSchema } from './schemas'
import { updateInvoice, getInvoice } from './service'

export const config: ApiRouteConfig = {
  name: 'UpdateInvoiceDraft',
  type: 'api',
  path: '/api/invoice/draft/:invoiceId',
  method: 'PUT',
  description: 'Updates a draft invoice with new details',
  emits: ['invoice.updated'],
  flows: ['invoice'],
  bodySchema: updateInvoiceInputSchema.omit({ invoiceId: true }),
  responseSchema: {
    200: z.object({
      success: z.boolean(),
      invoice: z.any()
    }),
    400: z.object({
      success: z.boolean(),
      error: z.string(),
      issues: z.array(z.any()).optional()
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

export const handler: Handlers['UpdateInvoiceDraft'] = async (
  req,
  { logger, state, emit }
) => {
  const { invoiceId } = req.pathParams || {}
  const updates = req.body

  logger.info('UpdateInvoiceDraft: received request', {
    invoiceId,
    updates: Object.keys(updates || {})
  })

  if (!invoiceId) {
    return {
      status: 400,
      body: {
        success: false,
        error: 'invoiceId is required in path'
      }
    }
  }

  try {
    // Validate updates
    const validationSchema = updateInvoiceInputSchema.omit({ invoiceId: true })
    const parsed = validationSchema.safeParse(updates)
    
    if (!parsed.success) {
      logger.warn('UpdateInvoiceDraft: validation failed', {
        issues: parsed.error.issues
      })
      return {
        status: 400,
        body: {
          success: false,
          error: 'Invalid request data',
          issues: parsed.error.issues
        }
      }
    }

    // Check if invoice exists
    const existing = await getInvoice(invoiceId, state)
    if (!existing) {
      return {
        status: 404,
        body: {
          success: false,
          error: 'Invoice not found'
        }
      }
    }

    // Update invoice
    const result = await updateInvoice(invoiceId, parsed.data, state)

    if (!result.success) {
      return {
        status: 400,
        body: {
          success: false,
          error: result.error || 'Failed to update invoice'
        }
      }
    }

    logger.info('UpdateInvoiceDraft: invoice updated', {
      invoiceId,
      previousStatus: existing.status,
      newStatus: result.invoice?.status,
      updatedFields: Object.keys(parsed.data)
    })

    // Emit update event
    await emit({
      topic: 'invoice.updated',
      data: {
        invoiceId,
        dealId: result.invoice!.dealId,
        previousStatus: existing.status,
        newStatus: result.invoice!.status,
        updatedFields: Object.keys(parsed.data)
      }
    })

    return {
      status: 200,
      body: {
        success: true,
        invoice: result.invoice
      }
    }
  } catch (error: any) {
    logger.error('UpdateInvoiceDraft: error', {
      invoiceId,
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


