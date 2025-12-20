"use client";

import { ArrowRight, Play } from "lucide-react";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { BorderBeam } from "@/components/ui/border-beam";
import { Particles } from "@/components/ui/particles";
import { AnimatedGradientText } from "@/components/ui/animated-gradient-text";
import { cn } from "@/lib/utils";

export default function Hero() {
    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-white">
            {/* Animated particles background */}
            <Particles
                className="absolute inset-0 pointer-events-none"
                quantity={80}
                ease={80}
                color="#6366f1"
                refresh
            />

            <div className="relative z-10 container mx-auto px-6 py-20 max-w-7xl">
                <div className="flex flex-col items-center text-center space-y-8">
                    {/* Animated tagline */}
                    <AnimatedGradientText className="mb-4">
                        🚀 <hr className="mx-2 h-4 w-[1px] shrink-0 bg-slate-300" />{" "}
                        <span className={cn("animate-gradient inline bg-gradient-to-r from-indigo-600 via-cyan-600 to-amber-600 bg-[length:var(--bg-size)_100%] bg-clip-text text-transparent")}>
                            Powered by Motia
                        </span>
                    </AnimatedGradientText>

                    {/* Main headline */}
                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight max-w-5xl text-slate-900">
                        Stop Juggling DMs.
                        <br />
                        <span className="bg-gradient-to-r from-indigo-600 via-cyan-600 to-indigo-600 bg-clip-text text-transparent">
                            Start Closing Deals.
                        </span>
                    </h1>

                    {/* Subheadline */}
                    <p className="text-xl md:text-2xl text-slate-600 max-w-3xl leading-relaxed">
                        AI-powered brand collaboration platform for Indian creators.
                        <br />
                        Manage inquiries, negotiate rates, track payments.
                    </p>
                    <p className="text-xl md:text-2xl text-slate-600 max-w-3xl leading-relaxed">
                        All in one place!
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 pt-4">
                        <ShimmerButton className="shadow-lg">
                            <span className="whitespace-pre-wrap text-center text-sm font-medium leading-none tracking-tight text-white lg:text-lg flex items-center gap-2">
                                Start Free Trial
                                <ArrowRight className="w-5 h-5" />
                            </span>
                        </ShimmerButton>

                        <button className="inline-flex h-12 items-center justify-center rounded-lg border-2 border-slate-300 bg-white px-8 text-sm font-medium text-slate-900 shadow-sm transition-all hover:bg-slate-50 hover:border-indigo-400 lg:text-base">
                            <Play className="w-5 h-5 mr-2" />
                            Watch Demo
                        </button>
                    </div>

                    {/* Trust badges */}
                    <div className="flex flex-wrap items-center justify-center gap-6 pt-8 text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-indigo-600"></div>
                            <span>Powered by Motia</span>
                        </div>
                        <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-amber-600"></div>
                            <span>Built for Indian Creators</span>
                        </div>
                        <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-cyan-600"></div>
                            <span>500+ Early Signups</span>
                        </div>
                    </div>

                    {/* Hero Image/Dashboard Mockup */}
                    <div className="relative w-full max-w-5xl mt-16">
                        <div className="relative rounded-2xl overflow-hidden shadow-xl bg-white border-2 border-slate-200 p-1">
                            <BorderBeam size={250} duration={12} delay={9} />
                            <div className="rounded-xl bg-slate-50 p-8">
                                {/* Dashboard mockup placeholder */}
                                <div className="aspect-video bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                                    <div className="grid grid-cols-3 gap-4 h-full">
                                        {/* Sidebar */}
                                        <div className="space-y-3">
                                            <div className="h-8 bg-gradient-to-r from-indigo-200 to-indigo-100 rounded"></div>
                                            <div className="h-6 bg-slate-100 rounded"></div>
                                            <div className="h-6 bg-slate-100 rounded"></div>
                                            <div className="h-6 bg-slate-100 rounded"></div>
                                            <div className="h-6 bg-slate-100 rounded"></div>
                                        </div>
                                        {/* Main content */}
                                        <div className="col-span-2 space-y-3">
                                            <div className="h-10 bg-gradient-to-r from-cyan-200 to-indigo-200 rounded"></div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="h-24 bg-gradient-to-br from-amber-100 to-orange-100 rounded"></div>
                                                <div className="h-24 bg-gradient-to-br from-cyan-100 to-blue-100 rounded"></div>
                                            </div>
                                            <div className="h-32 bg-gradient-to-br from-indigo-100 to-purple-100 rounded"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
