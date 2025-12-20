"use client"

import { useCallback, useEffect, useState } from "react"
import { triggerCompetitorAnalysis, getCompetitorBenchmarking } from "@/lib/api"
import { Loader2, TrendingUp, Download, CheckCircle2, XCircle, AlertCircle, Users } from "lucide-react"
import toast from "react-hot-toast"
import { ComparisonTable } from "@/components/competitor-benchmarking/ComparisonTable"
import { MetricsCharts } from "@/components/competitor-benchmarking/MetricsCharts"
import { AIInsightsPanel } from "@/components/competitor-benchmarking/AIInsightsPanel"
import { StrategyCard } from "@/components/competitor-benchmarking/StrategyCard"
import { PlatformTabs } from "@/components/competitor-benchmarking/PlatformTabs"
import { PlatformCompetitorProfiles } from "@/components/competitor-benchmarking/PlatformCompetitorProfiles"
import { PlatformContentList } from "@/components/competitor-benchmarking/PlatformContentList"
import { PlatformMetricsSummary } from "@/components/competitor-benchmarking/PlatformMetricsSummary"
import { PlatformAIInsights } from "@/components/competitor-benchmarking/PlatformAIInsights"
import { exportToPDF } from "@/lib/competitor-benchmarking/pdfExport"
import { ShimmerButton } from "@/components/ui/shimmer-button"
import { AnimatedGradientText } from "@/components/ui/animated-gradient-text"
import { AppLayout } from "@/components/AppLayout"
import { cn } from "@/lib/utils"

const CREATOR_ID = "default-creator"

type BenchmarkingStatus = 'idle' | 'running' | 'completed' | 'failed'
type Platform = 'youtube' | 'instagram' | 'facebook'

const CompetitorBenchmarkingPage = () => {
  const [state, setState] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [status, setStatus] = useState<BenchmarkingStatus>('idle')
  const [activePlatform, setActivePlatform] = useState<Platform>('youtube')

  const fetchState = useCallback(async () => {
    try {
      const data = await getCompetitorBenchmarking(CREATOR_ID)
      console.log('Fetched benchmarking data:', data)
      if (data.success && data.state) {
        console.log('YouTube profiles:', data.state.profiles?.filter((p: any) => p.platform === 'youtube'))
        console.log('YouTube content:', data.state.content?.filter((c: any) => c.platform === 'youtube'))
        console.log('YouTube insights:', data.state.platform_insights?.youtube)
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
    <AppLayout>
      <header className="relative flex items-center justify-between flex-wrap gap-8 mb-12 py-8 border-b border-slate-100">
        <div className="space-y-4">
          <AnimatedGradientText className="w-fit ml-0">
            🚀 <hr className="mx-2 h-4 w-[1px] shrink-0 bg-slate-300" />{" "}
            <span className={cn("animate-gradient inline bg-gradient-to-r from-indigo-600 via-cyan-600 to-amber-600 bg-[length:var(--bg-size)_100%] bg-clip-text text-transparent")}>
              Competitor Intelligence
            </span>
          </AnimatedGradientText>

          <div>
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
              See how you{" "}
              <span className="bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent">
                stack up
              </span>
            </h1>
            <p className="text-slate-500 mt-2 text-lg max-w-2xl">
              Real-time benchmarking against similar creators. Leverage AI to find your competitive edge.
            </p>
          </div>

          {(status === 'completed' || status === 'running') && (
            <div className="flex items-center gap-2 text-sm font-medium text-slate-500 bg-slate-50 w-fit px-3 py-1.5 rounded-full border border-slate-100">
              <span className="relative flex h-2 w-2">
                <span className={cn(
                  "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                  status === 'running' ? "bg-amber-400" : "bg-indigo-400"
                )}></span>
                <span className={cn(
                  "relative inline-flex rounded-full h-2 w-2",
                  status === 'running' ? "bg-amber-500" : "bg-indigo-500"
                )}></span>
              </span>
              Last updated: {state?.last_run_at ? new Date(state.last_run_at).toLocaleTimeString() : 'Never'}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          {state?.status === 'completed' && (
            <button
              onClick={handleExport}
              className="group inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white text-slate-700 px-6 py-3 text-sm font-semibold shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95"
            >
              <Download size={18} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
              Export Report
            </button>
          )}

          <ShimmerButton
            onClick={() => handleAnalyze(status === 'running')}
            disabled={analyzing || (status === 'running' && !state)}
            className="shadow-xl"
          >
            <span className="whitespace-pre-wrap text-center text-sm font-bold leading-none tracking-tight text-white lg:text-base flex items-center gap-2">
              {analyzing ? (
                <>
                  <Loader2 className="animate-spin" size={18} /> Starting...
                </>
              ) : status === 'running' ? (
                <>
                  <Loader2 className="animate-spin" size={18} /> Refresh Analysis
                </>
              ) : (
                <>
                  <TrendingUp size={18} /> Analyze Competition
                </>
              )}
            </span>
          </ShimmerButton>
        </div>
      </header>

      {/* Status Banner */}
      {status === 'running' && (
        <div className="mb-12 group relative rounded-[2rem] border border-blue-100 bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/30 p-8 shadow-sm overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-8">
            <div className="flex items-center gap-4 flex-1">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center relative">
                <Loader2 className="animate-spin text-blue-600" size={28} />
                <div className="absolute inset-x-0 bottom-0 h-1 bg-blue-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 w-1/2 animate-shimmer"></div>
                </div>
              </div>
              <div>
                <div className="text-xl font-black text-blue-900 tracking-tight">{getStatusMessage()}</div>
                <div className="text-blue-500 font-medium mt-1">Sourcing real-time metrics and applying AI models...</div>
              </div>
            </div>

            {state?.platform_status && (
              <div className="flex flex-wrap gap-4">
                {(['youtube', 'instagram', 'facebook'] as const).map((platform) => {
                  const platformStatus = state.platform_status[platform]
                  const isRunning = platformStatus === 'running'
                  const isCompleted = platformStatus === 'completed'
                  const isFailed = platformStatus === 'failed'

                  return (
                    <div key={platform} className={cn(
                      "flex items-center gap-3 px-4 py-2 rounded-2xl border transition-all",
                      isRunning ? "bg-white border-blue-200 text-blue-600 shadow-sm" :
                        isCompleted ? "bg-emerald-50 border-emerald-100 text-emerald-700" :
                          isFailed ? "bg-rose-50 border-rose-100 text-rose-700" :
                            "bg-slate-50 border-slate-100 text-slate-400"
                    )}>
                      {isRunning && <Loader2 className="animate-spin" size={16} />}
                      {isCompleted && <CheckCircle2 size={16} />}
                      {isFailed && <XCircle size={16} />}
                      {!isRunning && !isCompleted && !isFailed && <div className="w-2 h-2 rounded-full bg-slate-300" />}
                      <span className="capitalize text-sm font-bold tracking-tight">
                        {platform}: <span className="opacity-70">{platformStatus || 'queued'}</span>
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
        </div>
      )}

      {status === 'completed' && state && (
        <div className="mb-12 rounded-[2rem] border border-emerald-100 bg-emerald-50/30 p-6 flex flex-col md:flex-row items-center gap-6 group hover:border-emerald-200 transition-colors">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
            <CheckCircle2 size={24} />
          </div>
          <div className="flex-1 text-center md:text-left">
            <div className="text-lg font-black text-emerald-900 tracking-tight">Analysis Synchronized</div>
            <div className="text-emerald-600 font-medium">
              Data is fresh and AI insights are updated based on the latest activity.
            </div>
          </div>
        </div>
      )}

      {status === 'failed' && (
        <div className="mb-12 rounded-[2rem] border border-rose-100 bg-rose-50/30 p-8 flex flex-col md:flex-row items-center gap-6">
          <div className="w-14 h-14 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600">
            <XCircle size={32} />
          </div>
          <div className="flex-1">
            <div className="text-xl font-black text-rose-900">Analysis Halted</div>
            <div className="text-rose-600 font-medium mt-1">We encountered an issue while fetching some platform data. Please try again.</div>
          </div>
          <button
            onClick={() => handleAnalyze()}
            className="px-6 py-3 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-colors shadow-lg shadow-rose-600/20"
          >
            Retry Analysis
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-6">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-slate-100 animate-pulse"></div>
            <Loader2 className="absolute inset-0 animate-spin text-indigo-600 m-auto" size={32} />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-lg font-bold text-slate-900">Gathering Intelligence...</h3>
            <p className="text-slate-500 text-sm max-w-xs mx-auto">Connecting to social APIs and analyzing competitor performance.</p>
          </div>
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-indigo-600/20 animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-3 h-3 rounded-full bg-indigo-600/40 animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-3 h-3 rounded-full bg-indigo-600/60 animate-bounce"></div>
          </div>
        </div>
      ) : !state ? (
        <div className="rounded-[2.5rem] border-2 border-dashed border-slate-200 bg-slate-50/50 p-20 text-center">
          <div className="mx-auto w-20 h-20 bg-white rounded-3xl shadow-xl border border-slate-100 flex items-center justify-center mb-8 group hover:scale-110 transition-transform duration-500">
            <TrendingUp className="text-slate-400 group-hover:text-indigo-600 transition-colors" size={32} />
          </div>
          <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">No Benchmarking Data Found</h3>
          <p className="text-slate-500 text-lg max-w-md mx-auto mb-10">
            Connect your social accounts and start your first analysis to see how you stack up against the competition.
          </p>
          <ShimmerButton
            onClick={() => handleAnalyze()}
            className="shadow-2xl mx-auto"
          >
            <span className="whitespace-pre-wrap text-center text-base font-bold leading-none tracking-tight text-white lg:text-lg flex items-center gap-2">
              <TrendingUp size={20} /> Start First Analysis
            </span>
          </ShimmerButton>
        </div>
      ) : status !== 'completed' ? (
        <div className="rounded-[2.5rem] border-2 border-dashed border-slate-200 bg-white p-20 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/30 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-50/30 rounded-full -ml-32 -mb-32 blur-3xl animate-pulse"></div>

          <div className="relative z-10">
            <div className="mx-auto w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mb-8 relative">
              <Loader2 className="animate-spin text-indigo-600" size={40} />
              <div className="absolute inset-0 bg-indigo-600/10 rounded-3xl animate-ping opacity-20"></div>
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">Analyzing Competitors...</h3>
            <p className="text-slate-500 text-lg max-w-md mx-auto mb-6">
              Status: <span className="text-indigo-600 font-bold capitalize">{status}</span>
            </p>
            {state.competitors?.length > 0 && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-full border border-slate-100 text-slate-600 font-bold text-sm">
                <Users size={16} className="text-indigo-500" />
                Found {state.competitors.length} competitor{state.competitors.length !== 1 ? 's' : ''}
              </div>
            )}

            <div className="mt-12 max-w-lg mx-auto grid grid-cols-1 gap-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-4 bg-slate-50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-100 via-indigo-200 to-indigo-100 w-1/2 animate-[shimmer_2s_infinite]"
                    style={{ animation: `shimmer 2s ease-in-out infinite ${i * 0.5}s` }}
                  ></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Platform Tabs */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <PlatformTabs
              activePlatform={activePlatform}
              onPlatformChange={setActivePlatform}
              platformStatus={state.platform_status}
            />
          </div>

          {/* Platform-Specific Content */}
          <>
            {/* Platform Status Warning */}
            {state.platform_status?.[activePlatform] === 'failed' && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-center gap-3">
                <AlertCircle className="text-amber-600" size={20} />
                <div className="flex-1">
                  <div className="font-semibold text-amber-900">Platform data incomplete</div>
                  <div className="text-sm text-amber-700 mt-0.5">
                    {activePlatform} data collection failed. Showing partial data if available.
                  </div>
                </div>
              </div>
            )}

            {state.platform_status?.[activePlatform] === 'running' && (
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 flex items-center gap-3">
                <Loader2 className="animate-spin text-blue-600" size={20} />
                <div className="flex-1">
                  <div className="font-semibold text-blue-900">Collecting {activePlatform} data...</div>
                  <div className="text-sm text-blue-700 mt-0.5">This may take a few minutes.</div>
                </div>
              </div>
            )}

            {/* Competitor Profiles */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Competitor Profiles</h2>
              <PlatformCompetitorProfiles
                platform={activePlatform}
                profiles={state.profiles || []}
              />
            </section>

            {/* Metrics Summary */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Metrics Summary</h2>
              <PlatformMetricsSummary
                platform={activePlatform}
                profiles={state.profiles || []}
                content={state.content || []}
                aiInsights={state.platform_insights?.[activePlatform]}
              />
            </section>

            {/* Content List */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Content</h2>
              <PlatformContentList
                platform={activePlatform}
                content={state.content || []}
                profiles={state.profiles || []}
              />
            </section>

            {/* Platform AI Insights */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">AI Insights</h2>
              <PlatformAIInsights
                platform={activePlatform}
                insights={state.platform_insights?.[activePlatform]}
              />
            </section>
          </>
        </div>
      )}
    </AppLayout>
  )
}

export default CompetitorBenchmarkingPage

