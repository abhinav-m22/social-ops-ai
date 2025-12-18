/**
 * Zod schemas for Invoice validation
 */
import { z } from 'zod'

export const invoiceStatusSchema = z.enum(['draft', 'awaiting_details', 'sent'])

export const brandSnapshotSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  pocName: z.string().optional(),
  gstin: z.string().optional(),
  address: z.string().optional()
})

export const invoiceSchema = z.object({
  invoiceId: z.string(),
  dealId: z.string(),
  creatorId: z.string(),
  
  status: invoiceStatusSchema,
  
  invoiceNumber: z.string().optional(),
  invoiceDate: z.string(),
  dueDate: z.string(),
  
  creatorSnapshot: z.any(), // CreatorProfile
  brandSnapshot: brandSnapshotSchema,
  
  deliverables: z.array(z.string()),
  campaignName: z.string().optional(),
  amount: z.number(),
  
  gstAmount: z.number().optional(),
  tdsAmount: z.number().optional(),
  netPayable: z.number().optional(),
  
  missingFields: z.array(z.string()).optional(),
  
  createdAt: z.string(),
  updatedAt: z.string()
})

export const createInvoiceInputSchema = z.object({
  dealId: z.string().min(1, 'dealId is required')
})

export const createInvoiceResponseSchema = z.object({
  status: z.enum(['created', 'exists']),
  invoice: invoiceSchema
})

export const updateInvoiceInputSchema = z.object({
  invoiceId: z.string().min(1, 'invoiceId is required'),
  invoiceNumber: z.string().optional(),
  invoiceDate: z.string().optional(),
  dueDate: z.string().optional(),
  campaignName: z.string().optional(),
  brandSnapshot: brandSnapshotSchema.partial().optional(),
  gstAmount: z.number().optional(),
  tdsAmount: z.number().optional(),
  netPayable: z.number().optional()
})

export const updateInvoiceResponseSchema = z.object({
  success: z.boolean(),
  invoice: invoiceSchema.optional(),
  error: z.string().optional()
})


