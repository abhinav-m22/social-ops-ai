# Invoice Module

Backend-only invoice workflow module for social-ops-ai.

## Overview

This module handles the complete invoice lifecycle for creator-brand deals:
- **One invoice per deal** (enforced)
- **Draft → awaiting_details → sent** status flow
- **Triggered automatically** when deal is accepted

## Architecture

```
steps/invoice/
├── types.ts                      # TypeScript type definitions
├── schemas.ts                    # Zod validation schemas
├── service.ts                    # Business logic layer
├── create-or-get-draft.step.ts  # Event: Creates draft invoice
├── update-draft.step.ts          # API: Updates draft
├── get-invoice.step.ts           # API: Get single invoice
└── get-invoices.step.ts          # API: List all invoices
```

## Invoice Model

```typescript
{
  invoiceId: string           // "INV-{timestamp}-{dealId}"
  dealId: string              // Reference to deal
  creatorId: string           // Creator who owns this invoice
  
  status: 'draft' | 'awaiting_details' | 'sent'
  
  invoiceNumber?: string      // Set when sent
  invoiceDate: string         // ISO date
  dueDate: string            // ISO date (calculated from payment terms)
  
  creatorSnapshot: CreatorProfile    // Snapshot at creation time
  brandSnapshot: {
    name?: string
    email?: string            // MANDATORY for sending
    pocName?: string
    gstin?: string
    address?: string
  }
  
  deliverables: string[]      // From deal.terms.deliverables
  campaignName?: string       // From extracted data
  amount: number              // From deal.terms.total
  
  gstAmount?: number
  tdsAmount?: number
  netPayable?: number
  
  missingFields?: string[]    // Auto-calculated
  
  createdAt: string
  updatedAt: string
}
```

## Status Rules

### `draft`
- All required fields present
- Ready for finalization

### `awaiting_details`
- Missing required brand information
- **Brand email is mandatory** (only mandatory field)
- All other fields are optional

### `sent`
- Invoice has been sent to brand
- No modifications allowed after this point

## API Endpoints

### 1. Get Invoice
```
GET /api/invoice/:invoiceId
GET /api/invoice/:invoiceId?dealId=DEAL-123
```

**Response:**
```json
{
  "success": true,
  "invoice": { ... }
}
```

### 2. List Invoices
```
GET /api/invoices
GET /api/invoices?status=draft
GET /api/invoices?creatorId=creator-1
GET /api/invoices?dealId=DEAL-123
```

**Response:**
```json
{
  "success": true,
  "invoices": [ ... ],
  "count": 5
}
```

### 3. Update Draft
```
PUT /api/invoice/draft/:invoiceId
```

**Body:**
```json
{
  "invoiceNumber": "INV-2024-001",
  "campaignName": "Summer Campaign",
  "brandSnapshot": {
    "email": "brand@example.com",
    "gstin": "29ABCDE1234F1Z5",
    "address": "123 Brand St, City"
  },
  "gstAmount": 1800,
  "tdsAmount": 1000,
  "netPayable": 8800
}
```

**Response:**
```json
{
  "success": true,
  "invoice": { ... }
}
```

## Event Flow

```
deal.accepted
    ↓
[CreateOrGetInvoiceDraft]
    ↓
invoice.draft_created
```

### Event: `deal.accepted`
**Subscribes to:** Emitted when creator accepts a deal

**Input:**
```json
{
  "dealId": "DEAL-123",
  "creatorId": "creator-1"
}
```

### Event: `invoice.draft_created`
**Emits:** When new invoice is created (not for existing ones)

**Data:**
```json
{
  "invoiceId": "INV-...",
  "dealId": "DEAL-123",
  "creatorId": "creator-1",
  "status": "draft" | "awaiting_details",
  "amount": 10000,
  "missingFields": ["brand.email"]
}
```

### Event: `invoice.updated`
**Emits:** When invoice is updated via API

**Data:**
```json
{
  "invoiceId": "INV-...",
  "dealId": "DEAL-123",
  "previousStatus": "awaiting_details",
  "newStatus": "draft",
  "updatedFields": ["brandSnapshot"]
}
```

## Key Features

### ✅ Idempotent Creation
- **One invoice per deal** - calling create multiple times returns existing invoice
- No duplicates possible

### ✅ Auto Status Management
- Status automatically changes from `awaiting_details` → `draft` when all required fields are present
- `missingFields` array auto-calculated on every update

### ✅ Snapshots
- **Creator snapshot** captured at invoice creation
- **Brand snapshot** captured from deal data
- Prevents changes to underlying data from affecting existing invoices

### ✅ Business Rules
- Brand email is **mandatory**
- All other fields are **optional**
- Cannot modify `sent` invoices (enforced in service layer)

## Usage Examples

### Trigger Invoice Creation (Event)
```typescript
// Emit from another step when deal is accepted
await emit({
  topic: 'deal.accepted',
  data: {
    dealId: 'DEAL-123',
    creatorId: 'creator-1'
  }
})
```

### Update Invoice via API
```bash
curl -X PUT http://localhost:3000/api/invoice/draft/INV-123 \
  -H "Content-Type: application/json" \
  -d '{
    "brandSnapshot": {
      "email": "brand@example.com"
    },
    "gstAmount": 1800
  }'
```

### Get Invoice by Deal ID
```bash
curl http://localhost:3000/api/invoice/any?dealId=DEAL-123
```

## Service Layer

All business logic is in `service.ts`:

```typescript
import { 
  createOrGetDraftInvoice,
  updateInvoice,
  getInvoice,
  getInvoiceByDealId
} from './service'

// Usage in steps
const result = await createOrGetDraftInvoice(dealId, deal, creatorProfile, state)
```

## State Management

- **State Group:** `invoices`
- **Key:** `invoiceId`
- Uses Motia's built-in state management
- No database required

## Future Extensions

This module can be extended with:
- Email sending integration (via separate step)
- PDF generation
- Payment tracking
- Tax calculations (GST, TDS)
- Invoice numbering sequences
- Multi-currency support

## Testing

```bash
# Start dev server
npm run dev

# Visit Motia Workbench
open http://localhost:3000/__workbench

# Test event flow
# 1. Create a deal and accept it
# 2. Emit 'deal.accepted' event
# 3. Verify 'invoice.draft_created' is emitted
# 4. Check invoice in state
```

## Notes

- **Backend only** - No UI components
- **No email sending yet** - Will be added in separate module
- **No Facebook replies** - Out of scope for invoices
- Uses **Motia primitives** throughout
- **TypeScript** for type safety
- Follows existing project patterns


