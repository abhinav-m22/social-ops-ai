"use client";

import { MessageCircle, Calculator, Zap, GitBranch, Receipt, TrendingUp } from "lucide-react";
import { Marquee } from "@/components/ui/marquee";
import { cn } from "@/lib/utils";

interface Feature {
    icon: any;
    title: string;
    description: string;
    color: string;
}

const features: Feature[] = [
    {
        icon: MessageCircle,
        title: "Unified Inbox",
        description: "All brand inquiries from Instagram, Facebook, WhatsApp in one dashboard",
        color: "indigo"
    },
    {
        icon: Calculator,
        title: "AI Rate Calculator",
        description: "Market-based pricing suggestions based on your niche, engagement, and competitors",
        color: "cyan"
    },
    {
        icon: Zap,
        title: "Smart Auto-Reply",
        description: "AI-powered instant responses that sound like you, without risking bad deals",
        color: "amber"
    },
    {
        icon: GitBranch,
        title: "Deal Pipeline",
        description: "Visual workflow tracking from inquiry → negotiation → accepted → paid",
        color: "emerald"
    },
    {
        icon: Receipt,
        title: "Auto Invoicing",
        description: "GST-compliant invoices generated in one click with TDS calculations",
        color: "pink"
    },
    {
        icon: TrendingUp,
        title: "Competitor Intel",
        description: "See what similar creators in your niche charge for comparable campaigns",
        color: "violet"
    }
];

const colorMap: Record<string, string> = {
    indigo: "bg-indigo-100 text-indigo-600",
    cyan: "bg-cyan-100 text-cyan-600",
    amber: "bg-amber-100 text-amber-600",
    emerald: "bg-emerald-100 text-emerald-600",
    pink: "bg-pink-100 text-pink-600",
    violet: "bg-violet-100 text-violet-600"
};

function FeatureCard({ feature }: { feature: Feature }) {
    const Icon = feature.icon;

    return (
        <div className="w-80 mx-4">
            <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-6 hover:shadow-md transition-all duration-300">
                <div className="flex flex-col">
                    {/* Icon */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${colorMap[feature.color]}`}>
                        <Icon className="w-6 h-6" />
                    </div>

                    {/* Content */}
                    <h3 className="text-xl font-bold text-slate-900 mb-2">{feature.title}</h3>
                    <p className="text-slate-600 mb-4">{feature.description}</p>

                    {/* Learn more link */}
                    <button className="text-indigo-600 font-medium text-sm hover:text-indigo-700 transition-colors flex items-center gap-1">
                        Learn more
                        <span className="transition-transform group-hover:translate-x-1">→</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function Solutions() {
    return (
        <section className="py-20 bg-white overflow-hidden">
            <div className="container mx-auto px-6 max-w-7xl mb-16">
                {/* Section Header */}
                <div className="text-center space-y-4">
                    <div className="inline-block px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
                        The SocialOps Solution
                    </div>
                    <h2 className="text-4xl font-bold text-slate-900">
                        From Chaos to Control
                    </h2>
                    <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                        Everything you need to manage brand collaborations professionally — powered by AI
                    </p>
                </div>
            </div>

            {/* Marquee of Features */}
            <div className="relative">
                <Marquee pauseOnHover className="[--duration:40s]">
                    {features.map((feature, idx) => (
                        <FeatureCard key={idx} feature={feature} />
                    ))}
                </Marquee>
                <Marquee reverse pauseOnHover className="[--duration:40s] mt-6">
                    {features.map((feature, idx) => (
                        <FeatureCard key={idx} feature={feature} />
                    ))}
                </Marquee>

                {/* Gradient overlays */}
                <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-white"></div>
                <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-white"></div>
            </div>
        </section>
    );
}
