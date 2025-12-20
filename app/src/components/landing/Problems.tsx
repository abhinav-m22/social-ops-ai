"use client";

import React from "react";
import {
    MessageSquare, TrendingDown, Clock,
    Users, FileSpreadsheet, AlertTriangle, ArrowRight
} from "lucide-react";
import { BentoCard, BentoGrid } from "@/components/ui/bento-grid";
import { BorderBeam } from "@/components/ui/border-beam";
import { GridPattern } from "@/components/ui/grid-pattern";
import { cn } from "@/lib/utils";

const problems = [
    {
        Icon: MessageSquare,
        name: "Brand DMs lost in the noise",
        description: "Instagram, WhatsApp, and Email aren't built for business. Stop losing five-figure deals to your 'Requests' folder.",
        href: "#",
        cta: "See how it works",
        className: "lg:col-span-2",
        // This puts a large, faint icon in the background to fill the empty space
        background: <MessageSquare className="absolute -right-10 -top-10 h-64 w-64 opacity-[0.03] text-indigo-600 rotate-12" />,
    },
    {
        Icon: TrendingDown,
        name: "Stop Undercharging",
        description: "No market data means leaving money on the table. Negotiate with confidence.",
        href: "#",
        cta: "Compare rates",
        className: "lg:col-span-1",
        background: <TrendingDown className="absolute -right-5 -top-5 h-40 w-40 opacity-[0.03] text-indigo-600" />,
    },
    {
        Icon: AlertTriangle,
        name: "Tax Compliance Nightmares",
        description: "GST and TDS shouldn't be a year-end surprise. Automate your invoicing and stay audit-ready.",
        href: "#",
        cta: "View features",
        className: "lg:col-span-1",
        background: <AlertTriangle className="absolute -right-5 -top-5 h-40 w-40 opacity-[0.03] text-indigo-600" />,
    },
    {
        Icon: Clock,
        name: "The 'Screenshot' Payment Cycle",
        description: "Stop chasing payments via manual reminders. Get professional tracking and timely settlements.",
        href: "#",
        cta: "Automate now",
        className: "lg:col-span-2",
        background: <Clock className="absolute -right-10 -top-10 h-64 w-64 opacity-[0.03] text-indigo-600 -rotate-12" />,
    }
];

export default function Problems() {
    return (
        <section className="relative overflow-hidden py-24 bg-white">
            {/* Magic UI Background */}
            <GridPattern
                width={40}
                height={40}
                x={-1}
                y={-1}
                className={cn(
                    "[mask-image:linear-gradient(to_bottom_right,white,transparent,transparent)]",
                )}
            />

            <div className="container relative z-10 mx-auto px-6 max-w-7xl">
                <div className="text-center mb-16 space-y-4">
                    <h2 className="text-3xl md:text-5xl font-bold text-slate-900 tracking-tight">
                        The Chaos of Managing Brand Deals
                    </h2>
                    <p className="text-slate-500 max-w-2xl mx-auto text-lg">
                        Fragmented workflows are costing you more than just time.
                    </p>
                </div>

                <BentoGrid className="lg:grid-rows-2">
                    {problems.map((problem, idx) => (
                        <BentoCard
                            key={idx}
                            {...problem}
                            // Added BorderBeam to the first few cards for a "premium" feel
                            className={cn(
                                "relative overflow-hidden group bg-white border border-slate-100 shadow-xl shadow-slate-200/50",
                                problem.className
                            )}
                        >
                            {/* This adds the animated glowing border effect */}
                            {idx === 0 && <BorderBeam size={250} duration={12} delay={9} />}
                        </BentoCard>
                    ))}
                </BentoGrid>

                <div className="mt-12 text-center text-slate-400 text-sm font-medium italic">
                    *Based on data from 500+ Indian creators
                </div>
            </div>
        </section>
    );
}