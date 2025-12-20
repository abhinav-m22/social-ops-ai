"use client"

import { ReactNode } from "react"
import { Navbar } from "./Navbar"
import { NotificationItem } from "./NotificationBell"

interface AppLayoutProps {
    children: ReactNode
    notifications?: NotificationItem[]
    onClearNotifications?: () => void
}

export function AppLayout({ children, notifications, onClearNotifications }: AppLayoutProps) {
    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar notifications={notifications} onClearNotifications={onClearNotifications} />
            <main className="max-w-7xl mx-auto px-6 py-8">
                {children}
            </main>
        </div>
    )
}
