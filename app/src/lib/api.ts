import { Deal } from "@/types/deal"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000"

const handle = async <T>(res: Response) => {
  if (!res.ok) {
    const msg = await res.text()
    const error = new Error(msg || `Request failed (${res.status})`)
    ;(error as any).status = res.status
    throw error
  }
  return (await res.json()) as T
}

export const fetchDeals = async (): Promise<Deal[]> => {
  const res = await fetch(`${API_BASE}/api/deals`, { cache: "no-store" })
  const data = await handle<{ deals: Deal[] }>(res)
  return data.deals || []
}

export const sendSmartReply = async (dealId: string, message?: string, action?: string) => {
  const res = await fetch(`${API_BASE}/api/deals/${dealId}/auto-reply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, mode: "smart", action: action || "send_proposal" }),
  })
  return handle<{ deal: Deal }>(res)
}

export const updateDeal = async (dealId: string, updates: Partial<Deal>) => {
  const res = await fetch(`${API_BASE}/api/deals/${dealId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  })
  return handle<{ deal: Deal }>(res)
}

export const submitNegotiationAction = async (
  dealId: string,
  action: "accept" | "counter" | "decline",
  amount?: number,
  message?: string
) => {
  const res = await fetch(`${API_BASE}/api/deals/${dealId}/auto-reply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "negotiation",
      action,
      amount,
      message,
    }),
  })
  return handle<{ deal: Deal }>(res)
}

export const fetchCreatorProfile = async (creatorId: string) => {
  const res = await fetch(`${API_BASE}/api/creator/profile?creatorId=${encodeURIComponent(creatorId)}`, {
    cache: "no-store",
  })
  const data = await handle<{ exists: boolean; profile?: any }>(res)
  return data.exists ? data.profile : null
}

export const createOrUpdateCreatorProfile = async (data: any) => {
  const res = await fetch(`${API_BASE}/api/creator/profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  return handle<{ success: boolean; profile: any }>(res)
}

// Invoice API functions
export const fetchInvoiceByDealId = async (dealId: string) => {
  try {
    const res = await fetch(`${API_BASE}/api/invoice/by-deal/${encodeURIComponent(dealId)}`, {
      cache: "no-store",
    })
    if (res.status === 404) {
      return null // Invoice doesn't exist yet
    }
    const data = await handle<{ success: boolean; invoice?: any }>(res)
    return data.invoice || null
  } catch (error: any) {
    if (error.status === 404) {
      return null // Invoice doesn't exist yet
    }
    throw error
  }
}

export const sendInvoiceEmail = async (invoiceId: string) => {
  const res = await fetch(`${API_BASE}/api/invoice/${invoiceId}/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  })
  return handle<{ success: boolean; message: string; emailId?: string; invoice: any }>(res)
}

// FinanceHub API functions
export interface FinanceData {
  summary: {
    totalEarnings: number
    totalGST: number
    totalTDS: number
    netReceivable: number
    dealCount: number
  }
  platformData: Array<{
    platform: string
    earnings: number
    count: number
  }>
  monthlyTrend: Array<{
    month: string
    earnings: number
    gst: number
    tds: number
  }>
  gst: {
    collected: number
    estimatedPayable: number
    tableData: Array<{
      dealId: string
      invoiceId: string
      brand: string
      amount: number
      gst: number
      total: number
      createdAt: string
    }>
  }
  tds: {
    totalDeducted: number
    dealsWithTDS: number
    tableData: Array<{
      dealId: string
      brand: string
      grossAmount: number
      tds: number
      netAmount: number
      createdAt: string
    }>
  }
}

export const fetchFinanceData = async (): Promise<FinanceData> => {
  const res = await fetch(`${API_BASE}/api/finance`, { cache: "no-store" })
  const data = await handle<{ success: boolean; data: FinanceData }>(res)
  return data.data
}

export const exportFinancePDF = async (): Promise<Blob> => {
  const res = await fetch(`${API_BASE}/api/finance/export/pdf`, { cache: "no-store" })
  if (!res.ok) {
    const msg = await res.text()
    throw new Error(msg || `Export failed (${res.status})`)
  }
  return await res.blob()
}

export const exportFinanceExcel = async (): Promise<Blob> => {
  const res = await fetch(`${API_BASE}/api/finance/export/excel`, { cache: "no-store" })
  if (!res.ok) {
    const msg = await res.text()
    throw new Error(msg || `Export failed (${res.status})`)
  }
  return await res.blob()
}

export const generateFinanceInsights = async (financeData: FinanceData): Promise<string> => {
  const res = await fetch(`${API_BASE}/api/finance/insights`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: financeData }),
    cache: "no-store"
  })
  const data = await handle<{ success: boolean; insights: string; generatedAt: string }>(res)
  return data.insights
}
// Competitor Benchmarking API functions
export const triggerCompetitorAnalysis = async (creatorId: string, force?: boolean) => {
  const res = await fetch(`${API_BASE}/competitor/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creatorId, force }),
  })
  return handle<{ success: boolean; message: string; workflowId?: string; error?: string; status?: string }>(res)
}

export const getCompetitorBenchmarking = async (creatorId: string) => {
  try {
    const res = await fetch(`${API_BASE}/competitor/analyze?creatorId=${encodeURIComponent(creatorId)}`, {
      cache: "no-store",
    })
    if (res.status === 404) {
      return { success: false, error: 'No benchmarking data found' }
    }
    return handle<{ success: boolean; state?: any; error?: string }>(res)
  } catch (error: any) {
    if (error.status === 404) {
      return { success: false, error: 'No benchmarking data found' }
    }
    throw error
  }
}

