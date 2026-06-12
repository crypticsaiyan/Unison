"use client"

import { useCallback, useEffect, useState } from "react"
import type { ConferenceSession } from "@/lib/event-config"

export function useSessions() {
  const [sessions, setSessions] = useState<ConferenceSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch("/api/sessions", { cache: "no-store" })
      if (!res.ok) throw new Error(`${res.status}`)
      const data = await res.json()
      setSessions(data.sessions || [])
    } catch {
      setError("Failed to load sessions")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const createSession = useCallback(
    async (session: Partial<ConferenceSession>) => {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(session),
      })
      await refresh()
      return res.ok
    },
    [refresh]
  )

  const updateSession = useCallback(
    async (id: string, session: Partial<ConferenceSession>) => {
      const res = await fetch(`/api/sessions?id=${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(session),
      })
      await refresh()
      return res.ok
    },
    [refresh]
  )

  const deleteSession = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/sessions?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      })
      await refresh()
      return res.ok
    },
    [refresh]
  )

  return { sessions, loading, error, refresh, createSession, updateSession, deleteSession }
}
