import { X } from "lucide-react"
import { InvoicePanel } from "./InvoicePanel"
import { useEffect } from "react"

type Props = {
    isOpen: boolean
    onClose: () => void
    dealId: string
}

export const InvoiceModal = ({ isOpen, onClose, dealId }: Props) => {
    // Lock scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden"
        } else {
            document.body.style.overflow = "unset"
        }
        return () => {
            document.body.style.overflow = "unset"
        }
    }, [isOpen])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity"
                onClick={onClose}
            />

            {/* content */}
            <div className="relative w-full max-w-7xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200 animate-in fade-in zoom-in duration-300">
                {/* Header - Glassmorphism */}
                <div className="flex items-center justify-between px-10 py-6 border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-20">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-linear-to-br from-indigo-600 via-indigo-700 to-indigo-900 flex items-center justify-center text-white shadow-xl shadow-indigo-100">
                            <svg viewBox="0 0 24 24" className="w-7 h-7 fill-none stroke-current stroke-2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <path d="M14 2v6h6" />
                                <path d="M16 13H8" />
                                <path d="M16 17H8" />
                                <path d="M10 9H8" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Invoice Builder</h2>
                            <p className="text-sm text-slate-500 font-medium">Craft a professional tax invoice for your brand collaboration</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 rounded-2xl bg-slate-50 text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all border border-slate-100 group"
                    >
                        <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                </div>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto p-10 bg-slate-50/50">
                    <div className="max-w-6xl mx-auto">
                        <InvoicePanel dealId={dealId} />
                    </div>
                </div>
            </div>
        </div>
    )
}
