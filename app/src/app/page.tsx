import { LandingHero } from "@/components/LandingHero"
import { Sparkles, ShieldCheck, BellRing } from "lucide-react"
import Link from "next/link"

export default function Home() {
  return (
    <main className="min-h-screen px-6 py-12 lg:py-16 lg:px-12 space-y-10">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-sky-500 flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-500/40">
            CO
          </div>
          <div>
            <div className="text-white font-semibold">Creator Ops · Deals</div>
            <div className="text-xs text-slate-400">AI that respects your brand</div>
          </div>
        </div>
        <Link
          href="/dashboard"
          className="px-4 py-2.5 rounded-full bg-white text-slate-900 font-semibold shadow-lg hover:-translate-y-0.5 transition"
        >
          Open Dashboard
        </Link>
      </header>

      <LandingHero />

      <section id="features" className="grid lg:grid-cols-3 gap-6">
        {[
          {
            title: "Deals Dashboard",
            desc: "Glass cards for new, active, and completed deals with hover flows, modals, and filters.",
            icon: <Sparkles size={18} />,
          },
          {
            title: "Confidence scoring + auto-replies",
            desc: "High-confidence deals auto-acknowledge with friendly replies; medium/low wait for you.",
            icon: <ShieldCheck size={18} />,
          },
          {
            title: "Live notifications",
            desc: "Bell center with last 10 events and toast stream for new inquiries and signatures.",
            icon: <BellRing size={18} />,
          },
        ].map(item => (
          <div
            key={item.title}
            className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/30 space-y-2"
          >
            <div className="flex items-center gap-2 text-emerald-200">{item.icon} {item.title}</div>
            <p className="text-slate-200">{item.desc}</p>
          </div>
        ))}
      </section>
    </main>
  )
}
