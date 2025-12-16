import { useMemo, useState } from "react"
import { Bell, CheckCircle2, Clock, X } from "lucide-react"
import { cn } from "@/lib/ui"

export type NotificationItem = {
  id: string
  title: string
  body: string
  time: string
  tone?: "success" | "info" | "warning"
}

export const NotificationBell = ({
  items,
  onClear,
}: {
  items: NotificationItem[]
  onClear: () => void
}) => {
  const [open, setOpen] = useState(false)
  const count = items.length
  const ordered = useMemo(() => [...items].slice(-10).reverse(), [items])

  return (
    <div className="relative">
      <button
        className="relative rounded-xl bg-white border border-gray-200 px-3 py-2 shadow-sm hover:shadow-md hover:border-gray-300 transition-all text-gray-700"
        onClick={() => setOpen(prev => !prev)}
      >
        <Bell size={20} />
        {count > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full shadow-md">
            {count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-96 rounded-2xl border border-gray-200 bg-white shadow-xl p-4 space-y-3 z-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-900 font-semibold">
              <Bell size={18} /> Notifications
            </div>
            <button className="text-xs text-gray-500 hover:text-gray-900 transition-colors" onClick={onClear}>
              Clear all
            </button>
          </div>
          {ordered.length === 0 && (
            <div className="text-sm text-gray-500 flex items-center gap-2 py-8 justify-center">
              <Clock size={14} /> No recent events
            </div>
          )}
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {ordered.map(item => (
              <div
                key={item.id}
                className={cn(
                  "rounded-xl border px-3 py-2.5 text-sm shadow-sm transition-all hover:shadow-md",
                  item.tone === "success"
                    ? "border-emerald-200 bg-emerald-50"
                    : item.tone === "warning"
                      ? "border-amber-200 bg-amber-50"
                      : "border-gray-200 bg-gray-50"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-gray-900">{item.title}</div>
                  {item.tone === "success" ? (
                    <CheckCircle2 size={16} className="text-emerald-600" />
                  ) : item.tone === "warning" ? (
                    <X size={16} className="text-amber-600" />
                  ) : null}
                </div>
                <div className="text-gray-700 mt-0.5">{item.body}</div>
                <div className="text-xs text-gray-500 mt-1">{item.time}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

