"use client"

import { useEffect, useState } from "react"
import { fetchFinanceData, FinanceData, exportFinancePDF, exportFinanceExcel, generateFinanceInsights } from "@/lib/api"
import { formatCurrency, formatDate } from "@/lib/ui"
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { TrendingUp, DollarSign, Receipt, FileText, Loader2, AlertCircle, Download, Sparkles } from "lucide-react"
import toast from "react-hot-toast"
import Link from "next/link"
import { ITRAssistant } from "@/components/ITRAssistant"

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4']

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">FinanceHub</h1>
              <p className="text-gray-600 mt-1">Financial analytics and overview</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleExportPDF}
                disabled={exporting !== null}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                {exporting === "pdf" ? "Exporting..." : "Export PDF"}
              </button>
              <button
                onClick={handleExportExcel}
                disabled={exporting !== null}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                {exporting === "excel" ? "Exporting..." : "Export Excel"}
              </button>
              <Link
                href="/dashboard"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* AI Insights Section */}
        <div className="mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">AI Finance Insights</h2>
              <button
                onClick={handleGenerateInsights}
                disabled={generatingInsights || !data}
                className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                {generatingInsights ? "Generating..." : "Generate Finance Insights"}
              </button>
            </div>
            {insights && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mt-4">
                <div className="prose prose-sm max-w-none">
                  <div className="whitespace-pre-line text-gray-700 leading-relaxed">{insights}</div>
                </div>
              </div>
            )}
            {!insights && !generatingInsights && (
              <p className="text-sm text-gray-500 mt-2">Click the button above to generate AI-powered financial insights based on your data.</p>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <SummaryCard
            title="Total Earnings"
            value={data.summary.totalEarnings}
            icon={<DollarSign className="h-6 w-6" />}
            color="emerald"
          />
          <SummaryCard
            title="GST Collected"
            value={data.summary.totalGST}
            icon={<Receipt className="h-6 w-6" />}
            color="blue"
          />
          <SummaryCard
            title="TDS Deducted"
            value={data.summary.totalTDS}
            icon={<FileText className="h-6 w-6" />}
            color="amber"
          />
          <SummaryCard
            title="Net Receivable"
            value={data.summary.netReceivable}
            icon={<TrendingUp className="h-6 w-6" />}
            color="purple"
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
                  <Bar dataKey="earnings" fill="#10b981" radius={[8, 8, 0, 0]} />
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
                <Line type="monotone" dataKey="earnings" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 4 }} name="Earnings" />
                <Line type="monotone" dataKey="gst" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 4 }} name="GST" />
                <Line type="monotone" dataKey="tds" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 4 }} name="TDS" />
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Invoice ID</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Brand</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">GST</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.gst.tableData.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                        No GST data available
                      </td>
                    </tr>
                  ) : (
                    data.gst.tableData.map((row, index) => (
                      <tr key={index} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.invoiceId}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{row.brand}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(row.amount)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(row.gst)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">{formatCurrency(row.total)}</td>
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Brand</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Gross Amount</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">TDS</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Net Amount</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.tds.tableData.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                        No TDS data available
                      </td>
                    </tr>
                  ) : (
                    data.tds.tableData.map((row, index) => (
                      <tr key={index} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.brand}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(row.grossAmount)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(row.tds)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">{formatCurrency(row.netAmount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SummaryCard({ title, value, icon, color }: { title: string; value: number; icon: React.ReactNode; color: string }) {
  const colorClasses = {
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-200",
    blue: "bg-blue-50 text-blue-600 border-blue-200",
    amber: "bg-amber-50 text-amber-600 border-amber-200",
    purple: "bg-purple-50 text-purple-600 border-purple-200",
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">{title}</h3>
        <div className={`p-2 rounded-lg border ${colorClasses[color as keyof typeof colorClasses]}`}>
          {icon}
        </div>
      </div>
      <p className="text-3xl font-bold text-gray-900">{formatCurrency(value)}</p>
    </div>
  )
}

