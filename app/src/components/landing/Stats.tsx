"use client";

import { NumberTicker } from "@/components/ui/number-ticker";
import { Clock, TrendingUp, IndianRupee, CheckCircle } from "lucide-react";

const stats = [
    {
        icon: Clock,
        value: 30,
        suffix: "+",
        label: "Hours Saved",
        description: "Per month on admin work",
        color: "indigo"
    },
    {
        icon: TrendingUp,
        value: 40,
        suffix: "%",
        label: "Higher Rates",
        description: "On average vs. before",
        color: "cyan"
    },
    {
        icon: IndianRupee,
        value: 2.5,
        suffix: "L+",
        label: "Additional Income",
        description: "Annual average increase",
        color: "amber"
    },
    {
        icon: CheckCircle,
        value: 100,
        suffix: "%",
        label: "GST Compliance",
        description: "Automated invoicing",
        color: "emerald"
    }
];

const colorMap: Record<string, string> = {
    indigo: "bg-indigo-100 text-indigo-600",
    cyan: "bg-cyan-100 text-cyan-600",
    amber: "bg-amber-100 text-amber-600",
    emerald: "bg-emerald-100 text-emerald-600"
};

export default function Stats() {
    return (
        <section className="py-20 bg-slate-50">
            <div className="container mx-auto px-6 max-w-7xl">
                {/* Section Header */}
                <div className="text-center mb-16 space-y-4">
                    <div className="inline-block px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
                        Real Impact, Real Results
                    </div>
                    <h2 className="text-4xl font-bold text-slate-900">
                        The Numbers Don't Lie
                    </h2>
                    <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                        See how SocialOps AI transforms creator businesses
                    </p>
                </div>

                {/* Stats Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {stats.map((stat, idx) => (
                        <div
                            key={idx}
                            className="bg-white border border-slate-200 shadow-sm rounded-xl p-8 hover:shadow-md transition-all duration-300"
                        >
                            {/* Icon */}
                            <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 ${colorMap[stat.color]}`}>
                                <stat.icon className="w-7 h-7" />
                            </div>

                            {/* Animated Number */}
                            <div className="mb-2">

                                <span className="text-5xl font-bold text-slate-900">
                                    <NumberTicker value={stat.value} />
                                </span>
                                <span className="text-5xl font-bold text-slate-900">{stat.suffix}</span>
                            </div>

                            {/* Label */}
                            <h3 className="text-xl font-bold text-slate-900 mb-1">{stat.label}</h3>
                            <p className="text-slate-600 text-sm">{stat.description}</p>
                        </div>
                    ))}
                </div>

                {/* Bottom CTA */}
                <div className="text-center mt-16">
                    <p className="text-lg text-slate-600">
                        Join the creators who've already{" "}
                        <span className="font-bold text-indigo-600">10x'd their deal management</span>
                    </p>
                </div>
            </div>
        </section>
    );
}
