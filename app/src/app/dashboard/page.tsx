"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Deal } from "@/types/deal"
import { fetchDeals, sendSmartReply, updateDeal, clearNotifications } from "@/lib/api"
import { DealCard } from "@/components/DealCard"
import { DealModal } from "@/components/DealModal"
import { NotificationBell, NotificationItem } from "@/components/NotificationBell"
import { useStreamGroup } from "@motiadev/stream-client-react"
import { NewDealPopup } from "@/components/NewDealPopup"
import {
  Sparkles, Loader2, Plus, TrendingUp, Clock, MessageSquare,
  Briefcase, FileText, BarChart3, Zap, ArrowRight
} from "lucide-react"
import Link from "next/link"
import toast from "react-hot-toast"
import { AppLayout } from "@/components/AppLayout"
import { NumberTicker } from "@/components/ui/number-ticker"
import { ShimmerButton } from "@/components/ui/shimmer-button"
import { cn } from "@/lib/utils"

const DashboardPage = () => {
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [sending, setSending] = useState<string | null>(null)
  const [alertDeal, setAlertDeal] = useState<Deal | null>(null)

  // Stream subscription for deals
  const dealsConfig = useMemo(() => ({
    streamName: "deals",
    groupId: "all-deals",
  }), [])

  const { data: streamedDeals } = useStreamGroup<any>(dealsConfig)

  // Stream subscription for notifications
  const notifsConfig = useMemo(() => ({
    streamName: "notifications",
    groupId: "default-creator",
  }), [])

  const { data: streamedNotifs } = useStreamGroup<any>(notifsConfig)

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

  // Initial load
  useEffect(() => {
    refresh()
  }, [refresh])

  // Sync streamed deals
  useEffect(() => {
    if (streamedDeals && streamedDeals.length > 0) {
      setDeals(prevDeals => {
        // Merge streamed deals with existing deals
        const merged = [...prevDeals]
        streamedDeals.forEach((sDeal: any) => {
          // In Motia streams, the item's ID is often in the 'id' property
          const dealId = sDeal.dealId || sDeal.id
          const idx = merged.findIndex(d => d.dealId === dealId)
          if (idx !== -1) {
            merged[idx] = sDeal
          } else {
            merged.unshift(sDeal)
            // Trigger unique popup for truly new deals
            if (prevDeals.length > 0) {
              setAlertDeal(sDeal)
            }
          }
        })
        return merged
      })

      // Update currently open modal if it matches a streamed deal
      streamedDeals.forEach((sDeal: any) => {
        const dealId = sDeal.dealId || sDeal.id
        if (selectedDeal && selectedDeal.dealId === dealId) {
          setSelectedDeal(sDeal)
        }
      })
    }
  }, [streamedDeals, selectedDeal])

  // Sync streamed notifications
  useEffect(() => {
    if (streamedNotifs && streamedNotifs.length > 0) {
      setNotifications(prev => {
        const newNotifs = streamedNotifs
          .filter(sn => !prev.some(p => p.id === sn.id))
          .map(sn => ({
            id: sn.id,
            title: sn.title,
            body: sn.body,
            tone: sn.tone,
            time: new Date().toLocaleTimeString(),
          }))

        if (newNotifs.length === 0) return prev
        return [...prev, ...newNotifs]
      })
    }
  }, [streamedNotifs])

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

  // Calculate stats
  const stats = useMemo(() => {
    const totalDeals = deals.length
    const thisMonthEarnings = deals
      .filter(d => d.status === "completed" && d.terms?.total)
      .reduce((sum, d) => sum + (d.terms?.total || 0), 0)
    const pendingPayments = deals.filter(d =>
      d.status === "active" && d.terms?.total
    ).length
    const activeNegotiations = grouped.active.length

    return { totalDeals, thisMonthEarnings, pendingPayments, activeNegotiations }
  }, [deals, grouped])

  return (
    <AppLayout
      notifications={notifications}
      onClearNotifications={async () => {
        try {
          await clearNotifications()
          setNotifications([])
        } catch (error) {
          console.error("Failed to clear notifications:", error)
          setNotifications([]) // Fallback to local clear
        }
      }}
    >
      <NewDealPopup
        deal={alertDeal}
        onClose={() => setAlertDeal(null)}
        onView={() => {
          setSelectedDeal(alertDeal)
          setAlertDeal(null)
        }}
      />
      {/* Hero Stats Section */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
            <p className="text-slate-600 mt-1">Welcome back! Here's your overview.</p>
          </div>
          <Link href="/creator/profile">
            <button className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white px-5 py-2.5 text-sm font-medium shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">
              <Plus size={18} /> Add Deal
            </button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Deals */}
          <StatCard
            icon={Briefcase}
            label="Total Deals"
            value={stats.totalDeals}
            iconColor="indigo"
          />

          {/* This Month Earnings */}
          <StatCard
            icon={TrendingUp}
            label="This Month"
            value={stats.thisMonthEarnings}
            prefix="₹"
            iconColor="cyan"
          />

          {/* Pending Payments */}
          <StatCard
            icon={Clock}
            label="Pending Payments"
            value={stats.pendingPayments}
            iconColor={stats.pendingPayments > 0 ? "amber" : "slate"}
          />

          {/* Active Negotiations */}
          <StatCard
            icon={MessageSquare}
            label="Active Negotiations"
            value={stats.activeNegotiations}
            iconColor="indigo"
          />
        </div>
      </section>

      {/* Main Content Grid - Full Width */}{
      }      <div className="space-y-8">
        {/* Main Content: Deals */}
        <div className="space-y-8">
          {/* New Inquiries */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  New Inquiries
                  <span className="text-sm font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    {grouped.newInquiries.length}
                  </span>
                </h2>
                <p className="text-slate-600 text-sm mt-0.5">Fresh opportunities requiring your attention</p>
              </div>
              {loading && (
                <div className="shrink-0 p-3 bg-indigo-50 rounded-xl text-indigo-600 flex items-center gap-2">
                  <Loader2 className="animate-spin" size={14} /> Syncing...
                </div>
              )}
            </div>
            {grouped.newInquiries.length === 0 && !loading ? (
              <EmptyState
                icon={Sparkles}
                title="No new inquiries"
                description="We'll notify you when a brand reaches out."
              />
            ) : (
              <div className="grid md:grid-cols-3 gap-4">
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

          {/* Active Deals */}
          <section className="space-y-4">
            <div className="flex items-center justify-between border-t border-slate-200 pt-8">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  Active Deals
                  <span className="text-sm font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    {grouped.active.length}
                  </span>
                </h2>
                <p className="text-slate-600 text-sm mt-0.5">Ongoing contracts and negotiations</p>
              </div>
            </div>
            {grouped.active.length === 0 ? (
              <EmptyState
                icon={MessageSquare}
                title="No active deals"
                description="Your active negotiations will appear here."
              />
            ) : (
              <div className="grid md:grid-cols-3 gap-4">
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

          {/* Completed */}
          <section className="space-y-4">
            <div className="flex items-center justify-between border-t border-slate-200 pt-8">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  Archived
                  <span className="text-sm font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    {grouped.completed.length}
                  </span>
                </h2>
                <p className="text-slate-600 text-sm mt-0.5">Completed and declined deals</p>
              </div>
            </div>
            {grouped.completed.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No archived deals"
                description="Your completed deals will appear here."
              />
            ) : (
              <div className="grid md:grid-cols-3 gap-4">
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
        </div>


      </div>

      <DealModal
        deal={selectedDeal}
        onClose={() => setSelectedDeal(null)}
        onSend={handleManualSend}
        onDecline={reason => (selectedDeal ? handleDecline(selectedDeal, reason) : Promise.resolve())}
      />
    </AppLayout>
  )
}

// Stat Card Component
function StatCard({
  icon: Icon,
  label,
  value,
  prefix = "",
  iconColor = "indigo"
}: {
  icon: any
  label: string
  value: number
  prefix?: string
  iconColor?: "indigo" | "cyan" | "amber" | "slate"
}) {
  const colorClasses = {
    indigo: "bg-indigo-100 text-indigo-600",
    cyan: "bg-cyan-100 text-cyan-600",
    amber: "bg-amber-100 text-amber-600",
    slate: "bg-slate-100 text-slate-600",
  }

  return (
    <div className="group bg-white rounded-xl border border-slate-200 shadow-sm p-6 hover:shadow-lg hover:border-indigo-300 transition-all">
      <div className="flex items-start justify-between mb-4">
        <p className="text-sm font-medium text-slate-600 uppercase tracking-wide">{label}</p>
        <div className={cn("p-2 rounded-lg", colorClasses[iconColor])}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="flex items-baseline gap-1">
        {prefix && <span className="text-2xl font-bold text-slate-900">{prefix}</span>}
        <NumberTicker
          value={value}
          className="text-3xl font-bold text-slate-900"
        />
      </div>
    </div>
  )
}

// Empty State Component
function EmptyState({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-12 text-center">
      <div className="mx-auto w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center mb-3">
        <Icon className="text-slate-400" size={24} />
      </div>
      <h3 className="text-slate-900 font-semibold">{title}</h3>
      <p className="text-slate-500 text-sm mt-1">{description}</p>
    </div>
  )
}

// Activity Item Component
function ActivityItem({
  title,
  body,
  time,
  tone
}: {
  title: string
  body: string
  time: string
  tone: "success" | "warning" | "info"
}) {
  const toneColors = {
    success: "bg-emerald-100 text-emerald-600",
    warning: "bg-amber-100 text-amber-600",
    info: "bg-indigo-100 text-indigo-600",
  }

  return (
    <div className="flex gap-3 pb-4 border-b border-slate-100 last:border-0 last:pb-0">
      <div className={cn("w-2 h-2 rounded-full mt-2 shrink-0", toneColors[tone])} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900">{title}</p>
        <p className="text-xs text-slate-600 mt-0.5">{body}</p>
        <p className="text-xs text-slate-400 mt-1">{time}</p>
      </div>
    </div>
  )
}

export default DashboardPage
