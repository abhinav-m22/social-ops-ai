import { cn } from "@/lib/ui"
import { DealStatus, statusLabels } from "@/types/deal"

export const StatusBadge = ({ status }: { status: DealStatus }) => {
  const tone =
    status === "completed"
      ? "bg-emerald-50 text-emerald-700 border-emerald-300"
      : status === "active" || status === "awaiting_response" || status === "awaiting_details"
        ? "bg-blue-50 text-blue-700 border-blue-300"
        : status === "negotiating"
          ? "bg-amber-50 text-amber-700 border-amber-300"
          : status === "declined" || status === "cancelled"
            ? "bg-rose-50 text-rose-700 border-rose-300"
            : "bg-gray-50 text-gray-700 border-gray-300"

  return (
    <span
      className={cn(
        "px-3 py-1.5 rounded-full border text-xs font-semibold uppercase tracking-wide shadow-sm transition-all",
        tone
      )}
    >
      {statusLabels[status]}
    </span>
  )
}

