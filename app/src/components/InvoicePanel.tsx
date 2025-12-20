"use client"

import { useEffect, useState, useCallback } from "react"
import { Invoice, invoiceStatusLabels, invoiceStatusColors } from "@/types/invoice"
import { fetchInvoiceByDealId, sendInvoiceEmail, updateInvoiceDraft, createOrGetInvoice } from "@/lib/api"
import {
  FileText, Mail, Calendar, DollarSign, Package, Send,
  Loader2, CheckCircle2, AlertCircle, Sparkles, Download,
  Printer, X, Eye, Edit3, ShieldAlert, Clock
} from "lucide-react"
import toast from "react-hot-toast"
import { InvoicePreview } from "./InvoicePreview"
import { ShimmerButton } from "./ui/shimmer-button"
import { cn } from "@/lib/ui"

type Props = {
  dealId?: string // Optional if used in a general context
  onInvoiceUpdate?: (invoice: Invoice) => void
}

export const InvoicePanel = ({ dealId, onInvoiceUpdate }: Props) => {
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  // Builder form state
  const [formState, setFormState] = useState({
    paymentTerms: "Net-15",
    additionalNotes: "",
    paymentSplit: "full",
    invoiceDate: new Date().toISOString().split("T")[0],
  })

  const fetchInvoice = useCallback(async () => {
    if (!dealId) return
    try {
      setLoading(true)
      const data = await fetchInvoiceByDealId(dealId)
      if (data) {
        setInvoice(data)
        setFormState({
          paymentTerms: data.paymentTerms || "Net-15",
          additionalNotes: data.additionalNotes || "",
          paymentSplit: data.paymentSplit || "full",
          invoiceDate: data.invoiceDate?.split("T")[0] || new Date().toISOString().split("T")[0],
        })
        if (onInvoiceUpdate) onInvoiceUpdate(data)
      }
    } catch (error: any) {
      console.error("Failed to fetch invoice:", error)
    } finally {
      setLoading(false)
    }
  }, [dealId, onInvoiceUpdate])

  useEffect(() => {
    fetchInvoice()
  }, [fetchInvoice])

  const handleCreateInvoice = async () => {
    if (!dealId) return
    try {
      setLoading(true)
      const result = await createOrGetInvoice(dealId)
      setInvoice(result.invoice)
      setIsEditing(true)
      toast.success("Invoice draft created!")
    } catch (error: any) {
      toast.error("Failed to create invoice")
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateInvoice = async () => {
    if (!invoice) return
    try {
      setSaving(true)
      const result = await updateInvoiceDraft(invoice.invoiceId, formState)
      setInvoice(result.invoice)
      setIsEditing(false)
      toast.success("Invoice updated!")
    } catch (error: any) {
      toast.error("Failed to update invoice")
    } finally {
      setSaving(false)
    }
  }

  const handleSendInvoice = async () => {
    if (!invoice) return
    if (invoice.status !== "draft") {
      toast.error("Only draft invoices can be sent")
      return
    }
    if (!invoice.brandSnapshot?.email) {
      toast.error("Brand email is required")
      return
    }

    try {
      setSending(true)
      await sendInvoiceEmail(invoice.invoiceId)
      toast.success("Invoice emailed to brand!")
      await fetchInvoice()
    } catch (error: any) {
      toast.error(error?.message || "Failed to send")
    } finally {
      setSending(false)
    }
  }

  if (loading && !invoice) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-500 mb-4" />
        <p className="text-slate-500 font-medium">Preparing your invoice...</p>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 text-center px-6">
        <div className="h-16 w-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-6 border border-slate-100">
          <FileText className="h-8 w-8 text-slate-300" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">No Invoice Found</h3>
        <p className="text-slate-500 mb-8 max-w-sm">
          A draft invoice is automatically generated when a deal is accepted. You can also trigger it manually.
        </p>
        <button
          onClick={handleCreateInvoice}
          className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-slate-900 transition-all shadow-lg shadow-indigo-100"
        >
          Generate Invoice Draft
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Action Header */}
      <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-slate-200 shadow-sm mb-8">
        <div className="flex items-center gap-4">
          <div className={cn(
            "h-12 w-12 rounded-2xl flex items-center justify-center shadow-inner",
            invoiceStatusColors[invoice.status].split(' ')[0]
          )}>
            <FileText className={invoiceStatusColors[invoice.status].split(' ')[1]} size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-slate-400 uppercase tracking-widest font-mono">#{invoice.invoiceNumber || "DRAFT"}</span>
              <div className={cn("px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border", invoiceStatusColors[invoice.status])}>
                {invoiceStatusLabels[invoice.status]}
              </div>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Last updated {new Date(invoice.updatedAt).toLocaleTimeString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {invoice.status === "draft" && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-2"
            >
              {isEditing ? <Eye size={18} /> : <Edit3 size={18} />}
              {isEditing ? "Live Preview" : "Edit Builder"}
            </button>
          )}
          <ShimmerButton
            disabled={sending || invoice.status !== "draft"}
            onClick={handleSendInvoice}
            className="shadow-xl"
          >
            <Send size={18} />
            {sending ? "Sending..." : "Send to Brand"}
          </ShimmerButton>
        </div>
      </div>

      {/* Main UI: Builder & Preview */}
      <div className={cn(
        "grid gap-10 transition-all duration-700 ease-in-out",
        isEditing ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"
      )}>
        {/* Builder Form */}
        {isEditing && (
          <div className="bg-white rounded-3xl border border-slate-200 p-10 shadow-xl shadow-slate-100/50 space-y-10 animate-in slide-in-from-left duration-500">
            <div>
              <h3 className="text-lg font-black text-slate-900 mb-2 flex items-center gap-2">
                <Edit3 className="text-indigo-600" size={20} />
                Invoice Details
              </h3>
              <p className="text-sm text-slate-500">Fill in the payment terms and notes for this brand.</p>
            </div>

            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-8">
                {/* Invoice Date Input */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Invoice Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="date"
                      value={formState.invoiceDate}
                      onChange={(e) => setFormState({ ...formState, invoiceDate: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                </div>
                {/* Payment Terms Select */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Payment Terms</label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <select
                      value={formState.paymentTerms}
                      onChange={(e) => setFormState({ ...formState, paymentTerms: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all appearance-none"
                    >
                      <option value="Net-7">Net-7 (7 days)</option>
                      <option value="Net-15">Net-15 (15 days)</option>
                      <option value="Net-30">Net-30 (30 days)</option>
                      <option value="50% advance">50% Advance</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Payment Split */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Payment Split</label>
                <div className="grid grid-cols-3 gap-3">
                  {(["full", "half", "custom"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setFormState({ ...formState, paymentSplit: s })}
                      className={cn(
                        "flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest border transition-all",
                        formState.paymentSplit === s
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100"
                          : "bg-white border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600"
                      )}
                    >
                      {s === "full" ? "100% Upfront" : s === "half" ? "50/50 Split" : "Custom Split"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Additional Notes */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Additional Notes</label>
                <textarea
                  placeholder="Payment details, reach metrics, or thank you note..."
                  value={formState.additionalNotes}
                  onChange={(e) => setFormState({ ...formState, additionalNotes: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all min-h-36 resize-none"
                />
              </div>

              {invoice.missingFields && invoice.missingFields.length > 0 && (
                <div className="rounded-2xl border-2 border-amber-100 bg-amber-50 p-6 flex gap-4 text-amber-800">
                  <ShieldAlert size={24} className="shrink-0 text-amber-600" />
                  <div className="text-sm">
                    <p className="font-black mb-2 uppercase tracking-tight">Missing Information</p>
                    <p className="text-amber-700/80 mb-3 font-medium">Please provide these details for a complete tax invoice:</p>
                    <div className="flex flex-wrap gap-2">
                      {invoice.missingFields.map(f => (
                        <span key={f} className="px-2.5 py-1 bg-white rounded-lg text-[10px] font-black uppercase text-amber-600 border border-amber-200">{f}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-8 border-t border-slate-100">
                <button
                  disabled={saving}
                  onClick={handleUpdateInvoice}
                  className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-slate-200 hover:bg-indigo-600 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 size={20} />}
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Live Preview */}
        <div className={cn(
          "transition-all duration-500",
          !isEditing && "max-w-4xl mx-auto w-full"
        )}>
          <div className="sticky top-8">
            <div className="flex items-center justify-between mb-4 px-2">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Eye size={14} /> Live Preview
              </h3>
              <div className="flex gap-2">
                <button className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg bg-slate-50 hover:bg-indigo-50 transition-all" title="Print View">
                  <Printer size={16} />
                </button>
                <button className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg bg-slate-50 hover:bg-indigo-50 transition-all" title="Download PDF">
                  <Download size={16} />
                </button>
              </div>
            </div>

            <InvoicePreview
              invoice={{
                ...invoice,
                paymentTerms: formState.paymentTerms,
                invoiceDate: formState.invoiceDate,
                // Note: Actual netPayable calculation happens on backend, but we can simulate here if needed
              } as any}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
