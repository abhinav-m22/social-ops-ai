import { Invoice } from "@/types/invoice"
import { BorderBeam } from "./ui/border-beam"
import { formatCurrency, formatDate, cn } from "@/lib/ui"
import { FileText, Download, Printer } from "lucide-react"

type Props = {
    invoice: Partial<Invoice>
    className?: string
}

export const InvoicePreview = ({ invoice, className }: Props) => {
    const brand = invoice.brandSnapshot
    const creator = invoice.creatorSnapshot

    return (
        <div className={cn("relative bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200", className)}>
            <BorderBeam size={250} duration={12} delay={9} />

            <div className="p-8 sm:p-12 min-h-200 flex flex-col bg-white">
                {/* Header */}
                <div className="flex justify-between items-start mb-12">
                    <div>
                        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tighter uppercase mb-2">
                            Tax Invoice
                        </h1>
                        <div className="flex items-center gap-2 text-slate-500 font-medium">
                            <FileText size={16} />
                            <span>#{invoice.invoiceNumber || "DRAFT"}</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Date</div>
                        <div className="text-slate-900 font-bold">{invoice.invoiceDate ? formatDate(invoice.invoiceDate) : "TBD"}</div>
                        <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-4 mb-1">Due Date</div>
                        <div className="text-slate-900 font-bold">{invoice.dueDate ? formatDate(invoice.dueDate) : "TBD"}</div>
                    </div>
                </div>

                {/* Addresses */}
                <div className="grid grid-cols-2 gap-12 mb-12">
                    <div>
                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-3">From</p>
                        <div className="space-y-1">
                            <p className="text-lg font-bold text-slate-900">{creator?.name || "Creator Name"}</p>
                            <p className="text-sm text-slate-600 font-medium">{creator?.email}</p>
                            {creator?.gstin && <p className="text-sm text-slate-500">GSTIN: {creator.gstin}</p>}
                            <p className="text-sm text-slate-500 wrap-break-word max-w-62.5">{creator?.address}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-3">Bill To</p>
                        <div className="space-y-1">
                            <p className="text-lg font-bold text-slate-900">{brand?.name || "Brand Name"}</p>
                            <p className="text-sm text-slate-600 font-medium">{brand?.email}</p>
                            {brand?.gstin && <p className="text-sm text-slate-500">GSTIN: {brand.gstin}</p>}
                            <p className="text-sm text-slate-500 wrap-break-word ml-auto max-w-62.5">{brand?.address}</p>
                        </div>
                    </div>
                </div>

                {/* Deliverables Table */}
                <div className="flex-1">
                    <table className="w-full mb-8">
                        <thead>
                            <tr className="border-b-2 border-slate-100">
                                <th className="py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                                <th className="py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {invoice.deliverables?.map((del, idx) => (
                                <tr key={idx} className="group">
                                    <td className="py-5 text-slate-700 font-medium">{del}</td>
                                    <td className="py-5 text-right text-slate-900 font-bold tracking-tight">
                                        {formatCurrency(invoice.amount || 0)}
                                    </td>
                                </tr>
                            ))}
                            {!invoice.deliverables?.length && (
                                <tr>
                                    <td className="py-5 text-slate-400 italic">No deliverables added</td>
                                    <td className="py-5 text-right font-bold text-slate-900">{formatCurrency(invoice.amount || 0)}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Calculations */}
                <div className="w-full max-w-75 ml-auto space-y-3 mb-10">
                    <div className="flex justify-between items-center text-sm font-medium text-slate-500">
                        <span>Subtotal</span>
                        <span className="text-slate-900">{formatCurrency(invoice.amount || 0)}</span>
                    </div>
                    {invoice.gstAmount !== undefined && (
                        <div className="flex justify-between items-center text-sm font-medium text-slate-500">
                            <span>GST @ 18%</span>
                            <span className="text-slate-900">{formatCurrency(invoice.gstAmount)}</span>
                        </div>
                    )}
                    <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                        <span className="text-base font-bold text-slate-900">Total</span>
                        <span className="text-xl font-black text-slate-900 tracking-tight">
                            {formatCurrency((invoice.amount || 0) + (invoice.gstAmount || 0))}
                        </span>
                    </div>
                    {invoice.tdsAmount !== undefined && invoice.tdsAmount > 0 && (
                        <div className="flex justify-between items-center text-sm font-bold text-rose-500">
                            <span>Less: TDS</span>
                            <span>- {formatCurrency(invoice.tdsAmount)}</span>
                        </div>
                    )}
                    <div className="pt-4 border-t-2 border-indigo-100 flex justify-between items-center">
                        <span className="text-lg font-black text-indigo-600 uppercase tracking-tighter">Net Payable</span>
                        <span className="text-3xl font-black text-indigo-600 tracking-tighter">
                            {formatCurrency(invoice.netPayable || invoice.amount || 0)}
                        </span>
                    </div>
                </div>

                {/* Payment Details */}
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 mb-10">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Payment Information</h3>
                    <div className="grid grid-cols-2 gap-6 text-sm">
                        <div>
                            <p className="text-slate-400 font-medium mb-1">Bank Name</p>
                            <p className="text-slate-900 font-bold">{creator?.bankName || "HDFC Bank"}</p>
                        </div>
                        <div>
                            <p className="text-slate-400 font-medium mb-1">Account Number</p>
                            <p className="text-slate-900 font-bold">{creator?.accountNumber || "•••• •••• 4242"}</p>
                        </div>
                        <div>
                            <p className="text-slate-400 font-medium mb-1">IFSC Code</p>
                            <p className="text-slate-900 font-bold">{creator?.ifscCode || "HDFC0001234"}</p>
                        </div>
                        <div>
                            <p className="text-slate-400 font-medium mb-1">Account Holder</p>
                            <p className="text-slate-900 font-bold">{creator?.name || "Creator Name"}</p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-auto pt-8 border-t border-slate-100 text-center">
                    <p className="text-xs text-slate-400 font-medium mb-2">
                        {invoice.campaignName && `Campaign: ${invoice.campaignName} • `}
                        Please pay within {invoice.dueDate ? "stipulated time" : "terms"}
                    </p>
                    <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                        Generated by SocialOps AI
                    </div>
                </div>
            </div>
        </div>
    )
}
