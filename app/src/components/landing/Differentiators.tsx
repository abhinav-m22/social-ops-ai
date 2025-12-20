"use client";

import { Globe } from "@/components/ui/globe";
import { Database, MapPin, Sparkles, Shield, Layers } from "lucide-react";

const differentiators = [
    {
        icon: Layers,
        title: "Motia-Native Architecture",
        description: "Durable workflows that never miss a payment. Your brand deals are tracked with enterprise-grade reliability.",
        color: "indigo"
    },
    {
        icon: MapPin,
        title: "India-First Platform",
        description: "GST/TDS compliance built-in. Indian market rates, Rupee-based pricing, designed for the Indian creator economy.",
        color: "amber"
    },
    {
        icon: Sparkles,
        title: "AI-Powered Intelligence",
        description: "Claude-powered rate recommendations, not generic automation. Real market intelligence from actual creator data.",
        color: "cyan"
    },
    {
        icon: Database,
        title: "Multi-Platform Unified",
        description: "Instagram + Facebook + WhatsApp + Email — all brand messages in one unified dashboard.",
        color: "emerald"
    },
    {
        icon: Shield,
        title: "Privacy-First Design",
        description: "Your data, your control. No brand lock-in. Export everything anytime. You own your relationships.",
        color: "pink"
    }
];

const colorMap: Record<string, string> = {
    indigo: "bg-indigo-100 text-indigo-600",
    amber: "bg-amber-100 text-amber-600",
    cyan: "bg-cyan-100 text-cyan-600",
    emerald: "bg-emerald-100 text-emerald-600",
    pink: "bg-pink-100 text-pink-600"
};

export default function Differentiators() {
    return (
        <section className="py-20 bg-white">
            <div className="container mx-auto px-6 max-w-7xl">
                {/* Section Header */}
                <div className="text-center mb-16 space-y-4">
                    <div className="inline-block px-4 py-2 bg-cyan-100 text-cyan-700 rounded-full text-sm font-medium">
                        What Makes Us Different
                    </div>
                    <h2 className="text-4xl font-bold text-slate-900">
                        Built Different. Built for India.
                    </h2>
                    <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                        Not just another SaaS tool — a platform designed specifically for Indian creators
                    </p>
                </div>

                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    {/* Globe Visualization */}
                    <div className="relative">
                        <div className="relative h-[500px] flex items-center justify-center bg-slate-50 rounded-xl border border-slate-200 shadow-sm">
                            <Globe className="top-0" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-center">
                                    <div className="text-6xl font-bold mb-2">🇮🇳</div>
                                    <p className="text-sm text-slate-600 font-medium">Built for India</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Differentiators List */}
                    <div className="space-y-4">
                        {differentiators.map((item, idx) => (
                            <div
                                key={idx}
                                className="bg-white border border-slate-200 shadow-sm rounded-xl p-6 hover:shadow-md transition-all duration-300"
                            >
                                <div className="flex gap-4">
                                    <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${colorMap[item.color]}`}>
                                        <item.icon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900 mb-2">{item.title}</h3>
                                        <p className="text-slate-600">{item.description}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bottom Stat */}
                <div className="text-center mt-16">
                    <div className="inline-block px-8 py-4 bg-white border border-slate-200 shadow-sm rounded-xl">
                        <p className="text-xl font-bold text-slate-900">
                            The <span className="text-cyan-600">only</span> platform built specifically for{" "}
                            <span className="text-amber-600">Indian creator-brand collaborations</span>
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
