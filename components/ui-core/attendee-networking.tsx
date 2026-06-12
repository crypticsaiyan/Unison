"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { MultiSelect } from "@progress/kendo-react-dropdowns"
import { Notification, NotificationGroup } from "@progress/kendo-react-notification"
import { Fade } from "@progress/kendo-react-animation"
import { Users, Handshake, Globe, Lightning } from "@phosphor-icons/react"
import { getLanguage } from "@/lib/languages"

const INTEREST_OPTIONS = [
  "React", "TypeScript", "Next.js", "AI/ML", "Performance",
  "Testing", "Design Systems", "WebAssembly", "Node.js", "GraphQL",
  "Open Source", "Accessibility", "Web Animation", "Edge Computing", "Signals",
]

interface Match {
  id: string
  name: string
  interests: string[]
  language: string
}

interface AttendeeNetworkingProps {
  sessionId: string
  language: string
}

function generateId() {
  return Math.random().toString(36).slice(2, 10)
}

const ATTENDEE_ID_KEY = "unison_attendee_id"
const ATTENDEE_NAME_KEY = "unison_attendee_name"

function getStoredId() {
  if (typeof window === "undefined") return generateId()
  return localStorage.getItem(ATTENDEE_ID_KEY) || (() => {
    const id = generateId()
    localStorage.setItem(ATTENDEE_ID_KEY, id)
    return id
  })()
}

function getStoredName() {
  if (typeof window === "undefined") return ""
  return localStorage.getItem(ATTENDEE_NAME_KEY) || ""
}

export function AttendeeNetworking({ sessionId, language }: AttendeeNetworkingProps) {
  const [step, setStep] = useState<"form" | "matches">("form")
  const [name, setName] = useState("")
  const [interests, setInterests] = useState<string[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<Match | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const myId = useRef(getStoredId())

  useEffect(() => {
    setName(getStoredName())
  }, [])

  const register = useCallback(async () => {
    if (!interests.length) return
    setLoading(true)
    const storedName = name.trim() || "Anonymous"
    if (typeof window !== "undefined") localStorage.setItem(ATTENDEE_NAME_KEY, storedName)

    try {
      const res = await fetch("/api/networking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "register",
          id: myId.current,
          name: storedName,
          interests,
          language,
          sessionId,
        }),
      })
      const data = await res.json()
      setMatches(data.matches || [])
      setStep("matches")
    } finally {
      setLoading(false)
    }
  }, [interests, name, language, sessionId])

  // Poll for new matches every 30s once registered
  useEffect(() => {
    if (step !== "matches") return
    const poll = async () => {
      try {
        const res = await fetch("/api/networking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "matches", id: myId.current }),
        })
        const data = await res.json()
        const newMatches: Match[] = data.matches || []
        // Surface a toast for any newly appeared match
        setMatches((prev) => {
          const prevIds = new Set(prev.map((m) => m.id))
          const fresh = newMatches.filter((m) => !prevIds.has(m.id))
          if (fresh.length > 0) {
            setToast(fresh[0])
            if (toastTimer.current) clearTimeout(toastTimer.current)
            toastTimer.current = setTimeout(() => setToast(null), 5000)
          }
          return newMatches
        })
      } catch { /* ignore */ }
    }
    poll()
    const id = setInterval(poll, 30000)
    return () => { clearInterval(id); if (toastTimer.current) clearTimeout(toastTimer.current) }
  }, [step])

  const interestItems = INTEREST_OPTIONS.map((i) => ({ text: i, value: i }))
  const selectedInterests = interestItems.filter((i) => interests.includes(i.value))

  if (step === "form") {
    return (
      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Handshake className="h-4 w-4 text-[var(--color-keppel-400)]" />
          Meet attendees with similar interests
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Your name (optional)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Anonymous"
              className="w-full rounded-lg border border-[var(--color-baltic-sea-700)] bg-[var(--color-baltic-sea-950)] px-3 py-2 text-sm outline-none focus:border-[var(--color-keppel-500)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Pick topics you care about
            </label>
            <MultiSelect
              data={interestItems}
              value={selectedInterests}
              textField="text"
              dataItemKey="value"
              onChange={(e) => setInterests(e.value.map((i: { value: string }) => i.value))}
              placeholder="React, AI/ML, TypeScript…"
              style={{ width: "100%" }}
            />
          </div>
        </div>

        <button
          onClick={register}
          disabled={loading || interests.length === 0}
          className="w-full rounded-lg bg-[var(--color-keppel-500)] px-4 py-2 text-sm font-semibold text-[var(--color-keppel-950)] transition-colors hover:bg-[var(--color-keppel-400)] disabled:opacity-40"
        >
          {loading ? "Finding matches…" : "Find my people →"}
        </button>
      </div>
    )
  }

  return (
    <>
      <NotificationGroup style={{ position: "fixed", right: 16, bottom: 16, zIndex: 60, alignItems: "flex-end" }}>
        <Fade>
          {toast && (
            <Notification type={{ style: "info", icon: true }} closable onClose={() => setToast(null)}>
              <span className="text-sm">
                <strong>{toast.name}</strong> also likes {toast.interests.slice(0, 2).join(" & ")}!
              </span>
            </Notification>
          )}
        </Fade>
      </NotificationGroup>

      <div className="flex flex-col gap-3 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Users className="h-4 w-4 text-[var(--color-keppel-400)]" />
            Your matches
          </div>
          <button
            onClick={() => setStep("form")}
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            Edit interests
          </button>
        </div>

        {matches.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            <Lightning className="mx-auto mb-2 h-6 w-6 opacity-30" />
            No matches yet. More attendees are joining.
            <br />
            <span className="text-xs">Checking every 30s…</span>
          </div>
        ) : (
          <div className="space-y-2">
            {matches.map((m) => (
              <div
                key={m.id}
                className="flex items-start gap-3 rounded-lg border border-[var(--color-baltic-sea-800)] bg-[var(--color-baltic-sea-950)] p-3"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-keppel-500)]/15 text-sm font-bold text-[var(--color-keppel-400)]">
                  {m.name[0]?.toUpperCase() || "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{m.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {getLanguage(m.language).flag}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {m.interests.map((i) => (
                      <span
                        key={i}
                        className="rounded-full bg-[var(--color-keppel-500)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--color-keppel-400)]"
                      >
                        {i}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
