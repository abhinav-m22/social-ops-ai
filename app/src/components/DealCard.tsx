import { formatCurrency, formatDate } from "@/lib/ui"
import { Deal } from "@/types/deal"
import { Sparkles, PenLine, XCircle, MessageSquare, Clock3 } from "lucide-react"
import { ConfidenceBadge } from "./ConfidenceBadge"
import { StatusBadge } from "./StatusBadge"

type Props = {
  deal: Deal
  onOpen: (deal: Deal) => void
  onSendSmartReply: (deal: Deal) => void
  onDecline: (deal: Deal) => void
  variant?: "new" | "active" | "completed"
  busy?: boolean
}

export const DealCard = ({ deal, onOpen, onSendSmartReply, onDecline, variant = "new", busy }: Props) => {
  const budget = deal.terms?.proposedBudget

  return (
    <div
      className="group relative rounded-2xl bg-white border border-gray-100 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_24px_-6px_rgba(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-1 cursor-pointer overflow-hidden"
      onClick={() => onOpen(deal)}
    >
      <div className="p-5 relative z-10">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200/50 flex items-center justify-center text-emerald-700 font-bold shadow-sm">
              {deal.brand?.name?.[0]?.toUpperCase() || "B"}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-gray-900 leading-tight">{deal.brand?.name}</h3>
                {deal.brand?.pageName && (
                  <span className="text-xs font-medium text-gray-500 bg-gray-50 rounded-md px-1.5 py-0.5 border border-gray-100">
                    {deal.brand.pageName}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1 line-clamp-2 leading-relaxed">{deal.message}</p>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <ConfidenceBadge level={deal.confidenceLevel} score={deal.confidenceScore} />
                <StatusBadge status={deal.status} />
              </div>
            </div>
          </div>
          <div className="text-right space-y-0.5 shrink-0">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">Budget</div>
            <div className="text-lg font-bold text-gray-900">{formatCurrency(budget)}</div>
            <div className="text-xs text-gray-400 flex items-center gap-1 justify-end mt-1">
              <Clock3 size={12} /> {formatDate(deal.timeline?.dealCreated)}
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2 relative z-10">
          <button
            onClick={e => {
              e.stopPropagation()
              onSendSmartReply(deal)
            }}
            disabled={busy}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-emerald-700 hover:shadow-md transition-all disabled:opacity-70 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            <Sparkles size={16} /> Smart Reply
          </button>
          <button
            onClick={e => {
              e.stopPropagation()
              onOpen(deal)
            }}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white text-gray-700 px-4 py-2 text-sm font-semibold border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <PenLine size={16} /> Edit
          </button>
          <button
            onClick={e => {
              e.stopPropagation()
              onDecline(deal)
            }}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white text-rose-600 px-3 py-2 text-sm font-semibold border border-gray-200 hover:bg-rose-50 hover:border-rose-200 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            title="Decline Deal"
          >
            <XCircle size={18} />
          </button>
        </div>

        {variant === "active" && (
          <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-2.5">
              <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                <MessageSquare size={14} /> Contract
              </div>
              <div className="text-gray-500 mt-1 truncate">
                {deal.timeline?.contractSent ? formatDate(deal.timeline.contractSent) : "Pending"}
              </div>
            </div>
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-2.5">
              <div className="flex items-center gap-1.5 text-amber-700 font-medium">
                <Clock3 size={14} /> Signing
              </div>
              <div className="text-gray-500 mt-1 truncate">
                {deal.timeline?.signatureReceived ? formatDate(deal.timeline.signatureReceived) : "Waiting"}
              </div>
            </div>
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-2.5">
              <div className="flex items-center gap-1.5 text-blue-700 font-medium">
                <Sparkles size={14} /> Work
              </div>
              <div className="text-gray-500 mt-1 truncate">
                {deal.terms?.deliverables?.length || 0} items
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

