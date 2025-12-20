"use client"

import { useEffect, useState, useMemo } from "react"
import { fetchFinanceData, FinanceData, generateFinanceInsights } from "@/lib/api"
import { formatCurrency, formatDate, cn } from "@/lib/ui"
import {
  PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts"
import {
  TrendingUp, DollarSign, AlertCircle, Sparkles, Calendar, Clock,
  ArrowUpRight, ArrowDownRight, Landmark, PieChart as PieIcon,
  ChevronRight, Printer, Loader2, Plus
} from "lucide-react"
import toast from "react-hot-toast"
import { AppLayout } from "@/components/AppLayout"
import { NumberTicker } from "@/components/ui/number-ticker"
import { ShimmerButton } from "@/components/ui/shimmer-button"
import { MagicCard } from "@/components/ui/magic-card"

export default function FinancePage() {
  const [data, setData] = useState<FinanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [insights, setInsights] = useState<string | null>(null)
  const [generatingInsights, setGeneratingInsights] = useState(false)
  const [activeRange, setActiveRange] = useState("Month")

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const financeData = await fetchFinanceData()
        setData(financeData)
      } catch (error: any) {
        toast.error(error?.message || "Failed to load finance data")
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const handleGenerateInsights = async () => {
    if (!data) return
    try {
      setGeneratingInsights(true)
      const generatedInsights = await generateFinanceInsights(data)
      setInsights(generatedInsights)
      toast.success("Insights generated!")
    } catch (error: any) {
      toast.error("Failed to generate insights")
    } finally {
      setGeneratingInsights(false)
    }
  }

  // Formatting for Recharts
  const pieData = useMemo(() => {
    if (!data) return []
    return data.platformData.map((p, i) => ({
      name: p.platform.charAt(0).toUpperCase() + p.platform.slice(1),
      value: p.earnings,
      color: ['#6366f1', '#06b6d4', '#f59e0b', '#ec4899', '#10b981'][i % 5]
    }))
  }, [data])

  // Combine GST and TDS data for "Recent Transactions"
  const recentTransactions = useMemo(() => {
    if (!data) return []

    // Use GST entries as proxy for "Income" (since GST is collected on income)
    const incomeTxs = data.gst.tableData.map(item => ({
      id: `inc-${item.invoiceId}`,
      type: "income",
      title: `Payment from ${item.brand}`,
      amount: item.amount, // Base amount without GST
      date: item.createdAt,
      category: "Deal Income"
    }))

    // Use TDS entries as "Tax" deductions
    const taxTxs = data.tds.tableData.map(item => ({
      id: `tax-${item.dealId}`,
      type: "tax",
      title: `TDS Deducted - ${item.brand}`,
      amount: item.tds,
      date: item.createdAt,
      category: "Tax Deduction"
    }))

    return [...incomeTxs, ...taxTxs]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10) // Show last 10 transactions
  }, [data])

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
          <div className="h-16 w-16 bg-indigo-50 rounded-2xl flex items-center justify-center animate-pulse">
            <Landmark className="text-indigo-600 h-8 w-8" />
          </div>
          <p className="text-slate-500 font-medium animate-pulse">Securing your financial vault...</p>
        </div>
      </AppLayout>
    )
  }

  if (!data) return null

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-10 pb-20">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest border border-indigo-100 mb-2">
              <Landmark size={12} /> Financial Command Center
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">FinanceHub</h1>
            <p className="text-slate-500 font-medium">Detailed breakdown of your content creation economy.</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden lg:flex p-1 bg-slate-100 rounded-xl border border-slate-200">
              {["Month", "Quarter", "Year"].map(r => (
                <button
                  key={r}
                  onClick={() => setActiveRange(r)}
                  className={cn(
                    "px-4 py-2 text-xs font-bold rounded-lg transition-all",
                    activeRange === r ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
            <div className="h-10 w-[1px] bg-slate-200 mx-2 hidden md:block" />
            <div className="flex gap-2">
              <button className="h-11 w-11 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm transition-all">
                <Printer size={18} />
              </button>
              <button
                onClick={handleGenerateInsights}
                disabled={generatingInsights}
                className="h-11 px-5 flex items-center gap-2 rounded-xl bg-slate-900 text-white font-bold text-sm shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all disabled:opacity-50"
              >
                {generatingInsights ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                <span>Insights</span>
              </button>
            </div>
          </div>
        </div>

        {/* 1. FINANCIAL OVERVIEW CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Month Earnings"
            value={data.summary.totalEarnings / 12} // Adjusted logic could be better if backend sent monthly
            trend="+12.5%"
            up={true}
            icon={TrendingUp}
            color="indigo"
          />
          <StatCard
            title="Year to Date"
            value={data.summary.totalEarnings}
            trend="+24%"
            up={true}
            icon={Calendar}
            color="cyan"
          />
          <StatCard
            title="Pending Payments"
            value={data.summary.netReceivable}
            trend="4 Pending"
            up={false}
            icon={Clock}
            color="amber"
          />
          <StatCard
            title="Tax Liability"
            value={data.gst.estimatedPayable}
            trend="Est. Q3"
            up={false}
            icon={AlertCircle}
            color="rose"
          />
        </div>

        {/* 2. MAIN CHARTS SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Income Timeline */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Income Timeline</h3>
                <p className="text-xs text-slate-400 font-medium">Last 6 months revenue growth</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-indigo-500" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Earnings</span>
                </div>
              </div>
            </div>

            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.monthlyTrend}>
                  <defs>
                    <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                    dy={10}
                    tickFormatter={(val) => new Date(val + '-01').toLocaleDateString('en-US', { month: 'short' })}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                    tickFormatter={(val) => `₹${val / 1000}k`}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(val: number) => [formatCurrency(val), "Earnings"]}
                  />
                  <Area type="monotone" dataKey="earnings" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorEarnings)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Income Breakdown Pie */}
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
            <h3 className="text-lg font-black text-slate-900 tracking-tight mb-1">Source Breakdown</h3>
            <p className="text-xs text-slate-400 font-medium mb-8">Revenue split by category</p>

            <div className="h-[240px] w-full mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-3">
              {pieData.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between group cursor-default">
                  <div className="flex items-center gap-3">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm font-bold text-slate-600 group-hover:text-slate-200 transition-colors">{item.name}</span>
                  </div>
                  <span className="text-sm font-black text-slate-900">{((item.value / data.summary.totalEarnings) * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3. TAX DASHBOARD & INSIGHTS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <MagicCard className="p-8 border-indigo-100 bg-linear-to-br from-indigo-50/50 to-white">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-100">
                  <PieIcon size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Tax Dashboard</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">GST Registered</span>
                  </div>
                </div>
              </div>
              <button className="text-xs font-black text-indigo-600 uppercase tracking-widest hover:underline">View GST Returns</button>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-10">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Projected Annual</p>
                <div className="text-2xl font-black text-slate-900">₹{(data.summary.totalEarnings * 1.2 / 100000).toFixed(1)}L</div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Est. Liability</p>
                <div className="text-2xl font-black text-rose-600">₹{(data.gst.estimatedPayable / 1000).toFixed(1)}K</div>
              </div>
            </div>

            <div className="space-y-3 mb-10">
              <div className="flex justify-between text-xs font-bold text-slate-600 uppercase tracking-tight">
                <span>Tax Compliance Progress</span>
                <span>65% Paid</span>
              </div>
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div className="h-full bg-linear-to-r from-indigo-500 to-cyan-500 w-[65%] rounded-full shadow-inner" />
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Next Advance Tax: March 15th • ₹12,400</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <ShimmerButton className="text-xs px-4 py-2">Download Tax Report</ShimmerButton>
              <button className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 transition-all">Add Expense</button>
            </div>
          </MagicCard>

          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm flex flex-col">
            <h3 className="text-lg font-black text-slate-900 tracking-tight mb-6 flex items-center gap-2">
              <Sparkles className="text-amber-500" size={20} />
              Quick Financial Insights
            </h3>

            <div className="space-y-4 flex-1 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
              {!insights && !generatingInsights && (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-6 border-2 border-dashed border-slate-100 rounded-2xl">
                  <Sparkles size={32} className="mb-3 text-slate-200" />
                  <p className="text-sm font-medium">Click "Insights" to analyze your earnings</p>
                </div>
              )}

              {generatingInsights && (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-3">
                  <Loader2 size={24} className="animate-spin text-indigo-600" />
                  <p className="text-sm font-bold animate-pulse">Analyzing your financial data...</p>
                </div>
              )}

              {insights && (
                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  {insights.split(/•|\n\s*•/).filter(i => i.trim().length > 0).map((insight, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-white hover:border-indigo-100 hover:shadow-md transition-all group">
                      <div className="flex gap-3">
                        <div className="h-6 w-6 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                          <Sparkles size={12} />
                        </div>
                        <p className="text-sm font-medium text-slate-600 leading-relaxed group-hover:text-slate-900 transition-colors">
                          {insight.trim()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 4. RECENT TRANSACTIONS (Real Data) */}
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Clock className="text-indigo-600" size={24} />
                Recent Ledger
              </h3>
              <p className="text-sm text-slate-500 font-medium ml-8">Recent income and tax events</p>
            </div>

            <button className="h-10 px-5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2">
              <span>View Full History</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="space-y-4">
            {recentTransactions.length === 0 ? (
              <div className="text-center py-10 text-slate-400 font-medium">
                No recent transactions found.
              </div>
            ) : (
              recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-5 rounded-2xl bg-slate-50/30 border border-transparent hover:border-slate-100 hover:bg-white transition-all cursor-pointer group">
                  <div className="flex items-center gap-5">
                    <div className={cn(
                      "h-12 w-12 rounded-2xl flex items-center justify-center shadow-inner",
                      tx.type === "income" ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
                    )}>
                      {tx.type === "income" ? <Plus size={20} /> : <DollarSign size={20} />}
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors">{tx.title}</h4>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">{formatDate(tx.date)}</span>
                        <div className="h-1 w-1 rounded-full bg-slate-300" />
                        <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">{tx.category}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={cn(
                      "text-xl font-black tracking-tight",
                      tx.type === "income" ? "text-emerald-600" : "text-amber-600"
                    )}>
                      {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}
                    </div>
                    <div className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Recorded</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </AppLayout>
  )
}

function StatCard({ title, value, trend, up, icon: Icon, color }: {
  title: string; value: number; trend: string; up: boolean; icon: any; color: string;
}) {
  const colors: Record<string, string> = {
    indigo: "bg-indigo-600 shadow-indigo-100",
    cyan: "bg-cyan-500 shadow-cyan-100",
    amber: "bg-amber-500 shadow-amber-100",
    rose: "bg-rose-500 shadow-rose-100",
  }

  return (
    <div className="group bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm hover:shadow-2xl hover:border-indigo-100 transition-all duration-500 hover:-translate-y-1 overflow-hidden relative">
      {/* Sparkline simulation */}
      <div className="absolute bottom-0 left-0 right-0 h-16 opacity-10 group-hover:opacity-20 transition-opacity">
        <svg viewBox="0 0 100 20" className="w-full h-full preserve-3d">
          <path d="M0 20 Q 25 5, 50 15 T 100 10" fill="none" stroke="currentColor" strokeWidth="2" className={cn(up ? "text-emerald-500" : "text-amber-500")} />
        </svg>
      </div>

      <div className="flex items-start justify-between mb-8">
        <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center text-white shadow-2xl transition-transform group-hover:scale-110 duration-500", colors[color])}>
          <Icon size={28} />
        </div>
        <div className={cn(
          "flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase",
          up ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-amber-50 text-amber-600 border border-amber-100"
        )}>
          {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {trend}
        </div>
      </div>

      <div className="relative z-10">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{title}</p>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-black text-slate-900">₹</span>
          <NumberTicker
            value={value}
            className="text-3xl font-black text-slate-900"
          />
        </div>
      </div>
    </div>
  )
}
