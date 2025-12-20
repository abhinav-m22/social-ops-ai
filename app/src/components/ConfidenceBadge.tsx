import { cn } from "@/lib/ui"
import { ConfidenceLevel } from "@/types/deal"
import { ShieldCheck, ShieldHalf, Shield } from "lucide-react"

export const ConfidenceBadge = ({ level, score }: { level?: ConfidenceLevel; score?: number }) => {
  if (!level) return null
  const tone =
    level === "high"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : level === "medium"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-rose-50 text-rose-700 border-rose-200"

  const Icon = level === "high" ? ShieldCheck : level === "medium" ? ShieldHalf : Shield

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-tight transition-all",
        tone
      )}
    >
      <Icon size={12} />
      {level.toUpperCase()} {typeof score === "number" ? `· ${score}` : ""}
    </span>
  )
}

