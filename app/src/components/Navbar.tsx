"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bell, Menu, X, User, Settings, HelpCircle, LogOut, TrendingUp, LayoutDashboard, DollarSign, BarChart3, ReceiptText } from "lucide-react"
import { cn } from "@/lib/utils"
import { NotificationBell, NotificationItem } from "./NotificationBell"

interface NavbarProps {
    notifications?: NotificationItem[]
    onClearNotifications?: () => void
}

const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/finance", label: "Finance", icon: DollarSign },
    { href: "/competitor-benchmarking", label: "Analytics", icon: BarChart3 },
    { href: "/trend-scout", label: "TrendScout", icon: TrendingUp },
    { href: "/invoices", label: "Invoices", icon: ReceiptText }
]

export function Navbar({ notifications = [], onClearNotifications }: NavbarProps) {
    const pathname = usePathname()
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [profileOpen, setProfileOpen] = useState(false)

    const isActive = (href: string) => pathname === href

    return (
        <nav className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
            <div className="max-w-7xl mx-auto px-6">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/dashboard" className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-linear-to-br from-indigo-600 to-cyan-500 shadow-md flex items-center justify-center shrink-0">
                            <TrendingUp className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold bg-linear-to-r from-indigo-600 to-cyan-500 bg-clip-text text-transparent tracking-tight">
                            SocialOps AI
                        </span>
                    </Link>

                    {/* Desktop Navigation Links */}
                    <div className="hidden md:flex items-center gap-1">
                        {navLinks.map((link) => {
                            const Icon = link.icon
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                                        isActive(link.href)
                                            ? "text-indigo-600 bg-indigo-50 border-b-2 border-indigo-600"
                                            : "text-slate-600 hover:text-indigo-600 hover:bg-slate-50"
                                    )}
                                >
                                    <Icon className="w-4 h-4" />
                                    {link.label}
                                </Link>
                            )
                        })}
                    </div>

                    {/* Right Side: Notifications & Profile */}
                    <div className="flex items-center gap-3">
                        {/* Notification Bell */}
                        <NotificationBell items={notifications} onClear={onClearNotifications || (() => { })} />

                        {/* Profile Dropdown */}
                        <div className="relative hidden md:block">
                            <button
                                onClick={() => setProfileOpen(!profileOpen)}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                            >
                                <div className="w-8 h-8 bg-linear-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
                                    <User className="w-4 h-4 text-white" />
                                </div>
                            </button>

                            {profileOpen && (
                                <>
                                    <div
                                        className="fixed inset-0 z-10"
                                        onClick={() => setProfileOpen(false)}
                                    />
                                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-20">
                                        <Link
                                            href="/creator/profile"
                                            className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                            onClick={() => setProfileOpen(false)}
                                        >
                                            <User className="w-4 h-4" />
                                            Profile
                                        </Link>
                                        <Link
                                            href="/settings"
                                            className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                            onClick={() => setProfileOpen(false)}
                                        >
                                            <Settings className="w-4 h-4" />
                                            Settings
                                        </Link>
                                        <Link
                                            href="/help"
                                            className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                            onClick={() => setProfileOpen(false)}
                                        >
                                            <HelpCircle className="w-4 h-4" />
                                            Help
                                        </Link>
                                        <div className="border-t border-slate-200 my-2" />
                                        <button
                                            className="flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors w-full"
                                            onClick={() => {
                                                setProfileOpen(false)
                                                // TODO: Implement logout
                                                console.log("Logout clicked")
                                            }}
                                        >
                                            <LogOut className="w-4 h-4" />
                                            Logout
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-50"
                        >
                            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden border-t border-slate-200 py-4 space-y-2">
                        {navLinks.map((link) => {
                            const Icon = link.icon
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all",
                                        isActive(link.href)
                                            ? "text-indigo-600 bg-indigo-50"
                                            : "text-slate-600 hover:bg-slate-50"
                                    )}
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    <Icon className="w-5 h-5" />
                                    {link.label}
                                </Link>
                            )
                        })}
                        <div className="border-t border-slate-200 my-2" />
                        <Link
                            href="/creator/profile"
                            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            <User className="w-5 h-5" />
                            Profile
                        </Link>
                        <Link
                            href="/settings"
                            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            <Settings className="w-5 h-5" />
                            Settings
                        </Link>
                        <Link
                            href="/help"
                            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            <HelpCircle className="w-5 h-5" />
                            Help
                        </Link>
                    </div>
                )}
            </div>
        </nav>
    )
}
