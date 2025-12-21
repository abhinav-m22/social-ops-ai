"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Sparkles, TrendingUp, RefreshCw, Layers, Zap, BrainCircuit, Globe, Activity } from "lucide-react"
import { BentoGrid, BentoCard } from "@/components/ui/bento-grid"
import { Button } from "@/components/ui/button"
import { triggerTrendScout, getTrendScoutState } from "@/lib/api/trend-scout"
import { TrendAnalysis, TrendScoutState } from "@/types/trend-scout"
import { SparklesText } from "@/components/ui/sparkles-text"
import { cn } from "@/lib/utils"

// Magic Card Component (Simplified Version for this page)
function MagicCard({ children, className, gradientColor = "#262626" }: { children: React.ReactNode, className?: string, gradientColor?: string }) {
    return (
        <div className={cn("relative flex h-full w-full flex-col overflow-hidden rounded-xl border bg-white p-6 shadow-sm dark:bg-black", className)}>
            <div className="pointer-events-none absolute -inset-px opacity-0 transition duration-300 group-hover:opacity-100"
                style={{ background: `radial-gradient(600px circle at 0px 0px, ${gradientColor}, transparent 40%)` }} />
            <div className="relative z-10 flex h-full flex-col">{children}</div>
        </div>
    )
}

export default function TrendScoutPage() {
    const creatorId = "demo-user" // Hardcoded for this implementation
    const [loading, setLoading] = useState(false)
    const [state, setState] = useState<TrendScoutState | null>(null)

    // Fetch state from API
    const fetchState = useCallback(async () => {
        try {
            const data = await getTrendScoutState(creatorId)
            if (data) {
                setState(data)
            }
        } catch (error) {
            console.error('Failed to fetch TrendScout state', error)
        }
    }, [creatorId])
    
    // Initial fetch
    useEffect(() => {
        fetchState()
    }, [fetchState])
    
    // Poll when analysis is running
    useEffect(() => {
        let interval: NodeJS.Timeout | null = null
        
        if (state?.status === 'running') {
            // Poll every 2 seconds when running
            interval = setInterval(() => {
                fetchState()
            }, 2000)
        }
        
        return () => {
            if (interval) clearInterval(interval)
        }
    }, [state?.status, fetchState])

    const handleRunAnalysis = async () => {
        try {
            setLoading(true)
            await triggerTrendScout(creatorId, "Tech")
            // Immediately fetch state to show it's running
            await fetchState()
            setLoading(false)
        } catch (error) {
            console.error("Failed to trigger analysis", error)
            setLoading(false)
        }
    }

    // Transform aggregatedTrends from old format (Trends/Content Ideas) to expected format (ranked_trends/daily_action_plan)
    const transformAggregatedTrends = useCallback((aggregatedTrends: any): TrendAnalysis | null => {
        if (!aggregatedTrends) return null

        // If it already has the expected format, return as is
        if (aggregatedTrends.daily_action_plan && aggregatedTrends.ranked_trends) {
            return aggregatedTrends as TrendAnalysis
        }

        // Transform from old format (Trends/Content Ideas)
        if (aggregatedTrends.Trends || aggregatedTrends['Content Ideas']) {
            const trendsArray = aggregatedTrends.Trends || []
            const contentIdeasArray = aggregatedTrends['Content Ideas'] || []
            
            // Get top trend for generating action plan
            const topTrend = trendsArray[0]?.Trend || trendsArray[0]?.Topic || trendsArray[0]?.topic || 'AI Innovation'
            
            // Find platform-specific content ideas
            const youtubeIdea = contentIdeasArray.find((ci: any) => 
                ci.Format?.toLowerCase().includes('video') || 
                ci.format?.toLowerCase().includes('video') ||
                ci.Format?.toLowerCase().includes('long-form')
            )
            const instagramIdea = contentIdeasArray.find((ci: any) => 
                ci.Format?.toLowerCase().includes('reel') || 
                ci.format?.toLowerCase().includes('reel') ||
                ci.Format?.toLowerCase().includes('short-form')
            )
            const twitterIdea = contentIdeasArray.find((ci: any) => 
                ci.Format?.toLowerCase().includes('thread') || 
                ci.format?.toLowerCase().includes('thread') ||
                ci.Format?.toLowerCase().includes('post')
            )
            const facebookIdea = contentIdeasArray.find((ci: any) => 
                ci.Format?.toLowerCase().includes('post') || 
                ci.format?.toLowerCase().includes('post') ||
                ci.Platform === 'Facebook' || ci.platform === 'facebook'
            )

            // Transform to ranked_trends format
            const ranked_trends = trendsArray.slice(0, 3).map((t: any, idx: number) => {
                const trendName = t.Trend || t.Topic || t.topic || 'Unknown Trend'
                const relatedIdeas = contentIdeasArray.filter((ci: any) => {
                    const ciTrend = ci.Trend || ci.trend || ci.Topic || ci.topic
                    return ciTrend === trendName || ciTrend?.includes(trendName) || trendName?.includes(ciTrend)
                })

                return {
                    topic: trendName,
                    category: (t.Category || t.category || (idx === 0 ? 'HOT' : idx === 1 ? 'RISING' : 'EMERGING')) as 'HOT' | 'RISING' | 'EMERGING',
                    reasoning: `Trend with score ${t.Score || t.velocityScore || 0}`,
                    content_ideas: relatedIdeas.slice(0, 5).map((ci: any) => ({
                        title: ci.Title || ci.title || 'Content Idea',
                        angle: ci.Angle || ci.angle || 'Engaging angle',
                        format: ci.Format || ci.format || 'Video',
                        hooks: Array.isArray(ci.Hooks) ? ci.Hooks : (Array.isArray(ci.hooks) ? ci.hooks : ['Hook 1', 'Hook 2']),
                        thumbnail_concept: ci['Thumbnail Concept'] || ci.thumbnail_concept || 'Visual concept',
                        estimated_views: ci['Estimated Views']?.toString() || ci.estimated_views?.toString() || '10K-50K',
                        difficulty: (ci.Difficulty || ci.difficulty || 'Medium') as 'Easy' | 'Medium' | 'Hard'
                    }))
                }
            })

            // Generate daily_action_plan
            const daily_action_plan = {
                youtube: youtubeIdea?.Title || youtubeIdea?.title || 
                        `Create a 12-minute deep dive on "${topTrend}" with hands-on examples. Post between 2-4 PM for max reach.`,
                instagram: instagramIdea?.Title || instagramIdea?.title ||
                          `Film a 45-second Reel showcasing "${topTrend}" with trending audio. Post at 11 AM or 7 PM.`,
                twitter: twitterIdea?.Title || twitterIdea?.title ||
                        `Write a 7-tweet thread breaking down "${topTrend}" with code snippets. Pin the thread.`,
                facebook: facebookIdea?.Title || facebookIdea?.title ||
                         `Post an update about "${topTrend}" in relevant Tech groups. Engage in discussions.`,
                global_momentum: `Tech creators are rushing to adopt ${topTrend} as velocity spikes - the window for first-mover advantage is closing fast.`
            }

            return {
                ranked_trends,
                daily_action_plan
            } as TrendAnalysis
        }

        return null
    }, [])

    // Get all content ideas (for display)
    const getAllContentIdeas = useCallback(() => {
        if (!state?.aggregatedTrends) return []
        
        const aggregatedTrends = state.aggregatedTrends as any
        const contentIdeasArray = aggregatedTrends['Content Ideas'] || aggregatedTrends.content_ideas || []
        
        return contentIdeasArray.map((ci: any) => ({
            title: ci.Title || ci.title || 'Content Idea',
            angle: ci.Angle || ci.angle || '',
            format: ci.Format || ci.format || '',
            hooks: Array.isArray(ci.Hooks) ? ci.Hooks : (Array.isArray(ci.hooks) ? ci.hooks : []),
            thumbnail_concept: ci['Thumbnail Concept'] || ci.thumbnail_concept || '',
            estimated_views: ci['Estimated Views']?.toString() || ci.estimated_views?.toString() || '',
            difficulty: ci.Difficulty || ci.difficulty || '',
            trend: ci.Trend || ci.trend || ''
        }))
    }, [state?.aggregatedTrends])

    // Get all content ideas for a specific platform
    const getPlatformContentIdeas = useCallback((platform: string) => {
        if (!state?.aggregatedTrends) return []
        
        const aggregatedTrends = state.aggregatedTrends as any
        const contentIdeasArray = aggregatedTrends['Content Ideas'] || aggregatedTrends.content_ideas || []
        
        // Map platform names to format keywords (more flexible matching)
        const platformFormats: Record<string, string[]> = {
            'YouTube': ['video', 'long-form', 'longform', 'youtube', 'long'],
            'Instagram': ['reel', 'short-form', 'shortform', 'instagram', 'short'],
            'Twitter': ['thread', 'twitter', 'tweet', 'x.com'],
            'Facebook': ['post', 'facebook', 'fb']
        }
        
        const formats = platformFormats[platform] || []
        
        // Filter content ideas that match the platform (more flexible)
        return contentIdeasArray.filter((ci: any) => {
            const format = (ci.Format || ci.format || '').toLowerCase()
            const platformName = (ci.Platform || ci.platform || '').toLowerCase()
            const title = (ci.Title || ci.title || '').toLowerCase()
            
            // Check if format matches any keyword
            const formatMatch = formats.some(f => 
                format.includes(f.toLowerCase()) || 
                format === f.toLowerCase()
            )
            
            // Check if platform name matches
            const platformMatch = formats.some(f => 
                platformName.includes(f.toLowerCase())
            )
            
            return formatMatch || platformMatch
        }).map((ci: any) => ({
            title: ci.Title || ci.title || 'Content Idea',
            angle: ci.Angle || ci.angle || '',
            format: ci.Format || ci.format || '',
            hooks: Array.isArray(ci.Hooks) ? ci.Hooks : (Array.isArray(ci.hooks) ? ci.hooks : []),
            thumbnail_concept: ci['Thumbnail Concept'] || ci.thumbnail_concept || '',
            estimated_views: ci['Estimated Views']?.toString() || ci.estimated_views?.toString() || '',
            difficulty: ci.Difficulty || ci.difficulty || ''
        }))
    }, [state?.aggregatedTrends])

    // platform trend aggregation
    const getPlatformTrends = (platform: string) => {
        return state?.results?.find((r: any) => r.platform.toLowerCase() === platform.toLowerCase())?.trends || []
    }

    // Transform and use aggregatedTrends
    const aiAnalysis = useMemo(() => {
        if (!state?.aggregatedTrends) return undefined
        return transformAggregatedTrends(state.aggregatedTrends) || undefined
    }, [state?.aggregatedTrends, transformAggregatedTrends])

    return (
        <div className="min-h-screen bg-slate-50/50 p-8 pb-20 font-sans">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-1">
                        <SparklesText className="text-4xl font-bold tracking-tight text-slate-900">
                            TrendScout Intelligence
                        </SparklesText>
                        <p className="text-slate-500 max-w-xl">
                            Real-time cross-platform trend surveillance engine. Detects viral signals before they peak.
                        </p>
                    </div>

                    <Button
                        onClick={handleRunAnalysis}
                        disabled={loading || state?.status === 'running'}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200"
                        size="lg"
                    >
                        {state?.status === 'running' ? (
                            <>
                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                Scouting Trends...
                            </>
                        ) : (
                            <>
                                <Zap className="mr-2 h-4 w-4" />
                                Run New Analysis
                            </>
                        )}
                    </Button>
                </div>

                {/* Status Indicator */}
                {state?.status === 'running' && (
                    <div className="w-full bg-indigo-50 border border-indigo-100 rounded-lg p-4 flex items-center justify-between animate-pulse">
                        <div className="flex items-center gap-3">
                            <div className="h-2 w-2 rounded-full bg-indigo-600 animate-ping" />
                            <span className="text-sm font-medium text-indigo-700">
                                Active Workflow:
                                <span className="ml-2 text-indigo-500">
                                    {state.message || 'Processing...'}
                                </span>
                            </span>
                        </div>
                        <div className="flex gap-2">
                            {['youtube', 'googleTrends', 'twitter', 'facebook', 'instagram'].map(p => (
                                <div key={p} className={cn(
                                    "h-1.5 w-8 rounded-full transition-all duration-500",
                                    state.platforms?.[p as keyof typeof state.platforms] === 'completed'
                                        ? "bg-green-500"
                                        : "bg-slate-200"
                                )} />
                            ))}
                        </div>
                    </div>
                )}

                {/* 1. Hero & Action Plan */}
                {state?.results && state.results.length > 0 && (
                    <div className="space-y-10">
                        {/* Global Momentum Banner */}
                        <MagicCard className="bg-linear-to-r from-indigo-700 via-indigo-600 to-purple-700 text-white border-none shadow-xl">
                            <div className="flex flex-col md:flex-row justify-between items-center gap-6 p-4 md:p-6">
                                <div className="space-y-2 text-center md:text-left flex-1">
                                    <div className="flex items-center gap-2 justify-center md:justify-start">
                                        <div className="bg-white/20 p-1 rounded-full backdrop-blur-md">
                                            <Globe className="h-4 w-4 text-white" />
                                        </div>
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-100">Global Niche Sentiment</span>
                                    </div>
                                    <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight leading-tight">
                                        {aiAnalysis?.daily_action_plan?.global_momentum || "Synthesizing cross-platform signals into actionable intelligence..."}
                                    </h2>
                                </div>
                                <div className="flex items-center gap-4 bg-white/10 p-4 rounded-2xl backdrop-blur-lg border border-white/10 min-w-[180px] justify-center">
                                    <div className="text-center">
                                        <div className="text-[10px] font-bold text-indigo-200 uppercase tracking-tighter">Market Velocity</div>
                                        <div className="text-2xl font-black text-white">+840%</div>
                                    </div>
                                    <div className="h-8 w-px bg-white/20" />
                                    <Activity className="h-8 w-8 text-indigo-300 animate-pulse" />
                                </div>
                            </div>
                        </MagicCard>

                        {/* Today's Content Strategy */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    <Zap className="h-5 w-5 text-amber-500 fill-amber-500" />
                                    Today's Multi-Platform Post Plan
                                </h2>
                                <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest border border-indigo-100">Action Recommended</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {[
                                    { platform: 'YouTube', icon: <Activity className="h-4 w-4" />, color: 'bg-red-50 text-red-600', border: 'border-red-100' },
                                    { platform: 'Instagram', icon: <Layers className="h-4 w-4" />, color: 'bg-pink-50 text-pink-600', border: 'border-pink-100' },
                                    { platform: 'Twitter', icon: <Activity className="h-4 w-4" />, color: 'bg-sky-50 text-sky-600', border: 'border-sky-100' },
                                    { platform: 'Facebook', icon: <Layers className="h-4 w-4" />, color: 'bg-blue-50 text-blue-600', border: 'border-blue-100' },
                                ].map((item) => {
                                    const platformIdeas = getPlatformContentIdeas(item.platform)
                                    const fallbackPlan = aiAnalysis?.daily_action_plan?.[item.platform.toLowerCase() as keyof typeof aiAnalysis.daily_action_plan] || "Analyzing market signals for the perfect hook..."
                                    
                                    return (
                                        <MagicCard key={item.platform} className={cn("border-2 shadow-sm transition-transform hover:scale-[1.02]", item.border)}>
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className={cn("p-2 rounded-xl shadow-inner", item.color)}>
                                                    {item.icon}
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-black text-slate-900 text-sm">{item.platform}</h4>
                                                    {platformIdeas.length > 0 && (
                                                        <span className="text-[10px] text-slate-500 font-medium">
                                                            {platformIdeas.length} idea{platformIdeas.length !== 1 ? 's' : ''}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="min-h-[100px] flex flex-col gap-3">
                                                {platformIdeas.length > 0 ? (
                                                    <div className="space-y-3">
                                                        {platformIdeas.map((idea: any, idx: number) => (
                                                            <div key={idx} className="border-l-2 border-indigo-200 pl-3 py-1">
                                                                <p className="text-sm font-bold text-slate-800 leading-snug">
                                                                    {idea.title}
                                                                </p>
                                                                {idea.angle && (
                                                                    <p className="text-xs text-slate-600 mt-1">{idea.angle}</p>
                                                                )}
                                                                {idea.format && (
                                                                    <span className="inline-block mt-1 text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                                                                        {idea.format}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm font-bold text-slate-800 leading-snug">
                                                        {fallbackPlan}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="mt-6 pt-3 border-t border-slate-100 flex justify-between items-center">
                                                <div className="flex items-center gap-1.5 font-bold text-[9px] text-slate-400">
                                                    <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                                                    POST TODAY
                                                </div>
                                                {/* <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] font-bold text-indigo-600 hover:bg-indigo-50">
                                                    DRAFT →
                                                </Button> */}
                                            </div>
                                        </MagicCard>
                                    )
                                })}
                            </div>
                        </div>

                        {/* All Content Ideas Section */}
                        {(() => {
                            const allIdeas = getAllContentIdeas()
                            if (allIdeas.length === 0) return null
                            
                            return (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                            <BrainCircuit className="h-5 w-5 text-indigo-500" />
                                            All Content Ideas ({allIdeas.length})
                                        </h2>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {allIdeas.map((idea: any, idx: number) => (
                                            <MagicCard key={idx} className="border-slate-200">
                                                <div className="space-y-3">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <h4 className="text-sm font-bold text-slate-800 leading-tight flex-1">
                                                            {idea.title}
                                                        </h4>
                                                        {idea.format && (
                                                            <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                                                                {idea.format}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {idea.angle && (
                                                        <p className="text-xs text-slate-600">{idea.angle}</p>
                                                    )}
                                                    {idea.trend && (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] text-slate-400 uppercase">Trend:</span>
                                                            <span className="text-xs font-medium text-slate-700">{idea.trend}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-4 pt-2 border-t border-slate-100">
                                                        {idea.estimated_views && (
                                                            <div className="text-[10px] text-slate-500">
                                                                <span className="font-medium">{idea.estimated_views}</span> views
                                                            </div>
                                                        )}
                                                        {idea.difficulty && (
                                                            <div className="text-[10px] text-slate-500">
                                                                Difficulty: <span className="font-medium">{idea.difficulty}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {idea.hooks && idea.hooks.length > 0 && (
                                                        <div className="pt-2 border-t border-slate-100">
                                                            <p className="text-[10px] text-slate-400 uppercase mb-1">Hooks:</p>
                                                            <ul className="text-xs text-slate-600 space-y-1">
                                                                {idea.hooks.slice(0, 2).map((hook: string, hookIdx: number) => (
                                                                    <li key={hookIdx} className="flex items-start gap-1.5">
                                                                        <span className="text-indigo-500 mt-1">•</span>
                                                                        <span>{hook}</span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                            </MagicCard>
                                        ))}
                                    </div>
                                </div>
                            )
                        })()}

                        {/* 2. Topic Insights (Platform Grid) */}
                        <div className="space-y-4">
                            <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-indigo-400" />
                                Real-Time Topic Signals
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {['YouTube', 'Twitter', 'Facebook', 'Instagram'].map((platform) => (
                                    <MagicCard key={platform} className="h-auto border-slate-100">
                                        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-50">
                                            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-widest">{platform} Trends</h4>
                                            <Layers className="h-3.5 w-3.5 text-slate-400" />
                                        </div>
                                        <div className="space-y-4">
                                            {getPlatformTrends(platform).slice(0, 4).map((trend: any, i: number) => (
                                                <div key={i} className="text-sm border-l-2 border-indigo-100 pl-3 py-1 group/item">
                                                    <div className="font-bold text-slate-800 leading-tight group-hover/item:text-indigo-600 transition-colors">
                                                        {trend.topic}
                                                    </div>
                                                    <div className="text-[10px] font-bold text-slate-400 mt-1 flex justify-between uppercase tracking-wider">
                                                        <span>Score {trend.velocityScore}</span>
                                                        <span className="text-indigo-500">{trend.engagementSpike.split(' ')[0]} Gain</span>
                                                    </div>
                                                </div>
                                            ))}
                                            {getPlatformTrends(platform).length === 0 && (
                                                <div className="text-xs text-slate-400 italic py-2">Waiting for signals...</div>
                                            )}
                                        </div>
                                    </MagicCard>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {(!state || (!state.results?.length && state.status !== 'running')) && (
                    <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
                        <div className="h-16 w-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <TrendingUp className="h-8 w-8 text-indigo-500" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900">No Trend Analysis Found</h3>
                        <p className="text-slate-500 max-w-sm mx-auto mt-2 mb-6">
                            Run your first TrendScout analysis to discover viral opportunities across 5 platforms.
                        </p>
                        <Button onClick={handleRunAnalysis} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
                            Run Analysis Now
                        </Button>
                    </div>
                )}

            </div>
        </div >
    )
}
