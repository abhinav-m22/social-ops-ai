"use client";

import { Check, Sparkles } from "lucide-react";
import { ShimmerButton } from "@/components/ui/shimmer-button";

export default function Pricing() {
    return (
        <section className="py-20 bg-slate-50">
            <div className="container mx-auto px-6 max-w-4xl">
                {/* Section Header */}
                <div className="text-center mb-16 space-y-4">
                    <div className="inline-block px-4 py-2 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
                        Early Access Pricing
                    </div>
                    <h2 className="text-4xl font-bold text-slate-900">
                        Simple, Transparent Pricing
                    </h2>
                </div>

                {/* Pricing Card */}
                <div className="relative bg-white border-2 border-slate-200 shadow-lg rounded-2xl p-10 max-w-2xl mx-auto">
                    {/* Badge */}
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-2 rounded-full text-sm font-bold shadow-md flex items-center gap-2">
                            <Sparkles className="w-4 h-4" />
                            Launch Special
                        </div>
                    </div>

                    <div className="text-center mb-8 mt-4">
                        <div className="text-6xl font-bold text-slate-900 mb-2">
                            FREE
                        </div>
                        <p className="text-xl text-slate-600">For the first 100 creators</p>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-slate-200 my-8"></div>

                    {/* Then pricing */}
                    <div className="text-center mb-8">
                        <div className="flex items-baseline justify-center gap-2">
                            <span className="text-2xl text-slate-400 line-through">₹999</span>
                            <span className="text-5xl font-bold text-indigo-600">₹499</span>
                            <span className="text-slate-600">/month</span>
                        </div>
                        <p className="text-sm text-slate-600 mt-2">
                            <span className="font-semibold text-amber-600">50% off</span> for early adopters
                        </p>
                    </div>

                    {/* Features */}
                    <div className="space-y-4 mb-8">
                        {[
                            "Unlimited brand inquiries",
                            "AI-powered rate calculator",
                            "Smart auto-reply system",
                            "Visual deal pipeline",
                            "Automated GST invoicing",
                            "Competitor intelligence",
                            "Multi-platform integration",
                            "Priority email support"
                        ].map((feature, idx) => (
                            <div key={idx} className="flex items-center gap-3">
                                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center">
                                    <Check className="w-4 h-4 text-indigo-600" />
                                </div>
                                <span className="text-slate-700">{feature}</span>
                            </div>
                        ))}
                    </div>

                    {/* Value Proposition */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-8">
                        <p className="text-center text-slate-700">
                            <span className="font-bold text-indigo-600">ROI Guarantee:</span> Save <span className="font-semibold">30+ hours/month</span> and earn{" "}
                            <span className="font-semibold">₹2.5L+ more annually</span> — that's a <span className="font-bold text-emerald-600">50,000% return</span> on your investment
                        </p>
                    </div>

                    {/* CTA */}
                    <div className="text-center">
                        <ShimmerButton className="w-full max-w-xs mx-auto shadow-lg">
                            <span className="text-base font-semibold">Get Started Free</span>
                        </ShimmerButton>
                        <p className="text-sm text-slate-600 mt-4">No credit card required • Cancel anytime</p>
                    </div>
                </div>

                {/* Bottom Trust Line */}
                <div className="text-center mt-12">
                    <p className="text-slate-600">
                        Join <span className="font-bold text-indigo-600">500+ creators</span> already on the waitlist
                    </p>
                </div>
            </div>
        </section>
    );
}
