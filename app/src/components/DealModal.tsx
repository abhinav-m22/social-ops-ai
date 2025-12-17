import { useEffect, useState } from "react"
import { Deal } from "@/types/deal"
import { formatCurrency, formatDate, cn } from "@/lib/ui"
import { ConfidenceBadge } from "./ConfidenceBadge"
import { StatusBadge } from "./StatusBadge"
import { X, Mail, Sparkles, ShieldAlert, ChevronDown, ChevronUp } from "lucide-react"
import { submitNegotiationAction } from "@/lib/api"

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

  const handleNegotiationAction = async (action: "accept" | "counter" | "decline") => {
    try {
      setLoading(true)
      let amount: number | undefined
      let msg: string | undefined

      if (action === "counter") {
        amount = showCustomCounter ? parseFloat(customAmount) : parseFloat(counterAmount)
        if (isNaN(amount)) {
          alert("Please enter a valid amount")
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/20 backdrop-blur-sm px-4">
      <div className="w-full max-w-5xl rounded-3xl border border-white/40 bg-white shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 transition bg-gray-50 rounded-full p-2 hover:bg-gray-100"
        >
          <X size={20} />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200/50 flex items-center justify-center text-emerald-700 font-bold shadow-sm text-lg">
                {deal.brand?.name?.[0]?.toUpperCase() || "B"}
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-2xl font-bold text-gray-900">{deal.brand?.name}</h2>
                  {deal.brand?.pageName && (
                    <span className="text-xs font-medium text-gray-500 bg-gray-50 rounded-full px-2.5 py-0.5 border border-gray-100">
                      {deal.brand.pageName}
                    </span>
                  )}
                  <StatusBadge status={deal.status} />
                </div>
                <div className="text-sm text-gray-500 flex items-center gap-2">
                  <Mail size={14} /> {deal.brand?.email || "No email provided"}
                </div>
                <div className="pt-1">
                  <ConfidenceBadge level={deal.confidenceLevel} score={deal.confidenceScore} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-6 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Received Message</div>
              <p className="text-gray-800 leading-relaxed whitespace-pre-wrap text-base">{deal.message}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Extracted Deliverables</div>
                <ul className="mt-3 space-y-2.5 text-sm text-gray-700">
                  {deal.terms?.deliverables?.map(del => (
                    <li key={del.id} className="flex items-center justify-between pb-2 border-b border-gray-50 last:border-0 last:pb-0">
                      <span className="flex-1 font-medium">{del.description || del.type}</span>
                      <span className="text-gray-500 bg-gray-50 px-2 py-0.5 rounded text-xs font-semibold">x{del.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-white p-5 space-y-3 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Budget & Timeline</div>
                <div className="flex justify-between items-center text-gray-700">
                  <span>Budget:</span>
                  <span className="font-bold text-lg text-emerald-700">{formatCurrency(deal.terms?.proposedBudget)}</span>
                </div>
                <div className="flex justify-between items-center text-gray-600 text-sm">
                  <span>Received:</span>
                  <span>{formatDate(deal.timeline?.inquiryReceived)}</span>
                </div>
                <div className="flex justify-between items-center text-gray-600 text-sm">
                  <span>Auto reply:</span>
                  <span>{formatDate(deal.autoReplyAt)}</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5 space-y-3 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">AI Confidence Analysis</div>
              <div className="flex flex-wrap gap-2">
                {deal.confidenceReasons?.map((reason, idx) => (
                  <span
                    key={idx}
                    className="text-xs bg-gray-50 border border-gray-100 text-gray-600 rounded-full px-3 py-1 font-medium"
                  >
                    {reason}
                  </span>
                ))}
              </div>
              {deal.redFlags?.length ? (
                <div className="flex items-start gap-2 text-rose-600 text-sm bg-rose-50 border border-rose-100 rounded-lg p-2.5 mt-2">
                  <ShieldAlert size={16} className="mt-0.5 shrink-0" />
                  <span className="font-medium">Red flags detected: {deal.redFlags.join(", ")}</span>
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-6">
            {isNegotiationMode && deal.negotiation ? (
              <div className="space-y-6">
                {/* Negotiation UI */}
                <div className="rounded-2xl border border-purple-100 bg-purple-50/50 p-6 shadow-sm">
                  <div className="flex items-center gap-2 text-purple-800 font-bold mb-4">
                    <Sparkles size={18} className="text-purple-500" />
                    AI Negotiation Assistant
                  </div>

                  <div className="space-y-4">
                    <div className="bg-white rounded-xl p-4 border border-purple-100">
                      <div className="text-xs font-semibold uppercase text-gray-500 mb-1">Brand Offer</div>
                      <div className="text-2xl font-bold text-gray-900">
                        {formatCurrency(deal.negotiation.brandOfferedAmount)}
                      </div>
                      <div className="mt-2 text-sm">
                        <span className="font-medium text-gray-700">AI Assessment: </span>
                        <span
                          className={cn(
                            "font-bold uppercase text-xs px-2 py-0.5 rounded",
                            deal.negotiation.budgetAssessment === "accept"
                              ? "bg-emerald-100 text-emerald-700"
                              : deal.negotiation.budgetAssessment === "decline"
                                ? "bg-rose-100 text-rose-700"
                                : "bg-amber-100 text-amber-700"
                          )}
                        >
                          {deal.negotiation.budgetAssessment}
                        </span>
                      </div>
                    </div>

                    {deal.negotiation.rateMetrics && (
                      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                        <button
                          onClick={() => setShowDetails(!showDetails)}
                          className="w-full flex items-center justify-between p-3 text-xs font-semibold text-gray-500 hover:bg-gray-50 transition"
                        >
                          <span>RATE BREAKDOWN & METRICS</span>
                          {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>

                        {showDetails && (
                          <div className="p-3 pt-0 grid grid-cols-2 gap-y-2 gap-x-4 text-sm animate-in fade-in slide-in-from-top-1">
                            <div className="flex justify-between">
                              <span className="text-gray-500">Baseline Rate</span>
                              <span className="font-medium">{formatCurrency(deal.negotiation.rateMetrics.baselineRate)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Reach Adjusted</span>
                              <span className="font-medium">{formatCurrency(deal.negotiation.rateMetrics.reachAdjustedRate)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Engagement</span>
                              <span className="font-medium">{(deal.negotiation.rateMetrics.engagementRate).toFixed(2)}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Eng. Multiplier</span>
                              <span className="font-medium text-emerald-600">x{deal.negotiation.rateMetrics.engagementMultiplier}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">View Ratio</span>
                              <span className="font-medium">{(deal.negotiation.rateMetrics.viewRatio).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">View Multiplier</span>
                              <span className="font-medium text-emerald-600">x{deal.negotiation.rateMetrics.viewMultiplier}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="space-y-3">
                      <div className="text-xs font-semibold uppercase text-gray-500">
                        Rate Recommendations
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-white p-3 rounded-lg border border-gray-100 text-center">
                          <div className="text-xs text-gray-500 mb-1">Conservative</div>
                          <div className="font-semibold text-gray-800">
                            {formatCurrency(deal.negotiation.aiRecommendedRates.conservative)}
                          </div>
                        </div>
                        <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 text-center shadow-sm">
                          <div className="text-xs text-emerald-600 mb-1 font-bold">Market</div>
                          <div className="font-bold text-emerald-900">
                            {formatCurrency(deal.negotiation.aiRecommendedRates.market)}
                          </div>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-gray-100 text-center">
                          <div className="text-xs text-gray-500 mb-1">Premium</div>
                          <div className="font-semibold text-gray-800">
                            {formatCurrency(deal.negotiation.aiRecommendedRates.premium)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {deal.status === "RATE_RECOMMENDED" && (
                      <div className="pt-4 border-t border-purple-100 space-y-3">
                        <div className="text-sm font-semibold text-gray-900">Take Action</div>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            disabled={loading}
                            onClick={() => handleNegotiationAction("accept")}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-2.5 font-semibold text-sm transition-all"
                          >
                            Accept Offer
                          </button>
                          <button
                            disabled={loading}
                            onClick={() => handleNegotiationAction("decline")}
                            className="w-full bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl py-2.5 font-semibold text-sm transition-all"
                          >
                            Decline
                          </button>
                        </div>

                        {!showCustomCounter ? (
                          <div className="flex gap-2">
                            <button
                              disabled={loading}
                              onClick={() => {
                                setCounterAmount(deal.negotiation!.aiRecommendedRates.market.toString())
                                handleNegotiationAction("counter")
                              }}
                              className="flex-1 bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 rounded-xl py-2.5 font-semibold text-sm transition-all"
                            >
                              Counter Market ({formatCurrency(deal.negotiation.aiRecommendedRates.market)})
                            </button>
                            <button
                              onClick={() => setShowCustomCounter(true)}
                              className="px-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-medium text-sm transition-all"
                            >
                              ...
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2 animate-in fade-in slide-in-from-top-2">
                            <input
                              type="number"
                              placeholder="Amount"
                              value={customAmount}
                              onChange={(e) => setCustomAmount(e.target.value)}
                              className="flex-1 bg-white border border-gray-300 rounded-xl px-3 text-sm focus:ring-2 focus:ring-purple-200 outline-none"
                            />
                            <button
                              disabled={loading}
                              onClick={() => handleNegotiationAction("counter")}
                              className="px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-semibold text-sm transition-all shadow-sm"
                            >
                              Send
                            </button>
                            <button
                              onClick={() => setShowCustomCounter(false)}
                              className="px-3 text-gray-400 hover:text-gray-600"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {deal.status === "FINALIZED" && (
                      <div className="mt-4 p-3 bg-gray-100 rounded-lg text-center text-sm text-gray-500">
                        Negotiation Finalized
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/30 p-5 shadow-sm">
                <div className="flex items-center gap-2 text-emerald-800 font-bold mb-3">
                  <Sparkles size={18} className="text-emerald-500" /> AI-Suggested Reply
                </div>
                <textarea
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  className="w-full min-h-48 rounded-xl bg-white border border-emerald-100 text-sm text-gray-800 p-4 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 transition-all shadow-sm resize-none"
                />
                <div className="flex items-center gap-2 text-xs text-gray-500 mt-3 px-1">
                  Preview before sending. Status will update automatically.
                </div>
                <button
                  disabled={loading}
                  onClick={handleSend}
                  className={cn(
                    "mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 text-white py-3 font-semibold shadow-md shadow-emerald-600/20 hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-600/30 transition-all active:scale-[0.98]",
                    loading && "opacity-70 cursor-wait"
                  )}
                >
                  <Sparkles size={18} /> {loading ? "Sending..." : "Send Reply"}
                </button>
              </div>
            )}

            <div className="rounded-2xl border border-gray-100 bg-white p-5 space-y-3">
              <div className="text-sm text-gray-700 font-semibold">Decline Deal</div>
              <textarea
                value={declineReason}
                onChange={e => setDeclineReason(e.target.value)}
                placeholder="Optional reason for declining..."
                className="w-full min-h-24 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-800 p-3 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all resize-none"
              />
              <button
                disabled={loading}
                onClick={handleDecline}
                className={cn(
                  "w-full inline-flex items-center justify-center gap-2 rounded-xl bg-white text-rose-600 py-2.5 font-semibold border border-gray-200 hover:bg-rose-50 hover:border-rose-200 transition-all",
                  loading && "opacity-70 cursor-wait"
                )}
              >
                <X size={16} /> {loading ? "Declining..." : "Decline Polite"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

