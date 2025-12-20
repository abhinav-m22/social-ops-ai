"use client";

import { forwardRef, useRef } from "react";
import { Instagram, Brain, Send, FileCheck, TrendingUp } from "lucide-react";
import { AnimatedBeam } from "@/components/ui/animated-beam";
import { cn } from "@/lib/utils";

const Circle = forwardRef<
    HTMLDivElement,
    { className?: string; children?: React.ReactNode }
>(({ className, children }, ref) => {
    return (
        <div
            ref={ref}
            className={cn(
                "z-10 flex h-16 w-16 items-center justify-center rounded-full border-2 bg-white shadow-md",
                className
            )}
        >
            {children}
        </div>
    );
});

Circle.displayName = "Circle";

export default function HowItWorks() {
    const containerRef = useRef<HTMLDivElement>(null);
    const div1Ref = useRef<HTMLDivElement>(null);
    const div2Ref = useRef<HTMLDivElement>(null);
    const div3Ref = useRef<HTMLDivElement>(null);
    const div4Ref = useRef<HTMLDivElement>(null);
    const div5Ref = useRef<HTMLDivElement>(null);

    return (
        <section className="py-20 bg-slate-50">
            <div className="container mx-auto px-6 max-w-7xl">
                {/* Section Header */}
                <div className="text-center mb-20 space-y-4">
                    <div className="inline-block px-4 py-2 bg-cyan-100 text-cyan-700 rounded-full text-sm font-medium">
                        Simple, Automated Workflow
                    </div>
                    <h2 className="text-4xl font-bold text-slate-900">
                        How It Works
                    </h2>
                    <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                        From brand DM to payment tracking — fully automated with AI intelligence
                    </p>
                </div>

                {/* Animated Flow Diagram */}
                <div
                    className="relative flex h-[400px] w-full items-center justify-between max-w-5xl mx-auto"
                    ref={containerRef}
                >
                    {/* Step 1: Brand DMs */}
                    <div className="flex flex-col items-center gap-3">
                        <Circle ref={div1Ref} className="border-pink-300 bg-pink-50">
                            <Instagram className="h-7 w-7 text-pink-600" />
                        </Circle>
                        <div className="text-center max-w-[140px]">
                            <p className="font-semibold text-slate-900">Brand DMs You</p>
                            <p className="text-sm text-slate-600">on Instagram</p>
                        </div>
                    </div>

                    {/* Step 2: AI Processing */}
                    <div className="flex flex-col items-center gap-3">
                        <Circle ref={div2Ref} className="border-indigo-300 bg-indigo-50">
                            <Brain className="h-7 w-7 text-indigo-600" />
                        </Circle>
                        <div className="text-center max-w-[140px]">
                            <p className="font-semibold text-slate-900">AI Extracts Details</p>
                            <p className="text-sm text-slate-600">& suggests rates</p>
                        </div>
                    </div>

                    {/* Step 3: Smart Reply */}
                    <div className="flex flex-col items-center gap-3">
                        <Circle ref={div3Ref} className="border-amber-300 bg-amber-50">
                            <Send className="h-7 w-7 text-amber-600" />
                        </Circle>
                        <div className="text-center max-w-[140px]">
                            <p className="font-semibold text-slate-900">One-Click Reply</p>
                            <p className="text-sm text-slate-600">smart response sent</p>
                        </div>
                    </div>

                    {/* Step 4: Deal Pipeline */}
                    <div className="flex flex-col items-center gap-3">
                        <Circle ref={div4Ref} className="border-emerald-300 bg-emerald-50">
                            <FileCheck className="h-7 w-7 text-emerald-600" />
                        </Circle>
                        <div className="text-center max-w-[140px]">
                            <p className="font-semibold text-slate-900">Negotiate → Accept</p>
                            <p className="text-sm text-slate-600">→ Auto Invoice</p>
                        </div>
                    </div>

                    {/* Step 5: Track Performance */}
                    <div className="flex flex-col items-center gap-3">
                        <Circle ref={div5Ref} className="border-cyan-300 bg-cyan-50">
                            <TrendingUp className="h-7 w-7 text-cyan-600" />
                        </Circle>
                        <div className="text-center max-w-[140px]">
                            <p className="font-semibold text-slate-900">Get Paid, Track</p>
                            <p className="text-sm text-slate-600">performance metrics</p>
                        </div>
                    </div>

                    {/* Animated Beams */}
                    <AnimatedBeam
                        containerRef={containerRef}
                        fromRef={div1Ref}
                        toRef={div2Ref}
                        curvature={0}
                        gradientStartColor="#ec4899"
                        gradientStopColor="#6366f1"
                    />
                    <AnimatedBeam
                        containerRef={containerRef}
                        fromRef={div2Ref}
                        toRef={div3Ref}
                        curvature={0}
                        gradientStartColor="#6366f1"
                        gradientStopColor="#f59e0b"
                    />
                    <AnimatedBeam
                        containerRef={containerRef}
                        fromRef={div3Ref}
                        toRef={div4Ref}
                        curvature={0}
                        gradientStartColor="#f59e0b"
                        gradientStopColor="#10b981"
                    />
                    <AnimatedBeam
                        containerRef={containerRef}
                        fromRef={div4Ref}
                        toRef={div5Ref}
                        curvature={0}
                        gradientStartColor="#10b981"
                        gradientStopColor="#06b6d4"
                    />
                </div>

                {/* Bottom CTA */}
                <div className="text-center mt-20">
                    <p className="text-lg text-slate-600 mb-6">
                        The entire process takes <span className="font-bold text-indigo-600">less than 2 minutes</span>
                    </p>
                    <div className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 shadow-sm rounded-full">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="font-medium text-slate-900">Always running in the background</span>
                    </div>
                </div>
            </div>
        </section>
    );
}
