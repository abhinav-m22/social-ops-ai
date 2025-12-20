import { formatCurrency, formatDate } from "@/lib/ui"
import { Deal } from "@/types/deal"
import { Sparkles, PenLine, XCircle, MessageSquare, Clock3 } from "lucide-react"
import { ConfidenceBadge } from "./ConfidenceBadge"
import { StatusBadge } from "./StatusBadge"
import { cn } from "@/lib/ui"

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
      className="group relative rounded-2xl bg-white border border-slate-200 hover:border-indigo-400 transition-all duration-300 hover:shadow-xl cursor-pointer overflow-hidden flex flex-col"
      onClick={() => onOpen(deal)}
    >
      <div className="p-6 flex flex-col h-full">
        {/* Header Section */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 text-sm font-bold shrink-0">
              {deal.brand?.name?.[0]?.toUpperCase() || "B"}
            </div>
            <div className="overflow-hidden">
              <h3 className="text-base font-semibold text-slate-900 truncate leading-tight">
                {deal.brand?.name}
              </h3>
              {deal.brand?.pageName && (
                <div className="text-[10px] text-slate-400 font-medium uppercase tracking-tight truncate">
                  {deal.brand.pageName}
                </div>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-sm font-bold text-slate-900">
              <span className="text-slate-400 mr-0.5 font-medium italic">₹</span>
              {budget ? budget.toLocaleString() : "TBD"}
            </div>
          </div>
        </div>

        {/* Message Preview */}
        <p className="text-slate-500 text-sm line-clamp-2 leading-relaxed h-10 mb-5 font-normal italic">
          "{deal.message}"
        </p>

        {/* Status Line */}
        <div className="flex items-center gap-2 mb-6">
          <ConfidenceBadge level={deal.confidenceLevel} score={deal.confidenceScore} />
          <StatusBadge status={deal.status} />
        </div>

        <div className="mt-auto pt-4 border-t border-slate-50 flex items-center gap-2">
          {variant === "new" ? (
            <>
              <button
                onClick={e => {
                  e.stopPropagation()
                  onSendSmartReply(deal)
                }}
                disabled={busy}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-900 transition-all disabled:opacity-50"
              >
                <Sparkles size={14} />
                Smart Reply
              </button>
              <button
                onClick={e => {
                  e.stopPropagation()
                  onDecline(deal)
                }}
                disabled={busy}
                className="p-2.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all border border-transparent hover:border-rose-100"
                title="Decline"
              >
                <XCircle size={18} />
              </button>
            </>
          ) : (
            <button
              onClick={e => {
                e.stopPropagation()
                onOpen(deal)
              }}
              disabled={busy}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-50 text-slate-600 px-4 py-2.5 text-sm font-semibold hover:bg-slate-100 transition-all border border-slate-100"
            >
              <PenLine size={14} />
              Details & Flow
            </button>
          )}
        </div>

        {variant === "active" && (
          <div className="mt-4 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            <div className="flex items-center gap-1.5 text-indigo-500">
              <MessageSquare size={12} /> {deal.terms?.deliverables?.length || 0} ITEMS
            </div>
            <div className="flex items-center gap-1.5 font-medium">
              <Clock3 size={12} /> {formatDate(deal.timeline?.dealCreated)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

