"use client"

import { useEffect, useState } from "react"
import { fetchFinanceData, FinanceData, exportFinancePDF, exportFinanceExcel, generateFinanceInsights } from "@/lib/api"
import { formatCurrency, formatDate } from "@/lib/ui"
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { TrendingUp, DollarSign, Receipt, FileText, Loader2, AlertCircle, Download, Sparkles } from "lucide-react"
import toast from "react-hot-toast"
import Link from "next/link"
import { ITRAssistant } from "@/components/ITRAssistant"
import { AppLayout } from "@/components/AppLayout"
import { NumberTicker } from "@/components/ui/number-ticker"
import { ShimmerButton } from "@/components/ui/shimmer-button"
import { cn } from "@/lib/ui"

const COLORS = ['#6366f1', '#06b6d4', '#f59e0b', '#10b981', '#64748b', '#ec4899']

export default function FinancePage() {
  const [data, setData] = useState<FinanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [insights, setInsights] = useState<string | null>(null)
  const [generatingInsights, setGeneratingInsights] = useState(false)
  const [exporting, setExporting] = useState<"pdf" | "excel" | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const financeData = await fetchFinanceData()
        setData(financeData)
      } catch (error: any) {
        toast.error(error?.message || "Failed to load finance data")
        console.error("Finance data error:", error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const handleExportPDF = async () => {
    try {
      setExporting("pdf")
      const blob = await exportFinancePDF()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `finance-report-${Date.now()}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success("PDF exported successfully")
    } catch (error: any) {
      toast.error(error?.message || "Failed to export PDF")
    } finally {
      setExporting(null)
    }
  }

  const handleExportExcel = async () => {
    try {
      setExporting("excel")
      const blob = await exportFinanceExcel()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `finance-report-${Date.now()}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success("Excel exported successfully")
    } catch (error: any) {
      toast.error(error?.message || "Failed to export Excel")
    } finally {
      setExporting(null)
    }
  }

  const handleGenerateInsights = async () => {
    if (!data) return
    try {
      setGeneratingInsights(true)
      const generatedInsights = await generateFinanceInsights(data)
      setInsights(generatedInsights)
      toast.success("Insights generated successfully")
    } catch (error: any) {
      toast.error(error?.message || "Failed to generate insights")
    } finally {
      setGeneratingInsights(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading finance data...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-rose-500 mx-auto mb-4" />
          <p className="text-gray-600">Failed to load finance data</p>
        </div>
      </div>
    )
  }

  return (
    <AppLayout>
      <div>
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">FinanceHub</h1>
              <p className="text-slate-500 mt-1">Track earnings, GST, TDS, and generate AI insights.</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleExportPDF}
                disabled={exporting !== null}
                className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
              >
                <Download className="w-4 h-4" />
                {exporting === "pdf" ? "Exporting..." : "Export PDF"}
              </button>
              <button
                onClick={handleExportExcel}
                disabled={exporting !== null}
                className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
              >
                <Download className="w-4 h-4" />
                {exporting === "excel" ? "Exporting..." : "Export Excel"}
              </button>
            </div>
          </div>
        </div>
        {/* AI Insights Section */}
        <div className="mb-10">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">AI Finance Insights</h2>
                {!insights && !generatingInsights && (
                  <p className="text-slate-500 mt-1">Generate deep insights using your personalized financial data.</p>
                )}
              </div>
              <ShimmerButton
                onClick={handleGenerateInsights}
                disabled={generatingInsights || !data}
                className="shadow-lg"
              >
                <Sparkles className="w-4 h-4" />
                {generatingInsights ? "Generating..." : "Generate Finance Insights"}
              </ShimmerButton>
            </div>
            {insights && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 mt-4">
                <div className="prose prose-slate max-w-none">
                  <div className="whitespace-pre-line text-slate-700 leading-relaxed">{insights}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <SummaryCard
            title="Total Earnings"
            value={data.summary.totalEarnings}
            icon={TrendingUp}
            color="indigo"
          />
          <SummaryCard
            title="GST Collected"
            value={data.summary.totalGST}
            icon={Receipt}
            color="cyan"
          />
          <SummaryCard
            title="TDS Deducted"
            value={data.summary.totalTDS}
            icon={FileText}
            color="amber"
          />
          <SummaryCard
            title="Net Receivable"
            value={data.summary.netReceivable}
            icon={DollarSign}
            color="emerald"
          />
        </div>

        {/* Earnings Analytics */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Earnings Analytics</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Platform-wise Bar Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform-wise Earnings</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.platformData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="platform" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value: number | undefined) => formatCurrency(value)}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  />
                  <Bar dataKey="earnings" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Platform Pie Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Earnings Split by Platform</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.platformData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry: any) => `${entry.platform}: ${((entry.percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="earnings"
                  >
                    {data.platformData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number | undefined) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Month-wise Trend Line Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Month-wise Earnings Trend</h3>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={data.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="month"
                  stroke="#6b7280"
                  fontSize={12}
                  tickFormatter={(value) => {
                    const date = new Date(value + '-01')
                    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
                  }}
                />
                <YAxis stroke="#6b7280" fontSize={12} tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: number | undefined) => formatCurrency(value)}
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Legend />
                <Line type="monotone" dataKey="earnings" stroke="#6366f1" strokeWidth={3} dot={{ fill: '#6366f1', r: 4 }} name="Earnings" />
                <Line type="monotone" dataKey="gst" stroke="#06b6d4" strokeWidth={3} dot={{ fill: '#06b6d4', r: 4 }} name="GST" />
                <Line type="monotone" dataKey="tds" stroke="#f59e0b" strokeWidth={3} dot={{ fill: '#f59e0b', r: 4 }} name="TDS" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GST Overview */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">GST Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">GST Collected (FY)</h3>
              <p className="text-3xl font-bold text-blue-600">{formatCurrency(data.gst.collected)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Estimated GST Payable</h3>
              <p className="text-3xl font-bold text-amber-600">{formatCurrency(data.gst.estimatedPayable)}</p>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-amber-800">
              <strong>Note:</strong> This is an auto-generated GST draft for reference. Please consult your CA before filing.
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">Invoice ID</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">Brand</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-widest">Amount</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-widest">GST</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-widest">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {data.gst.tableData.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                        No GST data available
                      </td>
                    </tr>
                  ) : (
                    data.gst.tableData.map((row, index) => (
                      <tr key={index} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">{row.invoiceId}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">{row.brand}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 text-right">{formatCurrency(row.amount)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-cyan-600 font-bold text-right">{formatCurrency(row.gst)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-slate-900 text-right">{formatCurrency(row.total)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ITR Filing Assistant */}
        <div className="mb-8">
          <ITRAssistant
            totalEarnings={data.summary.totalEarnings}
            totalTDS={data.summary.totalTDS}
          />
        </div>

        {/* TDS Overview */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">TDS Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Total TDS Deducted</h3>
              <p className="text-3xl font-bold text-amber-600">{formatCurrency(data.tds.totalDeducted)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Deals with TDS &gt; 0</h3>
              <p className="text-3xl font-bold text-blue-600">{data.tds.dealsWithTDS}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">Brand</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-widest">Gross Amount</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-widest">TDS</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-widest">Net Amount</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {data.tds.tableData.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                        No TDS data available
                      </td>
                    </tr>
                  ) : (
                    data.tds.tableData.map((row, index) => (
                      <tr key={index} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{row.brand}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 text-right">{formatCurrency(row.grossAmount)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-amber-600 font-bold text-right">{formatCurrency(row.tds)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-slate-900 text-right">{formatCurrency(row.netAmount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AppLayout >
  )
}

function SummaryCard({ title, value, icon: Icon, color }: { title: string; value: number; icon: any; color: "indigo" | "cyan" | "amber" | "emerald" }) {
  const colorClasses = {
    indigo: "bg-indigo-100 text-indigo-600",
    cyan: "bg-cyan-100 text-cyan-600",
    amber: "bg-amber-100 text-amber-600",
    emerald: "bg-emerald-100 text-emerald-600",
  }

  return (
    <div className="group bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-lg hover:border-indigo-300 transition-all">
      <div className="flex items-start justify-between mb-4">
        <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">{title}</p>
        <div className={cn("p-2 rounded-xl", colorClasses[color])}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-bold text-slate-900">₹</span>
        <NumberTicker
          value={value}
          className="text-3xl font-bold text-slate-900"
        />
      </div>
    </div>
  )
}

