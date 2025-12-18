"use client"

import { useEffect, useState, useCallback } from "react"
import { Invoice, invoiceStatusLabels, invoiceStatusColors } from "@/types/invoice"
import { fetchInvoiceByDealId, sendInvoiceEmail } from "@/lib/api"
import { FileText, Mail, Calendar, DollarSign, Package, Send, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import toast from "react-hot-toast"

type Props = {
  dealId: string
  onInvoiceUpdate?: (invoice: Invoice) => void
}

export const InvoicePanel = ({ dealId, onInvoiceUpdate }: Props) => {
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  const fetchInvoice = useCallback(async () => {
    try {
      setLoading(true)
      const data = await fetchInvoiceByDealId(dealId)
      setInvoice(data)
      if (data && onInvoiceUpdate) {
        onInvoiceUpdate(data)
      }
    } catch (error: any) {
      console.error("Failed to fetch invoice:", error)
      // Don't show error if invoice doesn't exist yet
      if (!error.message?.includes("404")) {
        toast.error("Failed to load invoice")
      }
    } finally {
      setLoading(false)
    }
  }, [dealId, onInvoiceUpdate])

  useEffect(() => {
    fetchInvoice()
    // Auto-refresh every 5 seconds to catch updates from FB replies
    const interval = setInterval(fetchInvoice, 5000)
    return () => clearInterval(interval)
  }, [fetchInvoice])

  const handleSendInvoice = async () => {
    if (!invoice) return

    if (invoice.status !== "draft") {
      toast.error("Only draft invoices can be sent")
      return
    }

    if (!invoice.brandSnapshot?.email) {
      toast.error("Brand email is required to send invoice")
      return
    }

    try {
      setSending(true)
      const result = await sendInvoiceEmail(invoice.invoiceId)
      toast.success(result.message || "Invoice sent successfully!")
      // Refresh invoice to get updated status
      await fetchInvoice()
    } catch (error: any) {
      toast.error(error?.message || "Failed to send invoice")
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6">
        <div className="text-center py-8">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Invoice will be created when deal is accepted</p>
        </div>
      </div>
    )
  }

  const isReadOnly = invoice.status === "sent"
  const canSend = invoice.status === "draft" && !!invoice.brandSnapshot?.email

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString("en-IN")}`
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <FileText className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-bold text-gray-900">Invoice</h3>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-medium border ${invoiceStatusColors[invoice.status]}`}
            >
              {invoiceStatusLabels[invoice.status]}
            </span>
          </div>
          {invoice.invoiceNumber && (
            <p className="text-sm text-gray-500">Invoice #{invoice.invoiceNumber}</p>
          )}
        </div>
        {canSend && !isReadOnly && (
          <button
            onClick={handleSendInvoice}
            disabled={sending}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send Invoice
              </>
            )}
          </button>
        )}
      </div>

      {/* Status Messages */}
      {invoice.status === "awaiting_details" && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-900">Awaiting Brand Details</p>
            <p className="text-xs text-amber-700 mt-1">
              Waiting for brand to provide missing information via Facebook.
              {invoice.missingFields && invoice.missingFields.length > 0 && (
                <span className="block mt-1">
                  Missing: {invoice.missingFields.join(", ")}
                </span>
              )}
            </p>
          </div>
        </div>
      )}

      {invoice.status === "sent" && (
        <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-900">Invoice Sent</p>
            <p className="text-xs text-green-700 mt-1">
              Invoice has been sent to {invoice.brandSnapshot?.email}
            </p>
          </div>
        </div>
      )}

      {/* Invoice Details */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
        <div className="flex items-start gap-3">
          <Calendar className="h-4 w-4 text-gray-400 mt-1" />
          <div>
            <p className="text-xs text-gray-500">Invoice Date</p>
            <p className="text-sm font-medium text-gray-900">{formatDate(invoice.invoiceDate)}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Calendar className="h-4 w-4 text-gray-400 mt-1" />
          <div>
            <p className="text-xs text-gray-500">Due Date</p>
            <p className="text-sm font-medium text-gray-900">{formatDate(invoice.dueDate)}</p>
          </div>
        </div>
      </div>

      {/* Brand Info */}
      {invoice.brandSnapshot && (
        <div className="pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 mb-2">Bill To</p>
          <div className="space-y-1">
            {invoice.brandSnapshot.name && (
              <p className="text-sm font-medium text-gray-900">{invoice.brandSnapshot.name}</p>
            )}
            {invoice.brandSnapshot.email && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="h-3 w-3" />
                {invoice.brandSnapshot.email}
              </div>
            )}
            {invoice.brandSnapshot.pocName && (
              <p className="text-sm text-gray-600">Contact: {invoice.brandSnapshot.pocName}</p>
            )}
            {invoice.brandSnapshot.gstin && (
              <p className="text-sm text-gray-600">GSTIN: {invoice.brandSnapshot.gstin}</p>
            )}
            {invoice.brandSnapshot.address && (
              <p className="text-sm text-gray-600">{invoice.brandSnapshot.address}</p>
            )}
          </div>
        </div>
      )}

      {/* Deliverables */}
      {invoice.deliverables && invoice.deliverables.length > 0 && (
        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <Package className="h-4 w-4 text-gray-400" />
            <p className="text-xs text-gray-500 uppercase tracking-wide">Deliverables</p>
          </div>
          <ul className="space-y-2">
            {invoice.deliverables.map((del, idx) => (
              <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                <span className="text-gray-400">•</span>
                <span>{del}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Amount Summary */}
      <div className="pt-4 border-t border-gray-200 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Amount</span>
          <span className="text-sm font-medium text-gray-900">{formatCurrency(invoice.amount)}</span>
        </div>
        {invoice.gstAmount && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">GST</span>
            <span className="text-sm font-medium text-gray-900">{formatCurrency(invoice.gstAmount)}</span>
          </div>
        )}
        {invoice.tdsAmount && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">TDS</span>
            <span className="text-sm font-medium text-gray-900">{formatCurrency(invoice.tdsAmount)}</span>
          </div>
        )}
        <div className="flex justify-between items-center pt-2 border-t border-gray-200">
          <span className="text-sm font-medium text-gray-900">Total</span>
          <span className="text-lg font-bold text-gray-900">
            {formatCurrency(invoice.netPayable || invoice.amount)}
          </span>
        </div>
      </div>

      {/* Read-only notice */}
      {isReadOnly && (
        <div className="pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            This invoice has been sent and cannot be modified
          </p>
        </div>
      )}
    </div>
  )
}


