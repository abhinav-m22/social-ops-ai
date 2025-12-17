"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Deal } from "@/types/deal"
import { fetchDeals, sendSmartReply, updateDeal } from "@/lib/api"
import { DealCard } from "@/components/DealCard"
import { DealModal } from "@/components/DealModal"
import { NotificationBell, NotificationItem } from "@/components/NotificationBell"
import { Sparkles, Loader2, Plus } from "lucide-react"
import toast from "react-hot-toast"

const DashboardPage = () => {
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [sending, setSending] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      const data = await fetchDeals()
      setDeals(data)
    } catch (error: any) {
      toast.error(error?.message || "Failed to load deals")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 15000)
    return () => clearInterval(interval)
  }, [refresh])

  const addNotification = (title: string, body: string, tone: NotificationItem["tone"] = "info") => {
    setNotifications(prev => [
      ...prev,
      {
        id: `${Date.now()}-${prev.length}`,
        title,
        body,
        tone,
        time: new Date().toLocaleTimeString(),
      },
    ])
  }

  const handleSmartReply = async (deal: Deal, overrideMessage?: string) => {
    try {
      setSending(deal.dealId)
      const res = await sendSmartReply(deal.dealId, overrideMessage)
      setDeals(prev => prev.map(d => (d.dealId === deal.dealId ? res.deal : d)))
      toast.success(`Smart reply sent to ${deal.brand?.name}`)
      addNotification("Smart reply sent", `Auto-replied to ${deal.brand?.name}`, "success")
      setSelectedDeal(res.deal)
    } catch (error: any) {
      toast.error(error?.message || "Failed to send smart reply")
    } finally {
      setSending(null)
    }
  }

  const handleDecline = async (deal: Deal, reason?: string) => {
    try {
      setSending(deal.dealId)
      // Send decline message to Facebook
      const res = await sendSmartReply(deal.dealId, undefined, "decline")
      setDeals(prev => prev.map(d => (d.dealId === deal.dealId ? res.deal : d)))
      toast.success(`Declined ${deal.brand?.name} - message sent`)
      addNotification("Deal declined", `Polite decline sent to ${deal.brand?.name}`, "warning")
      setSelectedDeal(null)
    } catch (error: any) {
      toast.error(error?.message || "Failed to decline")
    } finally {
      setSending(null)
    }
  }

  const handleManualSend = async (message: string) => {
    if (!selectedDeal) return
    await handleSmartReply(selectedDeal, message)
  }

  const grouped = useMemo(() => {
    const newInquiries = deals.filter(d =>
      ["new", "awaiting_details", "awaiting_response", "NEGOTIATION_READY", "RATE_RECOMMENDED"].includes(d.status)
    )
    const active = deals.filter(d =>
      ["active", "negotiating", "FINALIZED"].includes(d.status)
    )
    const completed = deals.filter(d => ["completed", "declined", "cancelled"].includes(d.status))
    return { newInquiries, active, completed }
  }, [deals])

  return (
    <main className="min-h-screen px-6 py-10 lg:px-12 space-y-10 max-w-[1600px] mx-auto">
      <header className="flex items-center justify-between flex-wrap gap-4 pt-4">
        <div>
          <div className="text-sm text-emerald-700 font-semibold flex items-center gap-2 mb-1 bg-emerald-50 w-fit px-3 py-1 rounded-full border border-emerald-100">
            <Sparkles size={14} /> Premium Deals Dashboard
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Creator Collaboration Center</h1>
          <p className="text-gray-500 mt-1 text-lg">Manage brand deals, automate replies, and track your revenue.</p>
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell items={notifications} onClear={() => setNotifications([])} />
          <button className="inline-flex items-center gap-2 rounded-xl bg-gray-900 text-white px-5 py-2.5 text-sm font-medium shadow-lg shadow-gray-900/10 hover:shadow-xl hover:-translate-y-0.5 transition-all">
            <Plus size={18} /> Add Deal
          </button>
        </div>
      </header>

      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              New Inquiries <span className="text-sm font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{grouped.newInquiries.length}</span>
            </h2>
            <p className="text-gray-500 text-sm mt-0.5">Fresh opportunities requiring your attention</p>
          </div>
          {loading && (
            <div className="text-sm text-emerald-600 font-medium flex items-center gap-2 bg-emerald-50 px-3 py-1 rounded-full">
              <Loader2 className="animate-spin" size={14} /> Syncing deals...
            </div>
          )}
        </div>
        {grouped.newInquiries.length === 0 && !loading ? (
          <div className="rounded-3xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-12 text-center">
            <div className="mx-auto w-12 h-12 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center mb-3">
              <Sparkles className="text-gray-400" size={24} />
            </div>
            <h3 className="text-gray-900 font-semibold">No new inquiries</h3>
            <p className="text-gray-500 text-sm mt-1">We'll notify you when a brand reaches out.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {grouped.newInquiries.map(deal => (
              <DealCard
                key={deal.dealId}
                deal={deal}
                busy={sending === deal.dealId}
                onOpen={setSelectedDeal}
                onSendSmartReply={handleSmartReply}
                onDecline={d => handleDecline(d)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-5">
        <div className="flex items-center justify-between border-t border-gray-200 pt-8">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              Active Deals <span className="text-sm font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{grouped.active.length}</span>
            </h2>
            <p className="text-gray-500 text-sm mt-0.5">Contracts, negotiations, and ongoing work</p>
          </div>
        </div>
        {grouped.active.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-12 text-center text-gray-400">
            No active deals right now.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {grouped.active.map(deal => (
              <DealCard
                key={deal.dealId}
                deal={deal}
                variant="active"
                busy={sending === deal.dealId}
                onOpen={setSelectedDeal}
                onSendSmartReply={handleSmartReply}
                onDecline={d => handleDecline(d)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-5">
        <div className="flex items-center justify-between border-t border-gray-200 pt-8">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              Archived <span className="text-sm font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{grouped.completed.length}</span>
            </h2>
            <p className="text-gray-500 text-sm mt-0.5">Completed and declined conversations</p>
          </div>
        </div>
        {grouped.completed.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-8 text-center text-gray-400 text-sm">
            Your history will appear here.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {grouped.completed.map(deal => (
              <DealCard
                key={deal.dealId}
                deal={deal}
                variant="completed"
                busy={sending === deal.dealId}
                onOpen={setSelectedDeal}
                onSendSmartReply={handleSmartReply}
                onDecline={d => handleDecline(d)}
              />
            ))}
          </div>
        )}
      </section>

      <DealModal
        deal={selectedDeal}
        onClose={() => setSelectedDeal(null)}
        onSend={handleManualSend}
        onDecline={reason => (selectedDeal ? handleDecline(selectedDeal, reason) : Promise.resolve())}
      />
    </main>
  )
}

export default DashboardPage

