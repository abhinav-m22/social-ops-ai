"use client";

import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { SparklesText } from "@/components/ui/sparkles-text";

export default function FinalCTA() {
    const [email, setEmail] = useState("");
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log("Email submitted:", email);
        setSubmitted(true);
        setTimeout(() => {
            setSubmitted(false);
            setEmail("");
        }, 3000);
    };

    return (
        <section className="py-32 bg-gradient-to-br from-indigo-600 via-indigo-700 to-cyan-700 text-white relative overflow-hidden">
            {/* Subtle pattern background */}
            <div className="absolute inset-0 opacity-10 bg-grid-white/[0.05] bg-[size:60px_60px]"></div>

            <div className="relative z-10 container mx-auto px-6 max-w-5xl text-center">
                {/* Main Headline */}
                <div className="mb-8">
                    <SparklesText
                        className="text-5xl md:text-6xl font-bold text-white"
                        sparklesCount={10}
                    >
                        Ready to 10x Your Creator Business?
                    </SparklesText>
                </div>

                {/* Subheadline */}
                <p className="text-2xl md:text-3xl text-indigo-100 mb-12 max-w-3xl mx-auto">
                    Join the waitlist. Limited spots for early access.
                </p>

                {/* Email Signup Form */}
                <form onSubmit={handleSubmit} className="max-w-xl mx-auto mb-8">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your email"
                            required
                            className="flex-1 px-6 py-4 rounded-xl text-slate-900 text-lg focus:outline-none focus:ring-4 focus:ring-white/30 shadow-lg border-2 border-white/20"
                        />
                        <ShimmerButton type="submit" className="px-8 py-4 shadow-xl">
                            {submitted ? (
                                <span className="flex items-center gap-2 text-base font-semibold">
                                    <Check className="w-5 h-5" />
                                    Joined!
                                </span>
                            ) : (
                                <span className="flex items-center gap-2 text-base font-semibold">
                                    Get Early Access
                                    <ArrowRight className="w-5 h-5" />
                                </span>
                            )}
                        </ShimmerButton>
                    </div>
                </form>

                {/* Trust Line */}
                <div className="flex items-center justify-center gap-3 text-indigo-100">
                    <div className="flex -space-x-2">
                        {[...Array(5)].map((_, i) => (
                            <div
                                key={i}
                                className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 border-2 border-white flex items-center justify-center font-bold text-sm shadow-md"
                            >
                                {String.fromCharCode(65 + i)}
                            </div>
                        ))}
                    </div>
                    <p className="text-lg">
                        Join <span className="font-bold">500+ creators</span> already signed up
                    </p>
                </div>

                {/* Features Grid */}
                <div className="grid md:grid-cols-3 gap-6 mt-16">
                    {[
                        { label: "Free for first 100", icon: "🎉" },
                        { label: "No credit card required", icon: "💳" },
                        { label: "Cancel anytime", icon: "✨" }
                    ].map((item, idx) => (
                        <div
                            key={idx}
                            className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 flex items-center gap-3 justify-center shadow-sm"
                        >
                            <span className="text-2xl">{item.icon}</span>
                            <span className="font-medium">{item.label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
