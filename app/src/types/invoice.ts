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

  creatorSnapshot: any // CreatorProfile
  brandSnapshot: BrandSnapshot

  deliverables: string[]
  campaignName?: string
  amount: number

  paymentTerms?: string
  paymentSplit?: string
  additionalNotes?: string

  gstAmount?: number
  tdsAmount?: number
  netPayable?: number

  missingFields?: string[]

  createdAt: string
  updatedAt: string
}

export const invoiceStatusLabels: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  awaiting_details: 'Awaiting Brand Details',
  sent: 'Sent'
}

export const invoiceStatusColors: Record<InvoiceStatus, string> = {
  draft: 'bg-blue-100 text-blue-700 border-blue-200',
  awaiting_details: 'bg-amber-100 text-amber-700 border-amber-200',
  sent: 'bg-green-100 text-green-700 border-green-200'
}
