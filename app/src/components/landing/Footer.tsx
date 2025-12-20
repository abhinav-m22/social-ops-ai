"use client";

import { Twitter, Linkedin, Instagram, Mail } from "lucide-react";

export default function Footer() {
    return (
        <footer className="bg-slate-900 text-slate-300 py-16 border-t border-slate-800">
            <div className="container mx-auto px-6 max-w-7xl">
                <div className="grid md:grid-cols-4 gap-12 mb-12">
                    {/* Brand */}
                    <div className="md:col-span-1">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 shadow-md"></div>
                            <span className="text-xl font-bold text-white">SocialOps AI</span>
                        </div>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            The AI-powered platform for Indian creators to manage brand collaborations effortlessly.
                        </p>
                        <div className="mt-6 flex items-center gap-2 text-sm">
                            <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                            <span className="text-slate-400">Built with Motia</span>
                        </div>
                    </div>

                    {/* Platform */}
                    <div>
                        <h3 className="text-white font-bold mb-4">Platform</h3>
                        <ul className="space-y-3 text-sm">
                            <li><a href="#features" className="hover:text-indigo-400 transition-colors">Features</a></li>
                            <li><a href="#pricing" className="hover:text-indigo-400 transition-colors">Pricing</a></li>
                            <li><a href="#how-it-works" className="hover:text-indigo-400 transition-colors">How It Works</a></li>
                            <li><a href="#testimonials" className="hover:text-indigo-400 transition-colors">Testimonials</a></li>
                        </ul>
                    </div>

                    {/* Resources */}
                    <div>
                        <h3 className="text-white font-bold mb-4">Resources</h3>
                        <ul className="space-y-3 text-sm">
                            <li><a href="#blog" className="hover:text-indigo-400 transition-colors">Blog</a></li>
                            <li><a href="#docs" className="hover:text-indigo-400 transition-colors">Documentation</a></li>
                            <li><a href="#faq" className="hover:text-indigo-400 transition-colors">FAQ</a></li>
                            <li><a href="#support" className="hover:text-indigo-400 transition-colors">Support</a></li>
                        </ul>
                    </div>

                    {/* Company */}
                    <div>
                        <h3 className="text-white font-bold mb-4">Company</h3>
                        <ul className="space-y-3 text-sm">
                            <li><a href="#about" className="hover:text-indigo-400 transition-colors">About Us</a></li>
                            <li><a href="#contact" className="hover:text-indigo-400 transition-colors">Contact</a></li>
                            <li><a href="#privacy" className="hover:text-indigo-400 transition-colors">Privacy Policy</a></li>
                            <li><a href="#terms" className="hover:text-indigo-400 transition-colors">Terms of Service</a></li>
                        </ul>
                    </div>
                </div>

                {/* Social Links */}
                <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-slate-800">
                    <p className="text-sm text-slate-400 mb-4 md:mb-0">
                        © 2025 SocialOps AI. All rights reserved.
                    </p>

                    <div className="flex items-center gap-6">
                        <a
                            href="https://twitter.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-indigo-400 transition-colors"
                            aria-label="Twitter"
                        >
                            <Twitter className="w-5 h-5" />
                        </a>
                        <a
                            href="https://linkedin.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-indigo-400 transition-colors"
                            aria-label="LinkedIn"
                        >
                            <Linkedin className="w-5 h-5" />
                        </a>
                        <a
                            href="https://instagram.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-indigo-400 transition-colors"
                            aria-label="Instagram"
                        >
                            <Instagram className="w-5 h-5" />
                        </a>
                        <a
                            href="mailto:hello@socialops.ai"
                            className="hover:text-indigo-400 transition-colors"
                            aria-label="Email"
                        >
                            <Mail className="w-5 h-5" />
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
