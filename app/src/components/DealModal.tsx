import { useEffect, useState } from "react"
import { Deal } from "@/types/deal"
import { formatCurrency, formatDate, cn } from "@/lib/ui"
import { ConfidenceBadge } from "./ConfidenceBadge"
import { StatusBadge } from "./StatusBadge"
import { X, Mail, Sparkles, ShieldAlert } from "lucide-react"

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

