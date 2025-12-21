import { useEffect, useState, useMemo } from "react"
import { Deal } from "@/types/deal"
import { formatCurrency, formatDate, cn } from "@/lib/ui"
import { InvoiceModal } from "./InvoiceModal"
import { ConfidenceBadge } from "./ConfidenceBadge"
import { StatusBadge } from "./StatusBadge"
import {
  X, Mail, Sparkles, ShieldAlert, ChevronDown, ChevronUp,
  Package, DollarSign, TrendingUp, Clock, MessageSquare,
  Calendar, Video, CheckCircle2, AlertTriangle, ArrowUpRight, FileText, RefreshCw
} from "lucide-react"
import { submitNegotiationAction } from "@/lib/api"
import { NumberTicker } from "./ui/number-ticker"
import { ShimmerButton } from "./ui/shimmer-button"
import { useStreamGroup } from "@motiadev/stream-client-react"

type Props = {
  deal: Deal | null
  onClose: () => void
  onSend: (message: string) => Promise<void>
  onDecline: (reason?: string) => Promise<void>
}

export const DealModal = ({ deal, onClose, onSend, onDecline }: Props) => {
  const [reply, setReply] = useState("")
  const [loading, setLoading] = useState(false)
  const [declineReason, setDeclineReason] = useState("")

  // Negotiation States
  const [counterAmount, setCounterAmount] = useState<string>("")
  const [customAmount, setCustomAmount] = useState<string>("")
  const [showCustomCounter, setShowCustomCounter] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false)

  // Analysis Stream Subscription
  const streamConfig = useMemo(() => ({
    streamName: "analysis",
    groupId: deal?.inquiryId || "none"
  }), [deal?.inquiryId])

  const { data: analysisData } = useStreamGroup<any>(streamConfig)

  // Get latest analysis status
  const currentAnalysis = analysisData?.[0]

  useEffect(() => {
    setReply(deal?.aiSuggestedReply || deal?.autoReplyMessage || "")
  }, [deal])

  if (!deal) return null

  const handleSend = async () => {
    try {
      setLoading(true)
      await onSend(reply)
    } finally {
      setLoading(false)
    }
  }

  const handleDecline = async () => {
    try {
      setLoading(true)
      await onDecline(declineReason)
    } finally {
      setLoading(false)
    }
  }

  const isNegotiationMode =
    deal.status === "NEGOTIATION_READY" ||
    deal.status === "RATE_RECOMMENDED" ||
    deal.status === "FINALIZED"

  const handleNegotiationAction = async (action: "accept" | "counter" | "decline", providedAmount?: number) => {
    try {
      setLoading(true)
      let amount: number | undefined
      let msg: string | undefined

      if (action === "counter") {
        // Use provided amount if given, otherwise check state
        if (providedAmount !== undefined) {
          amount = providedAmount
        } else {
          amount = showCustomCounter ? parseFloat(customAmount) : parseFloat(counterAmount)
        }
        
        if (isNaN(amount) || amount <= 0) {
          alert("Please enter a valid amount")
          setLoading(false)
          return
        }
      }

      await submitNegotiationAction(deal.dealId, action, amount, msg)
      onClose()
    } catch (err) {
      alert("Failed to submit action")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Calculate time ago
  const getTimeAgo = () => {
    if (!deal.timeline?.dealCreated) return "Recently"
    const now = new Date()
    const created = new Date(deal.timeline.dealCreated)
    const hours = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60))
    if (hours < 1) return "Just now"
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-6xl rounded-2xl border border-slate-200 bg-white shadow-2xl p-8 relative max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 transition bg-slate-100 hover:bg-slate-200 rounded-full p-2"
        >
          <X size={20} />
        </button>

        {/* Enhanced Header */}
        <div className="flex items-start gap-6 mb-8 pb-8 border-b border-slate-200">
          {/* Large Gradient Brand Initial */}
          <div className="h-14 w-14 rounded-2xl bg-linear-to-br from-indigo-500 via-indigo-600 to-cyan-500 flex items-center justify-center text-white text-xl font-black shadow-lg shadow-indigo-200">
            {deal.brand?.name?.[0]?.toUpperCase() || "B"}
          </div>

          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-3xl font-bold text-slate-900">{deal.brand?.name}</h2>
              {deal.brand?.pageName && (
                <span className="text-sm font-medium text-slate-500 bg-slate-100 rounded-full px-3 py-1 border border-slate-200">
                  {deal.brand.pageName}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <StatusBadge status={deal.status} />
              <ConfidenceBadge level={deal.confidenceLevel} score={deal.confidenceScore} />
              <span className="text-sm text-slate-500 flex items-center gap-1.5">
                <Clock size={14} />
                Received {getTimeAgo()}
              </span>
            </div>

            {deal.brand?.email && (
              <div className="text-sm text-slate-600 flex items-center gap-2">
                <Mail size={14} />
                {deal.brand.email}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Deal Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Brand Message Card */}
            <div className="rounded-xl border-2 border-indigo-200 bg-indigo-50/50 p-6 space-y-3">
              <div className="flex items-center gap-2 text-indigo-900 font-bold">
                <MessageSquare size={18} className="text-indigo-600" />
                Brand Message
              </div>
              <div className="bg-white rounded-lg p-4 border border-indigo-100 text-slate-800 leading-relaxed whitespace-pre-wrap">
                {(() => {
                  if (deal.rawInquiry && deal.rawInquiry.trim()) return deal.rawInquiry
                  const latestBrandMessageEntry = deal.history
                    ?.filter(h => h.event === 'message_appended' && h.data?.newMessage)
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
                  if (latestBrandMessageEntry?.data?.newMessage) return latestBrandMessageEntry.data.newMessage
                  if (deal.message && deal.message.trim() && deal.message !== deal.autoReplyMessage && deal.message !== deal.aiSuggestedReply) {
                    return deal.message
                  }
                  return "No message available"
                })()}
              </div>
            </div>

            {/* Extracted Requirements */}
            {deal.terms?.deliverables && deal.terms.deliverables.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2 text-slate-900 font-bold mb-4">
                  <Package size={18} className="text-indigo-600" />
                  Deliverables
                </div>
                <div className="grid gap-3">
                  {deal.terms.deliverables.map(del => (
                    <div key={del.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="p-2 bg-indigo-100 rounded-lg">
                        <Video className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-slate-900">{del.description || del.type}</div>
                        <div className="text-sm text-slate-500">{del.type}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-indigo-600">×{del.count}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Budget & Pricing */}
            {deal.terms?.proposedBudget && (
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2 text-slate-900 font-bold mb-4">
                  <DollarSign size={18} className="text-cyan-600" />
                  Proposed Budget
                </div>
                <div className="space-y-4">
                  <div className="bg-linear-to-br from-indigo-600 via-indigo-700 to-indigo-900 rounded-3xl p-8 text-white shadow-2xl shadow-indigo-200 relative overflow-hidden group">
                    <div className="text-sm text-indigo-100/80 mb-2 font-medium">Total Budget</div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold text-white">
                        ₹
                      </span>
                      <NumberTicker
                        value={deal.terms.proposedBudget}
                        className="text-4xl font-bold text-white"
                      />
                    </div>
                  </div>

                  {deal.terms.deliverables && deal.terms.deliverables.length > 0 && (() => {
                    const totalUnits = deal.terms.deliverables.reduce((sum, d) => sum + (d.count || 1), 0)
                    const perUnit = totalUnits > 0 ? Math.round(deal.terms.proposedBudget / totalUnits) : null
                    return perUnit ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                          <div className="text-sm text-slate-600 mb-1">Total Units</div>
                          <div className="text-2xl font-semibold text-slate-900">{totalUnits}</div>
                        </div>
                        <div className="bg-cyan-50 rounded-lg p-4 border border-cyan-200">
                          <div className="text-sm text-cyan-700 mb-1">Per-Unit Rate</div>
                          <div className="text-2xl font-bold text-cyan-900">{formatCurrency(perUnit)}</div>
                        </div>
                      </div>
                    ) : null
                  })()}
                </div>
              </div>
            )}

            {/* AI Thinking Progress */}
            {currentAnalysis?.status === 'thinking' && !deal.negotiation && (
              <div className="rounded-xl border-2 border-amber-200 bg-white p-6 shadow-lg overflow-hidden relative">
                <div className="absolute top-0 left-0 h-1.5 bg-amber-500 transition-all duration-700 ease-out" style={{ width: `${currentAnalysis.progress || 0}%` }} />
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 flex items-center justify-center rounded-2xl bg-amber-100 text-amber-600 animate-spin">
                    <RefreshCw size={24} />
                  </div>
                  <div className="flex-1">
                    <div className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
                      AI Thinking...
                      <span className="inline-flex h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                    </div>
                    <div className="text-sm text-slate-500 font-medium italic">{currentAnalysis.message || 'Crunching numbers...'}</div>
                  </div>
                </div>
              </div>
            )}

            {/* AI Rate Recommendation */}
            {deal.negotiation && (
              <div className="rounded-xl border-2 border-amber-200 bg-linear-to-br from-amber-50 to-orange-50 p-6 shadow-lg hover:shadow-xl transition-shadow">
                <div className="flex items-center gap-2 text-amber-900 font-bold mb-6">
                  <TrendingUp size={20} className="text-amber-600" />
                  💰 AI Rate Analysis
                </div>

                {/* Brand Offer */}
                <div className="bg-white rounded-xl p-5 border border-amber-200 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-sm text-slate-600 mb-1">Brand Offered</div>
                      <div className="text-3xl font-bold text-slate-900">
                        {formatCurrency(deal.negotiation.brandOfferedAmount)}
                      </div>
                    </div>
                    <div className={cn(
                      "px-4 py-2 rounded-full font-bold text-sm uppercase",
                      deal.negotiation.budgetAssessment === "accept"
                        ? "bg-emerald-100 text-emerald-700"
                        : deal.negotiation.budgetAssessment === "decline"
                          ? "bg-rose-100 text-rose-700"
                          : "bg-amber-100 text-amber-700"
                    )}>
                      {deal.negotiation.budgetAssessment === "accept" && "✅ Fair Offer"}
                      {deal.negotiation.budgetAssessment === "counter" && "⚠️ Counter Suggested"}
                      {deal.negotiation.budgetAssessment === "decline" && "❌ Below Market"}
                    </div>
                  </div>
                </div>

                {/* Three Pricing Tiers */}
                <div className="space-y-3 mb-4">
                  <div className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                    Recommended Rates
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {/* Conservative */}
                    <PricingTier
                      icon="🥉"
                      label="Conservative"
                      amount={deal.negotiation.aiRecommendedRates.conservative}
                      description="Safe minimum"
                      variant="gray"
                    />

                    {/* Market - Highlighted */}
                    <PricingTier
                      icon="🥈"
                      label="Market Rate"
                      amount={deal.negotiation.aiRecommendedRates.market}
                      description="Recommended"
                      recommended
                      variant="indigo"
                    />

                    {/* Premium */}
                    <PricingTier
                      icon="🥇"
                      label="Premium"
                      amount={deal.negotiation.aiRecommendedRates.premium}
                      description="High-value"
                      variant="amber"
                    />
                  </div>
                </div>

                {/* Rate Metrics Collapsible */}
                {deal.negotiation.rateMetrics && (
                  <div className="bg-white rounded-xl border border-amber-100 overflow-hidden">
                    <button
                      onClick={() => setShowDetails(!showDetails)}
                      className="w-full flex items-center justify-between p-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                    >
                      <span>📊 Detailed Rate Breakdown</span>
                      {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    {showDetails && (
                      <div className="p-4 pt-0 grid grid-cols-2 gap-4 text-sm border-t border-amber-100">
                        <MetricRow label="Baseline Rate" value={formatCurrency(deal.negotiation.rateMetrics.baselineRate)} />
                        <MetricRow label="Reach Adjusted" value={formatCurrency(deal.negotiation.rateMetrics.reachAdjustedRate)} />
                        <MetricRow label="Engagement Rate" value={`${deal.negotiation.rateMetrics.engagementRate.toFixed(2)}%`} />
                        <MetricRow label="Eng. Multiplier" value={`×${deal.negotiation.rateMetrics.engagementMultiplier}`} accent />
                        <MetricRow label="View Ratio" value={deal.negotiation.rateMetrics.viewRatio.toFixed(2)} />
                        <MetricRow label="View Multiplier" value={`×${deal.negotiation.rateMetrics.viewMultiplier}`} accent />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Negotiation History */}
            {deal.history && deal.history.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2 text-slate-900 font-bold mb-4">
                  <Clock size={18} className="text-slate-600" />
                  Negotiation Timeline
                </div>
                <div className="space-y-4">
                  {(() => {
                    const filteredHistory = deal.history
                      .filter(h => ['message_appended', 'creator_reply_sent', 'auto_reply_sent', 'deal_updated', 'deal_created'].includes(h.event))
                      .slice(-10)
                      .reverse()
                    return filteredHistory.map((entry, idx) => {
                      const date = new Date(entry.timestamp)
                      const isUpdate = entry.event === 'message_appended' && (entry.data?.budgetChanged || entry.data?.deliverablesChanged)
                      const isLastUpdate = isUpdate; // Assuming isLastUpdate is equivalent to isUpdate for this context
                      return (
                        <div key={idx} className={cn(
                          "relative pl-8 pb-4 border-l-2",
                          isUpdate ? "border-emerald-300" : "border-slate-200"
                        )}>
                          <div className={cn("absolute -left-1.5 top-0 w-3 h-3 rounded-full border-2 border-white shadow-sm z-10 transition-transform group-hover:scale-125", isLastUpdate ? "bg-emerald-500" : "bg-slate-300")} />
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={cn(
                                  "text-xs font-semibold uppercase px-2 py-1 rounded",
                                  isUpdate ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                                )}>
                                  {entry.event.replace('_', ' ')}
                                </span>
                                {isUpdate && (
                                  <span className="text-xs text-emerald-600 font-medium">• Updated</span>
                                )}
                              </div>
                              {entry.data?.newMessage && (
                                <div className="text-sm text-slate-700 mt-2 bg-slate-50 rounded p-3 border border-slate-100">
                                  {entry.data.newMessage.substring(0, 150)}{entry.data.newMessage.length > 150 ? '...' : ''}
                                </div>
                              )}
                              {entry.data?.budgetChanged && (
                                <div className="text-sm text-slate-600 mt-2">
                                  <span className="font-medium">Budget:</span> {formatCurrency(entry.data.previousBudget)} → {formatCurrency(entry.data.updatedBudget)}
                                </div>
                              )}
                            </div>
                            <div className="text-xs text-slate-400 ml-4">
                              {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  })()}
                </div>
              </div>
            )}

            {/* AI Confidence Analysis */}
            {(deal.confidenceReasons?.length || deal.redFlags?.length) && (
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-4">AI Confidence Analysis</div>
                {deal.confidenceReasons && deal.confidenceReasons.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {deal.confidenceReasons.map((reason, idx) => (
                      <span
                        key={idx}
                        className="text-sm bg-slate-50 border border-slate-200 text-slate-700 rounded-full px-3 py-1.5 font-medium"
                      >
                        {reason}
                      </span>
                    ))}
                  </div>
                )}
                {deal.redFlags && deal.redFlags.length > 0 && (
                  <div className="flex items-start gap-3 text-rose-700 text-sm bg-rose-50 border border-rose-200 rounded-lg p-3">
                    <ShieldAlert size={18} className="mt-0.5 shrink-0" />
                    <span className="font-medium">Red flags: {deal.redFlags.join(", ")}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Actions */}
          <div className="space-y-6">
            {/* Invoice Quick Access Card */}
            {deal.status === "active" && (
              <div className="rounded-xl border border-indigo-100 bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Manage Invoice</h3>
                    <p className="text-xs text-slate-500 font-medium">Build & Send to Brand</p>
                  </div>
                </div>
                <button
                  onClick={() => setInvoiceModalOpen(true)}
                  className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-slate-900 transition-all flex items-center justify-center gap-2"
                >
                  Open Invoice Builder
                  <ArrowUpRight size={16} />
                </button>
              </div>
            )}

            <InvoiceModal
              dealId={deal.dealId}
              isOpen={invoiceModalOpen}
              onClose={() => setInvoiceModalOpen(false)}
            />

            {/* Negotiation Actions */}
            {isNegotiationMode && deal.negotiation ? (
              <div className="space-y-4">
                <div className="rounded-xl border-2 border-indigo-200 bg-linear-to-br from-indigo-50 to-cyan-50 p-6 shadow-lg">
                  <div className="flex items-center gap-2 text-indigo-900 font-bold mb-4">
                    <Sparkles size={18} className="text-indigo-600" />
                    Quick Actions
                  </div>

                  {deal.status === "RATE_RECOMMENDED" && (
                    <div className="space-y-3">
                      {/* Accept Button */}
                      <ShimmerButton
                        onClick={() => handleNegotiationAction("accept")}
                        disabled={loading}
                        className="w-full"
                      >
                        <CheckCircle2 size={18} />
                        Accept Offer
                      </ShimmerButton>

                      {/* Counter with Market Rate */}
                      {!showCustomCounter ? (
                        <div className="flex gap-2">
                          <button
                            disabled={loading}
                            onClick={() => {
                              // Pass amount directly to avoid React state timing issues
                              const marketRate = deal.negotiation!.aiRecommendedRates.market
                              setCounterAmount(marketRate.toString())
                              handleNegotiationAction("counter", marketRate)
                            }}
                            className="flex-1 bg-amber-100 border border-amber-300 text-amber-800 hover:bg-amber-200 rounded-xl py-3 px-4 font-semibold text-sm transition-all"
                          >
                            Counter Market ({formatCurrency(deal.negotiation.aiRecommendedRates.market)})
                          </button>
                          <button
                            onClick={() => setShowCustomCounter(true)}
                            className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-medium text-sm transition-all"
                          >
                            ...
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <input
                            type="number"
                            placeholder="Custom amount"
                            value={customAmount}
                            onChange={(e) => setCustomAmount(e.target.value)}
                            className="flex-1 bg-white border-2 border-indigo-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none"
                          />
                          <button
                            disabled={loading}
                            onClick={() => {
                              const amount = parseFloat(customAmount)
                              if (isNaN(amount) || amount <= 0) {
                                alert("Please enter a valid amount")
                                return
                              }
                              handleNegotiationAction("counter", amount)
                            }}
                            className="px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-semibold text-sm transition-all shadow-md"
                          >
                            Send
                          </button>
                          <button
                            onClick={() => setShowCustomCounter(false)}
                            className="px-3 text-slate-400 hover:text-slate-600"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      )}

                      {/* Decline Button */}
                      <button
                        disabled={loading}
                        onClick={() => handleNegotiationAction("decline")}
                        className="w-full bg-white border-2 border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 rounded-xl py-3 font-semibold text-sm transition-all"
                      >
                        Decline Offer
                      </button>
                    </div>
                  )}

                  {deal.status === "FINALIZED" && (
                    <div className="p-4 bg-emerald-50 rounded-lg text-center text-sm text-emerald-700 font-medium border border-emerald-200">
                      ✅ Negotiation Finalized
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Smart Reply */
              <div className="rounded-xl border-2 border-indigo-200 bg-linear-to-br from-indigo-50 to-cyan-50 p-6 shadow-lg">
                <div className="flex items-center gap-2 text-indigo-900 font-bold mb-4">
                  <Sparkles size={18} className="text-indigo-600" />
                  Smart Reply
                </div>
                <div className="mb-3 text-xs text-slate-700 bg-white/70 rounded-lg p-3 border border-indigo-100">
                  💡 <strong>AI-Powered:</strong> Edit or provide instructions. AI generates the final professional message.
                </div>
                <textarea
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  placeholder="Type your message or instructions..."
                  className="w-full min-h-48 rounded-xl bg-white border-2 border-indigo-200 text-sm text-slate-800 p-4 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all shadow-sm resize-none mb-4"
                />
                <ShimmerButton
                  onClick={handleSend}
                  disabled={loading}
                  className="w-full"
                >
                  <Sparkles size={18} />
                  {loading ? "Sending..." : "Send Reply"}
                </ShimmerButton>
              </div>
            )}

            {/* Decline Section */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-sm text-slate-900 font-semibold mb-3">Decline Deal</div>
              <textarea
                value={declineReason}
                onChange={e => setDeclineReason(e.target.value)}
                placeholder="Optional reason..."
                className="w-full min-h-24 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 p-3 focus:outline-none focus:ring-2 focus:ring-slate-300 transition-all resize-none mb-3"
              />
              <button
                disabled={loading}
                onClick={handleDecline}
                className={cn(
                  "w-full inline-flex items-center justify-center gap-2 rounded-xl bg-white text-rose-600 py-3 font-semibold border-2 border-rose-200 hover:bg-rose-50 hover:border-rose-300 transition-all",
                  loading && "opacity-70 cursor-wait"
                )}
              >
                <X size={16} />
                {loading ? "Declining..." : "Decline Politely"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Pricing Tier Component
function PricingTier({
  icon,
  label,
  amount,
  description,
  recommended = false,
  variant = "gray"
}: {
  icon: string
  label: string
  amount: number
  description: string
  recommended?: boolean
  variant?: "gray" | "indigo" | "amber"
}) {
  const variants = {
    gray: "bg-slate-50 border-slate-200 text-slate-900",
    indigo: "bg-gradient-to-br from-indigo-100 to-cyan-100 border-indigo-300 text-indigo-900 shadow-md",
    amber: "bg-amber-50 border-amber-200 text-amber-900",
  }

  return (
    <div className={cn(
      "rounded-xl border-2 p-4 text-center transition-all hover:shadow-lg hover:-translate-y-1",
      variants[variant],
      recommended && "ring-2 ring-indigo-400 ring-offset-2"
    )}>
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1">
        {label}
      </div>
      {recommended && (
        <div className="text-xs font-bold text-indigo-600 mb-2">⭐ RECOMMENDED</div>
      )}
      <div className="flex items-baseline justify-center gap-1 mb-2">
        <span className="text-lg font-bold">₹</span>
        <NumberTicker
          value={amount}
          className="text-2xl font-bold"
        />
      </div>
      <div className="text-xs text-slate-600">{description}</div>
    </div>
  )
}

// Metric Row Component
function MetricRow({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-slate-600">{label}</span>
      <span className={cn("font-semibold", accent ? "text-emerald-600" : "text-slate-900")}>{value}</span>
    </div>
  )
}
