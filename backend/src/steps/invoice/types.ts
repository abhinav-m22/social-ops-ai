/**
 * TypeScript types for Invoice module
 */

export type InvoiceStatus = 'draft' | 'awaiting_details' | 'sent'

export interface BrandSnapshot {
  name?: string
  email?: string
  pocName?: string
  gstin?: string
  address?: string
}

export interface Invoice {
  invoiceId: string
  dealId: string
  creatorId: string

  status: InvoiceStatus

  invoiceNumber?: string
  invoiceDate: string
  dueDate: string

  creatorSnapshot: any // CreatorProfile type
  brandSnapshot: BrandSnapshot

  deliverables: string[]
  campaignName?: string
  amount: number

  gstAmount?: number
  tdsAmount?: number
  netPayable?: number

  missingFields?: string[]

  createdAt: string
  updatedAt: string
}

export interface CreateInvoiceResult {
  status: 'created' | 'exists'
  invoice: Invoice
}

export interface UpdateInvoiceResult {
  success: boolean
  invoice?: Invoice
  error?: string
}

