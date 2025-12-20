"use client";

import { Marquee } from "@/components/ui/marquee";
import type { Testimonial } from "@/types/landing";
import { Star } from "lucide-react";

const testimonials: Testimonial[] = [
    {
        name: "Rohan Sharma",
        role: "Tech Reviewer",
        niche: "Technology & Gadgets",
        followers: "450K",
        quote: "Went from losing deals to closing 3x more. The AI rate calculator alone paid for itself in the first brand deal.",
        avatar: "RS"
    },
    {
        name: "Priya Gupta",
        role: "Beauty Creator",
        niche: "Beauty & Lifestyle",
        followers: "280K",
        quote: "Finally know my worth - rates increased 40% after seeing what competitors charge. No more undercharging!",
        avatar: "PG"
    },
    {
        name: "Arjun Patel",
        role: "Gaming Creator",
        niche: "Gaming & Streaming",
        followers: "520K",
        quote: "No more payment chasing nightmares. Auto invoicing with GST compliance saved me during tax season.",
        avatar: "AP"
    },
    {
        name: "Neha Singh",
        role: "Fashion Influencer",
        niche: "Fashion & Style",
        followers: "310K",
        quote: "The unified inbox is a game-changer. I was missing 50% of brand DMs spread across platforms!",
        avatar: "NS"
    },
    {
        name: "Vikram Reddy",
        role: "Food Blogger",
        niche: "Food & Travel",
        followers: "190K",
        quote: "Smart auto-replies handle initial conversations while I focus on content creation. Genius!",
        avatar: "VR"
    },
    {
        name: "Ananya Desai",
        role: "Fitness Coach",
        niche: "Health & Fitness",
        followers: "380K",
        quote: "Deal pipeline tracking means I never forget a deadline. Professional workflow that brands respect.",
        avatar: "AD"
    }
];

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
    return (
        <div className="w-[350px] mx-3">
            <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-6 hover:shadow-md transition-shadow">
                {/* Rating */}
                <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                </div>

                {/* Quote */}
                <p className="text-slate-700 mb-6 leading-relaxed">"{testimonial.quote}"</p>

                {/* Author */}
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-sm">
                        {testimonial.avatar}
                    </div>
                    <div>
                        <p className="font-bold text-slate-900">{testimonial.name}</p>
                        <p className="text-sm text-slate-600">{testimonial.niche}</p>
                        <p className="text-xs text-slate-500">{testimonial.followers} followers</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function SocialProof() {
    return (
        <section className="py-20 bg-white overflow-hidden">
            <div className="container mx-auto px-6 max-w-7xl mb-16">
                {/* Section Header */}
                <div className="text-center space-y-4">
                    <div className="inline-block px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
                        Trusted by Creators
                    </div>
                    <h2 className="text-4xl font-bold text-slate-900">
                        Creators Love SocialOps AI
                    </h2>
                    <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                        Join hundreds of Indian creators earning more and stressing less
                    </p>
                </div>
            </div>

            {/* Marquee of Testimonials */}
            <div className="relative">
                <Marquee pauseOnHover className="[--duration:50s]">
                    {testimonials.map((testimonial, idx) => (
                        <TestimonialCard key={idx} testimonial={testimonial} />
                    ))}
                </Marquee>

                {/* Gradient overlays */}
                <div className="pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-white"></div>
                <div className="pointer-events-none absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l from-white"></div>
            </div>

            {/* Stats */}
            <div className="container mx-auto px-6 max-w-5xl mt-16">
                <div className="grid md:grid-cols-3 gap-8">
                    <div className="text-center">
                        <div className="text-4xl font-bold text-indigo-600 mb-2">500+</div>
                        <p className="text-slate-600">Early Access Signups</p>
                    </div>
                    <div className="text-center">
                        <div className="text-4xl font-bold text-cyan-600 mb-2">₹2.5L+</div>
                        <p className="text-slate-600">Avg. Annual Increase</p>
                    </div>
                    <div className="text-center">
                        <div className="text-4xl font-bold text-amber-600 mb-2">40%</div>
                        <p className="text-slate-600">Higher Rates on Average</p>
                    </div>
                </div>
            </div>
        </section>
    );
}
