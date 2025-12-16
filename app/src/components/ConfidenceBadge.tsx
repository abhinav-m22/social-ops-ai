import { cn } from "@/lib/ui"
import { ConfidenceLevel } from "@/types/deal"
import { ShieldCheck, ShieldHalf, Shield } from "lucide-react"

export const ConfidenceBadge = ({ level, score }: { level?: ConfidenceLevel; score?: number }) => {
  if (!level) return null
  const tone =
    level === "high"
      ? "bg-emerald-50 text-emerald-700 border-emerald-300"
      : level === "medium"
        ? "bg-amber-50 text-amber-700 border-amber-300"
        : "bg-rose-50 text-rose-700 border-rose-300"

  const Icon = level === "high" ? ShieldCheck : level === "medium" ? ShieldHalf : Shield

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold shadow-sm transition-all",
        tone
      )}
    >
      <Icon size={14} />
      {level.toUpperCase()} {typeof score === "number" ? `· ${score}` : ""}
    </span>
  )
}

