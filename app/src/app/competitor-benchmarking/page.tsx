"use client"

import { useCallback, useEffect, useState } from "react"
import { triggerCompetitorAnalysis, getCompetitorBenchmarking } from "@/lib/api"
import { Loader2, TrendingUp, Download, CheckCircle2, XCircle, AlertCircle } from "lucide-react"
import toast from "react-hot-toast"
import { ComparisonTable } from "@/components/competitor-benchmarking/ComparisonTable"
import { MetricsCharts } from "@/components/competitor-benchmarking/MetricsCharts"
import { AIInsightsPanel } from "@/components/competitor-benchmarking/AIInsightsPanel"
import { StrategyCard } from "@/components/competitor-benchmarking/StrategyCard"
import { exportToPDF } from "@/lib/competitor-benchmarking/pdfExport"

const CREATOR_ID = "default-creator"

type BenchmarkingStatus = 'idle' | 'running' | 'completed' | 'failed'

const CompetitorBenchmarkingPage = () => {
  const [state, setState] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [status, setStatus] = useState<BenchmarkingStatus>('idle')

  const fetchState = useCallback(async () => {
    try {
      const data = await getCompetitorBenchmarking(CREATOR_ID)
      console.log('Fetched benchmarking data:', data)
      if (data.success && data.state) {
        setState(data.state)
        setStatus(data.state.status || 'idle')
      } else {
        setState(null)
        setStatus('idle')
      }
    } catch (error: any) {
      console.error('Failed to fetch benchmarking state:', error)
      if (error.status !== 404) {
        toast.error(error?.message || 'Failed to load benchmarking data')
      }
      setState(null)
      setStatus('idle')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchState()
    
    // Poll every 3 seconds if workflow is running
    if (status === 'running') {
      const interval = setInterval(fetchState, 3000)
      return () => clearInterval(interval)
    }
  }, [fetchState, status])

  const handleAnalyze = async (force = false) => {
    try {
      setAnalyzing(true)
      const result = await triggerCompetitorAnalysis(CREATOR_ID, force)
      
      if (result.success) {
        toast.success(result.message || "Analysis started successfully")
        setStatus('running')
        // Start polling immediately
        const pollInterval = setInterval(async () => {
          await fetchState()
          if (status !== 'running') {
            clearInterval(pollInterval)
          }
        }, 3000)
        setTimeout(() => clearInterval(pollInterval), 300000) // Stop after 5 minutes
      } else if (result.status === 'running') {
        if (force) {
          toast.success("Restarting analysis...")
          setStatus('running')
        } else {
          toast.error(result.error || "Analysis already in progress")
        }
      } else {
        toast.error(result.error || "Failed to start analysis")
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to start analysis")
    } finally {
      setAnalyzing(false)
    }
  }

  const handleExport = async () => {
    if (!state || state.status !== 'completed') {
      toast.error("No completed analysis to export")
      return
    }
    try {
      await exportToPDF(state, CREATOR_ID)
      toast.success("Report exported successfully")
    } catch (error: any) {
      toast.error(error?.message || "Failed to export report")
    }
  }

  const getStatusMessage = () => {
    if (status === 'running') {
      if (state?.competitors?.length > 0 && !state?.analysis_result) {
        return "Analyzing performance..."
      } else if (state?.analysis_result) {
        return "Generating insights..."
      }
      return "Discovering competitors..."
    }
    return null
  }

  return (
    <main className="min-h-screen px-6 py-10 lg:px-12 space-y-8 max-w-[1600px] mx-auto">
      <header className="flex items-center justify-between flex-wrap gap-4 pt-4">
        <div>
          <div className="text-sm text-emerald-700 font-semibold flex items-center gap-2 mb-1 bg-emerald-50 w-fit px-3 py-1 rounded-full border border-emerald-100">
            <TrendingUp size={14} /> Competitor Benchmarking
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Competitor Analysis</h1>
          <p className="text-gray-500 mt-1 text-lg">Compare your performance against competitors and get AI-powered insights.</p>
        </div>
        <div className="flex items-center gap-3">
          {state?.status === 'completed' && (
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white text-gray-700 px-5 py-2.5 text-sm font-medium shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <Download size={18} /> Export Report
            </button>
          )}
          <button
            onClick={() => handleAnalyze(status === 'running')}
            disabled={analyzing || (status === 'running' && !state)}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 text-white px-5 py-2.5 text-sm font-medium shadow-lg shadow-emerald-600/10 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {analyzing ? (
              <>
                <Loader2 className="animate-spin" size={18} /> Starting...
              </>
            ) : status === 'running' ? (
              <>
                <Loader2 className="animate-spin" size={18} /> Restart Analysis
              </>
            ) : (
              <>
                <TrendingUp size={18} /> Analyze Competition
              </>
            )}
          </button>
        </div>
      </header>

      {/* Status Banner */}
      {status === 'running' && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 flex items-center gap-3">
          <Loader2 className="animate-spin text-blue-600" size={20} />
          <div className="flex-1">
            <div className="font-semibold text-blue-900">{getStatusMessage()}</div>
            <div className="text-sm text-blue-700 mt-0.5">This may take a few minutes...</div>
          </div>
        </div>
      )}

      {status === 'completed' && state && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex items-center gap-3">
          <CheckCircle2 className="text-emerald-600" size={20} />
          <div className="flex-1">
            <div className="font-semibold text-emerald-900">Analysis completed</div>
            <div className="text-sm text-emerald-700 mt-0.5">
              Last run: {state.last_run_at ? new Date(state.last_run_at).toLocaleString() : 'N/A'}
            </div>
          </div>
        </div>
      )}

      {status === 'failed' && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 flex items-center gap-3">
          <XCircle className="text-rose-600" size={20} />
          <div className="flex-1">
            <div className="font-semibold text-rose-900">Analysis failed</div>
            <div className="text-sm text-rose-700 mt-0.5">Please try again or contact support.</div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-gray-400" size={32} />
        </div>
      ) : !state ? (
        <div className="rounded-3xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-12 text-center">
          <div className="mx-auto w-12 h-12 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center mb-3">
            <TrendingUp className="text-gray-400" size={24} />
          </div>
          <h3 className="text-gray-900 font-semibold">No analysis data</h3>
          <p className="text-gray-500 text-sm mt-1">Click "Analyze Competition" to get started.</p>
        </div>
      ) : status !== 'completed' ? (
        <div className="rounded-3xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-12 text-center">
          <div className="mx-auto w-12 h-12 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center mb-3">
            <Loader2 className="animate-spin text-gray-400" size={24} />
          </div>
          <h3 className="text-gray-900 font-semibold">Analysis in progress</h3>
          <p className="text-gray-500 text-sm mt-1">Status: {status}</p>
          {state.competitors?.length > 0 && (
            <p className="text-gray-500 text-sm mt-2">
              Found {state.competitors.length} competitor{state.competitors.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Comparison Table */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Performance Comparison</h2>
            <ComparisonTable state={state} />
          </section>

          {/* Charts */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Metrics Overview</h2>
            <MetricsCharts state={state} />
          </section>

          {/* AI Insights & Strategy */}
          <div className="grid md:grid-cols-2 gap-6">
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">AI Insights</h2>
              <AIInsightsPanel analysis={state.analysis_result} />
            </section>

            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Optimal Strategy</h2>
              <StrategyCard analysis={state.analysis_result} />
            </section>
          </div>
        </div>
      )}
    </main>
  )
}

export default CompetitorBenchmarkingPage

