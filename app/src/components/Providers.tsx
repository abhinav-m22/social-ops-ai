"use client"

import { Toaster } from "react-hot-toast"

export const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <Toaster position="top-right" />
      {children}
    </>
  )
}

