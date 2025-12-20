/**
 * Service layer for Invoice operations
 * Handles state management and business logic
 */
import type { Invoice, BrandSnapshot, CreateInvoiceResult, UpdateInvoiceResult } from './types.js'

const STATE_GROUP = 'invoices'

/**
 * Get an invoice by invoiceId
 */
export async function getInvoice(
  invoiceId: string,
  state: any
): Promise<Invoice | null> {
  const invoice = await state.get(STATE_GROUP, invoiceId)
  return invoice || null
}

/**
 * Get invoice by dealId (since each deal has only one invoice)
 */
export async function getInvoiceByDealId(
  dealId: string,
  state: any
): Promise<Invoice | null> {
  const allInvoices = await state.getGroup(STATE_GROUP)
  const invoice = (allInvoices || []).find((inv: Invoice) => inv.dealId === dealId)
  return invoice || null
}

/**
 * Create or get draft invoice for a deal
 * This function is idempotent - will return existing invoice if it already exists
 */
export async function createOrGetDraftInvoice(
  dealId: string,
  deal: any,
  creatorProfile: any,
  state: any
): Promise<CreateInvoiceResult> {
  // Check if invoice already exists for this deal
  const existingInvoice = await getInvoiceByDealId(dealId, state)

  if (existingInvoice) {
    return {
      status: 'exists',
      invoice: existingInvoice
    }
  }

  // Create new draft invoice
  const now = new Date().toISOString()
  const invoiceId = `INV-${Date.now()}-${dealId.slice(-6)}`

  // Extract deliverables as strings
  const deliverables = (deal.terms?.deliverables || []).map((d: any) =>
    `${d.count}x ${d.type}${d.description ? ': ' + d.description : ''}`
  )

  // Snapshot brand info from deal
  const brandSnapshot: BrandSnapshot = {
    name: deal.brand?.name,
    email: deal.brand?.email || null,
    pocName: deal.brand?.contactPerson,
    gstin: undefined, // Will be filled later
    address: undefined // Will be filled later
  }

  // Calculate default dates
  const invoiceDate = now
  const dueDateObj = new Date()
  dueDateObj.setDate(dueDateObj.getDate() + (creatorProfile?.defaultPaymentTermsDays || 15))
  const dueDate = dueDateObj.toISOString()

  // Determine initial status based on missing fields
  const missingFields = []
  if (!brandSnapshot.email) {
    missingFields.push('brand.email')
  }

  const initialStatus = missingFields.length > 0 ? 'awaiting_details' : 'draft'

  const invoice: Invoice = {
    invoiceId,
    dealId,
    creatorId: deal.creatorId || 'default-creator',

    status: initialStatus,

    invoiceNumber: undefined, // Will be set when sent
    invoiceDate,
    dueDate,

    creatorSnapshot: creatorProfile || {},
    brandSnapshot,

    deliverables,
    campaignName: deal.extractedData?.campaign?.name,
    amount: deal.terms?.agreedRate || deal.terms?.total || 0,

    gstAmount: deal.terms?.gst || 0,
    tdsAmount: undefined,
    netPayable: deal.terms?.total || undefined,

    missingFields: missingFields.length > 0 ? missingFields : undefined,

    createdAt: now,
    updatedAt: now
  }

  // Save to state
  await state.set(STATE_GROUP, invoiceId, invoice)

  return {
    status: 'created',
    invoice
  }
}

/**
 * Update an existing invoice
 */
export async function updateInvoice(
  invoiceId: string,
  updates: Partial<Invoice>,
  state: any
): Promise<UpdateInvoiceResult> {
  const existing = await getInvoice(invoiceId, state)

  if (!existing) {
    return {
      success: false,
      error: 'Invoice not found'
    }
  }

  // Don't allow updates to sent invoices (could be extended with more business rules)
  if (existing.status === 'sent' && updates.status !== 'sent') {
    return {
      success: false,
      error: 'Cannot modify sent invoice'
    }
  }

  const now = new Date().toISOString()

  // Merge updates
  const updated: Invoice = {
    ...existing,
    ...updates,
    invoiceId, // Ensure ID is not changed
    dealId: existing.dealId, // Ensure dealId is not changed
    creatorId: existing.creatorId, // Ensure creatorId is not changed
    updatedAt: now,
    // Merge brandSnapshot if provided
    brandSnapshot: updates.brandSnapshot
      ? { ...existing.brandSnapshot, ...updates.brandSnapshot }
      : existing.brandSnapshot
  }

  // Recalculate missing fields
  const missingFields = []
  if (!updated.brandSnapshot.email) {
    missingFields.push('brand.email')
  }

  updated.missingFields = missingFields.length > 0 ? missingFields : undefined

  // Auto-update status if all required fields are present
  if (updated.status === 'awaiting_details' && missingFields.length === 0) {
    updated.status = 'draft'
  }

  // Save to state
  await state.set(STATE_GROUP, invoiceId, updated)

  return {
    success: true,
    invoice: updated
  }
}

/**
 * Delete an invoice (rarely needed, but included for completeness)
 */
export async function deleteInvoice(
  invoiceId: string,
  state: any
): Promise<boolean> {
  try {
    await state.delete(STATE_GROUP, invoiceId)
    return true
  } catch (error) {
    return false
  }
}


