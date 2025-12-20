"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, X, ArrowRight, Zap } from "lucide-react"
import { Deal } from "@/types/deal"
import { formatCurrency } from "@/lib/ui"

interface Props {
    deal: Deal | null
    onClose: () => void
    onView: () => void
}

export const NewDealPopup = ({ deal, onClose, onView }: Props) => {
    if (!deal) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 100, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
                className="fixed bottom-8 right-8 z-100 w-96 overflow-hidden rounded-3xl border-4 border-indigo-400 bg-white p-1 shadow-2xl shadow-indigo-200"
            >
                <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-white to-slate-50 p-6">
                    {/* Animated Glow Background */}
                    <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl" />
                    <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl" />

                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 transition-colors"
                    >
                        <X size={20} />
                    </button>

                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200 animate-bounce">
                                <Sparkles size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 leading-tight">New Brand Deal!</h3>
                                <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Action Required</p>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-bold text-slate-900">{deal.brand?.name}</span>
                                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-100">
                                    <Zap size={10} className="mr-1 fill-emerald-500" />
                                    Smart Detected
                                </span>
                            </div>
                            <div className="text-2xl font-black text-slate-900">
                                {deal.terms?.proposedBudget ? formatCurrency(deal.terms.proposedBudget) : "Inquiry"}
                            </div>
                        </div>

                        <button
                            onClick={onView}
                            className="group flex w-full items-center justify-between rounded-xl bg-slate-900 px-6 py-4 text-sm font-bold text-white transition-all hover:bg-indigo-600 hover:shadow-lg hover:shadow-indigo-200"
                        >
                            <span>Review Details</span>
                            <ArrowRight size={18} className="translate-x-0 transition-transform group-hover:translate-x-1" />
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    )
}
