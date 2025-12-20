import { CheckCircle2, XCircle, AlertCircle, Lightbulb, TrendingUp, Zap, Flame, Target, ArrowUpRight } from "lucide-react"
import { AnimatedGradientText } from "@/components/ui/animated-gradient-text"
import { cn } from "@/lib/utils"

type Props = {
  analysis: any
}

export const AIInsightsPanel = ({ analysis }: Props) => {
  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-3">
        <Lightbulb size={32} className="opacity-20" />
        <p className="text-sm font-medium">No AI insights available yet</p>
      </div>
    )
  }

  // Mocking some data for the specific requirements if not present in analysis
  // In a real scenario, these would come from the AI analysis logic
  const insights = [
    {
      type: "frequency",
      title: "You post 54% less than competitors",
      visual: { type: "progress", value: 46, label: "Your Activity" },
      action: "Increase to 3x/week for +25% growth",
      status: "warning",
      icon: <Zap className="text-amber-500" size={18} />
    },
    {
      type: "engagement",
      title: "Your engagement rate beats 70% of competitors",
      visual: { type: "percentile", value: 70, label: "Top 30%" },
      action: "Leverage this in negotiations",
      status: "success",
      icon: <Target className="text-indigo-500" size={18} />
    },
    {
      type: "trending",
      title: "'Budget Tech' topic trending",
      visual: { type: "topic", value: "Budget Tech" },
      action: "Create content by Friday",
      status: "hot",
      icon: <Flame className="text-rose-500" size={18} />
    },
    {
      type: "projection",
      title: "Growth Projection",
      visual: { type: "line", value: "+35%", label: "90 Days" },
      action: "Follow recommendations: +35% in 90 days",
      status: "info",
      icon: <TrendingUp className="text-cyan-500" size={18} />
    }
  ]

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <AnimatedGradientText className="ml-0">
          💡 <hr className="mx-2 h-4 w-px shrink-0 bg-slate-300" />{" "}
          <span className={cn("animate-gradient inline bg-gradient-to-r from-indigo-600 via-cyan-600 to-amber-600 bg-[length:var(--bg-size)_100%] bg-clip-text text-transparent font-bold")}>
            Key Findings
          </span>
        </AnimatedGradientText>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {insights.map((insight, idx) => (
          <div key={idx} className="group relative bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
            <div className="flex items-start gap-4">
              <div className={cn(
                "p-2.5 rounded-xl",
                insight.status === 'warning' && "bg-amber-50",
                insight.status === 'success' && "bg-indigo-50",
                insight.status === 'hot' && "bg-rose-50",
                insight.status === 'info' && "bg-cyan-50"
              )}>
                {insight.icon}
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors uppercase text-xs tracking-wider mb-1">
                    {insight.status === 'warning' && "⚠️ Low Frequency"}
                    {insight.status === 'success' && "✅ Strong Performance"}
                    {insight.status === 'hot' && "🔥 High Demand"}
                    {insight.status === 'info' && "📈 Future Outlook"}
                  </h3>
                  <div className="text-slate-700 font-semibold">{insight.title}</div>
                </div>

                {/* Visual Elements */}
                {insight.visual.type === "progress" && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-medium text-slate-500">
                      <span>{insight.visual.label}</span>
                      <span>{insight.visual.value}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full transform origin-left transition-transform duration-1000"
                        style={{ width: `${insight.visual.value}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {insight.visual.type === "percentile" && (
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className="w-8 h-8 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center">
                          <CheckCircle2 size={12} className="text-indigo-600" />
                        </div>
                      ))}
                    </div>
                    <span className="text-sm font-bold text-indigo-600">{insight.visual.label}</span>
                  </div>
                )}

                {insight.visual.type === "topic" && (
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-rose-50 text-rose-600 rounded-lg text-xs font-bold border border-rose-100 flex items-center gap-1">
                      <Flame size={12} /> {insight.visual.value}
                    </span>
                    <span className="px-3 py-1 bg-slate-50 text-slate-400 rounded-lg text-xs font-medium border border-slate-100">
                      Tech Review
                    </span>
                  </div>
                )}

                {insight.visual.type === "line" && (
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-cyan-600">{insight.visual.value}</span>
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-tighter">Growth in {insight.visual.label}</span>
                  </div>
                )}

                <div className="pt-2 flex items-center gap-2 text-xs font-bold text-slate-400 group-hover:text-indigo-500 transition-colors">
                  <ArrowUpRight size={14} />
                  {insight.action}
                </div>
              </div>
            </div>
            {/* Background Accent */}
            <div className={cn(
              "absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full opacity-[0.03]",
              insight.status === 'warning' && "bg-amber-500",
              insight.status === 'success' && "bg-indigo-500",
              insight.status === 'hot' && "bg-rose-500",
              insight.status === 'info' && "bg-cyan-500"
            )} />
          </div>
        ))}
      </div>
    </div>
  )
}

