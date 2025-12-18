import { Deal } from "@/types/deal"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000"

const handle = async <T>(res: Response) => {
  if (!res.ok) {
    const msg = await res.text()
    throw new Error(msg || `Request failed (${res.status})`)
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

