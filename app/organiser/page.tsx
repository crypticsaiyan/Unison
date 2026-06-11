"use client"

import dynamic from "next/dynamic"
import { Suspense } from "react"

const OrganiserDashboard = dynamic(() => import("./organiser-dashboard"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
      Loading dashboard…
    </div>
  ),
})

export default function OrganiserPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
          Loading dashboard…
        </div>
      }
    >
      <OrganiserDashboard />
    </Suspense>
  )
}
