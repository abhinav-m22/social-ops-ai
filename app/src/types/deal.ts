export type DealStatus =
  | "new"
  | "awaiting_details"
  | "awaiting_response"
  | "inquiry"
  | "negotiating"
  | "active"
  | "completed"
  | "cancelled"
  | "declined";

export type ConfidenceLevel = "high" | "medium" | "low";

export interface Deliverable {
  id: string;
  type: string;
  count: number;
  description: string;
  dueDate: string;
  status: "pending" | "in_progress" | "submitted" | "approved";
}

export interface Deal {
  dealId: string;
  inquiryId: string;
  creatorId: string;
  status: DealStatus;
  platform?: string;
  brand: {
    name: string;
    contactPerson?: string | null;
    email: string | null;
    pageName?: string | null;
    platformAccountId?: string | null;
    logoUrl?: string | null;
  };
  message?: string;
  confidenceScore?: number;
  confidenceLevel?: ConfidenceLevel;
  confidenceReasons?: string[];
  redFlags?: string[];
  autoReplySent?: boolean;
  autoReplyAt?: string | null;
  autoReplyMessage?: string | null;
  aiSuggestedReply?: string | null;
  terms: {
    deliverables: Deliverable[];
    proposedBudget?: number | null;
    agreedRate: number;
    gst: number;
    total: number;
  };
  timeline: {
    inquiryReceived: string;
    ratesCalculated: string | null;
    dealCreated: string;
    autoReplySent?: string | null;
    contractSent?: string | null;
    signatureReceived?: string | null;
    deliverablesDue?: Array<{ id: string; dueDate: string }>;
  };
  history: Array<{
    timestamp: string;
    event: string;
    data: any;
  }>;
  extractedData?: any;
  source?: string;
  rawInquiry?: any;
}

export const statusLabels: Record<DealStatus, string> = {
  new: "New",
  awaiting_details: "Awaiting Details",
  awaiting_response: "Awaiting Response",
  inquiry: "Inquiry",
  negotiating: "Negotiating",
  active: "Active",
  completed: "Completed",
  cancelled: "Cancelled",
  declined: "Declined",
};

