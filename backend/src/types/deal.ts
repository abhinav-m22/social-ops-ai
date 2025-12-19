
type DealStatus =
    | 'new'
    | 'awaiting_details'
    | 'awaiting_response'
    | 'inquiry'
    | 'negotiating'
    | 'active'
    | 'completed'
    | 'cancelled'
    | 'declined'

type ConfidenceLevel = 'high' | 'medium' | 'low'

export interface Deal {
    dealId: string
    inquiryId: string
    creatorId: string

    status: DealStatus
    platform?: 'facebook' | 'email' | 'instagram' | 'youtube' | 'unknown'

    brand: {
        name: string
        contactPerson?: string
        email: string | null
        pageName?: string
        platformAccountId?: string
        logoUrl?: string
    }

    message?: string

    confidenceScore?: number
    confidenceLevel?: ConfidenceLevel
    confidenceReasons?: string[]
    redFlags?: string[]

    autoReplySent?: boolean
    autoReplyAt?: string
    autoReplyMessage?: string
    aiSuggestedReply?: string

    // Creator action tracking
    creatorReplySent?: boolean
    creatorReplyAt?: string
    creatorReplyMessage?: string
    creatorReplyAction?: 'send_proposal' | 'edit_send' | 'decline'

    terms: {
        deliverables: Array<{
            id: string
            type: string
            count: number
            description: string
            dueDate: string
            status: 'pending' | 'in_progress' | 'submitted' | 'approved'
        }>
        proposedBudget?: number
        agreedRate: number
        gst: number
        tds?: number
        total: number
    }

    timeline: {
        inquiryReceived: string
        ratesCalculated: string | null
        dealCreated: string
        autoReplySent?: string | null
        contractSent?: string | null
        signatureReceived?: string | null
        deliverablesDue?: Array<{ id: string; dueDate: string }>
    }

    history: Array<{
        timestamp: string
        event: string
        data: any
    }>

    extractedData?: any
    source?: string
    rawInquiry?: any
}
