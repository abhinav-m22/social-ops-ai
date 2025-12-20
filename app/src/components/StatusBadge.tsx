import { cn } from "@/lib/ui"
import { DealStatus, statusLabels } from "@/types/deal"

export const StatusBadge = ({ status }: { status: DealStatus }) => {
  const tone =
    status === "completed"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : status === "active" || status === "awaiting_response" || status === "awaiting_details"
        ? "bg-indigo-50 text-indigo-700 border-indigo-100"
        : status === "negotiating"
          ? "bg-amber-50 text-amber-700 border-amber-200"
          : status === "declined" || status === "cancelled"
            ? "bg-rose-50 text-rose-700 border-rose-200"
            : "bg-slate-50 text-slate-700 border-slate-200"

  return (
    <span
      className={cn(
        "px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-tight transition-all",
        tone
      )}
    >
      {statusLabels[status]}
    </span>
  )
}

