"use client"

import { useEffect, useState, useMemo } from "react"
import { Invoice, invoiceStatusLabels, invoiceStatusColors } from "@/types/invoice"
import { fetchInvoices } from "@/lib/api"
import { AppLayout } from "@/components/AppLayout"
import { InvoiceModal } from "@/components/InvoiceModal"
import {
    FileText, Search, Filter, ArrowUpRight,
    Calendar, DollarSign, Loader2, Sparkles,
    ArrowRight, CheckCircle2, Clock, AlertCircle, Edit3
} from "lucide-react"
import { cn, formatCurrency, formatDate } from "@/lib/ui"
import Link from "next/link"
import { ShimmerButton } from "@/components/ui/shimmer-button"

export default function InvoicesPage() {
    const [invoices, setInvoices] = useState<Invoice[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [filter, setFilter] = useState<"all" | "draft" | "sent" | "paid">("all")
    const [selectedDealId, setSelectedDealId] = useState<string | null>(null)

    useEffect(() => {
        const load = async () => {
            try {
                const data = await fetchInvoices()
                setInvoices(data)
            } catch (e) {
                console.error("Failed to load invoices", e)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    const filteredInvoices = useMemo(() => {
        return invoices.filter(inv => {
            const matchesSearch = inv.brandSnapshot?.name?.toLowerCase().includes(search.toLowerCase()) ||
                inv.invoiceNumber?.toLowerCase().includes(search.toLowerCase())
            const matchesFilter = filter === "all" || inv.status === filter
            return matchesSearch && matchesFilter
        })
    }, [invoices, search, filter])

    const stats = useMemo(() => {
        const total = invoices.reduce((sum, inv) => sum + (inv.netPayable || inv.amount), 0)
        const pendingCount = invoices.filter(inv => inv.status === "sent").length
        const draftCount = invoices.filter(inv => inv.status === "draft").length
        return { total, pendingCount, draftCount }
    }, [invoices])

    return (
        <AppLayout>
            <div className="space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Financials</h1>
                        <p className="text-slate-600 mt-1">Manage your invoices and track earnings across all brand deals.</p>
                    </div>
                    <Link href="/dashboard">
                        <ShimmerButton className="shadow-lg">
                            <Sparkles size={18} />
                            New Invoice
                        </ShimmerButton>
                    </Link>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm group hover:border-indigo-300 transition-all">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Total Earnings</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-slate-900">{formatCurrency(stats.total)}</span>
                            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">+12%</span>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm group hover:border-amber-300 transition-all">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Pending Approval</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-slate-900 font-mono">{stats.pendingCount}</span>
                            <span className="text-sm font-bold text-slate-500">Invoices sent</span>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm group hover:border-indigo-300 transition-all">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Drafts</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-slate-900 font-mono">{stats.draftCount}</span>
                            <span className="text-sm font-bold text-slate-500">Unsent drafts</span>
                        </div>
                    </div>
                </div>

                {/* Filters & Search */}
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by brand or invoice #..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        />
                    </div>
                    <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-full md:w-auto">
                        {(["all", "draft", "sent"] as const).map((s) => (
                            <button
                                key={s}
                                onClick={() => setFilter(s)}
                                className={cn(
                                    "flex-1 md:px-6 py-2 text-xs font-bold rounded-lg capitalize transition-all",
                                    filter === s ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Invoice Grid */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="h-10 w-10 animate-spin text-indigo-500 mb-4" />
                        <p className="text-slate-500 font-medium">Loading your financials...</p>
                    </div>
                ) : filteredInvoices.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 text-center px-6">
                        <div className="h-16 w-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-6 border border-slate-100">
                            <FileText className="h-8 w-8 text-slate-300" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">No invoices found</h3>
                        <p className="text-slate-500 mb-8 max-w-sm">No invoices match your current search or filter criteria.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredInvoices.map((inv) => (
                            <InvoiceCard
                                key={inv.invoiceId}
                                invoice={inv}
                                onOpen={() => setSelectedDealId(inv.dealId)}
                            />
                        ))}
                    </div>
                )}

                <InvoiceModal
                    isOpen={!!selectedDealId}
                    onClose={() => setSelectedDealId(null)}
                    dealId={selectedDealId || ""}
                />
            </div>
        </AppLayout>
    )
}

function InvoiceCard({ invoice, onOpen }: { invoice: Invoice, onOpen: () => void }) {
    const isOverdue = new Date(invoice.dueDate) < new Date() && invoice.status === "sent"

    return (
        <div className="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all p-6 relative overflow-hidden flex flex-col min-h-64">
            {/* Status Corner */}
            <div className={cn(
                "absolute top-0 right-0 px-4 py-1.5 rounded-bl-2xl text-[10px] font-black uppercase tracking-widest shadow-sm",
                invoiceStatusColors[invoice.status]
            )}>
                {invoiceStatusLabels[invoice.status]}
            </div>

            <div className="mb-6 flex items-start gap-4">
                <div className="h-14 w-14 rounded-2xl bg-linear-to-br from-slate-50 to-slate-100 flex items-center justify-center text-slate-400 group-hover:from-indigo-500 group-hover:to-cyan-400 group-hover:text-white transition-all duration-500 shadow-inner">
                    <FileText size={24} />
                </div>
                <div>
                    <h3 className="font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight truncate max-w-40">
                        {invoice.brandSnapshot?.name || "Untitled Brand"}
                    </h3>
                    <p className="text-xs text-slate-400 font-bold font-mono">#{invoice.invoiceNumber || "DRAFT"}</p>
                </div>
            </div>

            <div className="flex-1 space-y-4">
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Amount</p>
                    <p className="text-2xl font-black text-slate-900 tracking-tighter">
                        {formatCurrency(invoice.netPayable || invoice.amount)}
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Issue Date</p>
                        <div className="flex items-center gap-1.5 text-slate-600">
                            <Calendar size={12} className="text-slate-300" />
                            <span className="text-xs font-bold">{formatDate(invoice.invoiceDate)}</span>
                        </div>
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Due Date</p>
                        <div className={cn(
                            "flex items-center gap-1.5",
                            isOverdue ? "text-rose-600" : "text-slate-600"
                        )}>
                            {isOverdue ? <AlertCircle size={12} /> : <Clock size={12} className="text-slate-300" />}
                            <span className="text-xs font-bold">{formatDate(invoice.dueDate)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-6 w-6 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center overflow-hidden">
                                <div className="h-full w-full bg-linear-to-br from-indigo-100 to-cyan-50" />
                            </div>
                        ))}
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">
                        {invoice.deliverables?.length || 0} items
                    </span>
                </div>
                <button
                    onClick={onOpen}
                    className="h-10 w-10 rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white transition-all flex items-center justify-center group/btn shadow-sm hover:shadow-md"
                >
                    <Edit3 size={18} className="group-hover/btn:scale-110 transition-transform" />
                </button>
            </div>
        </div>
    )
}
