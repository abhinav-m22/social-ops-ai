"use client"

import { Toaster } from "react-hot-toast"
import { MotiaStreamProvider } from "@motiadev/stream-client-react"

export const Providers = ({ children }: { children: React.ReactNode }) => {
  // In a real app, this would come from env or config
  const streamAddress = typeof window !== 'undefined' ?
    `ws://${window.location.hostname}:3000` : 'ws://localhost:3000'

  return (
    <MotiaStreamProvider address={streamAddress}>
      <Toaster position="top-right" />
      {children}
    </MotiaStreamProvider>
  )
}

