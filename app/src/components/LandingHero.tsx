import Link from "next/link"
import { Sparkles, ShieldCheck, BellRing, Gauge } from "lucide-react"

export const LandingHero = () => {
  const features = [
    {
      title: "Smart confidence scoring",
      desc: "Understands fit, budget, red flags, and tone instantly.",
      icon: <ShieldCheck className="text-emerald-300" size={20} />,
    },
    {
      title: "Auto replies that feel human",
      desc: "High-confidence deals get friendly acknowledgments in seconds.",
      icon: <Sparkles className="text-amber-300" size={20} />,
    },
    {
      title: "Live notification center",
      desc: "See new inquiries, replies, contracts, and payments in real time.",
      icon: <BellRing className="text-sky-300" size={20} />,
    },
    {
      title: "Creator-first dashboard",
      desc: "Glassmorphism cards, modals, and timelines built for speed.",
      icon: <Gauge className="text-indigo-300" size={20} />,
    },
  ]

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-10 shadow-2xl shadow-black/40">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.15),transparent_25%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.15),transparent_25%),radial-gradient(circle_at_50%_80%,rgba(236,72,153,0.12),transparent_25%)]"></div>
      <div className="relative grid lg:grid-cols-2 gap-10 items-center">
        <div className="space-y-6">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-emerald-200 uppercase tracking-wide">
            Social Ops · AI
          </span>
          <h1 className="text-4xl lg:text-5xl font-black text-white leading-tight">
            Deals Dashboard that replies for you and keeps you in control.
          </h1>
          <p className="text-lg text-slate-300">
            Score new inquiries, auto-acknowledge the best fits, and manage timelines, signatures, and deliverables in a
            premium glass UI built for creators.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/dashboard"
              className="px-5 py-3 rounded-2xl bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-500/40 hover:-translate-y-0.5 transition"
            >
              Launch Deals Dashboard
            </Link>
            <a
              href="#features"
              className="px-5 py-3 rounded-2xl border border-white/15 text-white font-semibold bg-white/5 hover:bg-white/10 transition"
            >
              See how it works
            </a>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm text-slate-200">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
              <div className="text-2xl font-bold text-white">Auto replies</div>
              <div className="text-slate-400">Sent instantly for high-confidence deals</div>
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
              <div className="text-2xl font-bold text-white">Confidence 0-100</div>
              <div className="text-slate-400">High/Medium/Low badges with reasons</div>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-6 bg-gradient-to-br from-emerald-500/20 via-sky-500/10 to-transparent blur-3xl"></div>
          <div className="relative rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-emerald-500/30">
            <div className="flex items-center justify-between">
              <div className="text-white font-semibold">New Inquiry</div>
              <span className="text-xs text-emerald-200 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full">
                High Confidence
              </span>
            </div>
            <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm text-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-semibold">Aura Electronics</div>
                  <div className="text-slate-400">Instagram reels + YouTube short</div>
                </div>
                <div className="text-lg font-bold text-white">₹25,000</div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-100 text-xs">
                  Interests match: Tech
                </span>
                <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-100 text-xs">
                  Budget OK
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {["Send Smart Reply", "Edit & Reply", "Decline"].map((action, idx) => (
                  <div
                    key={action}
                    className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-center text-xs text-white"
                  >
                    {idx === 0 ? "✅" : idx === 1 ? "✏️" : "❌"} {action}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

