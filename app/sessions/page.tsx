"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { DropDownList } from "@progress/kendo-react-dropdowns"
import { Microphone, Globe, ArrowRight, Clock, CalendarPlus } from "@phosphor-icons/react"
import { EVENT_CONFIG, ConferenceSession, getSessionStatus, SessionStatus } from "@/lib/event-config"
import { TTS_LANGUAGES } from "@/lib/languages"
import { useSessions } from "@/hooks/use-sessions"

interface ServerEventConfig { name: string; date: string; eventDay: string; eventStart?: string; eventEnd?: string }

function useEventConfig() {
  const [config, setConfig] = useState<ServerEventConfig | null>(null)
  useEffect(() => {
    fetch("/api/event-config")
      .then((r) => r.json())
      .then((d) => setConfig(d))
      .catch(() => setConfig(EVENT_CONFIG))
  }, [])
  return config
}

const TRACK_COLORS: Record<string, string> = {
  "Main Stage": "var(--color-keppel-500)",
  Workshop: "#8b5cf6",
  Panel: "#f59e0b",
}

function StatusBadge({ status }: { status: SessionStatus }) {
  if (status === "live") return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-400">
      <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
      Live
    </span>
  )
  if (status === "ended") return (
    <span className="inline-flex items-center rounded-full bg-[var(--color-baltic-sea-800)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-baltic-sea-400)]">
      Ended
    </span>
  )
  return (
    <span className="inline-flex items-center rounded-full bg-[var(--color-baltic-sea-800)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-baltic-sea-300)]">
      Upcoming
    </span>
  )
}


function buildGoogleCalendarUrl(session: ConferenceSession, eventDay: string, listenUrl: string): string {
  const toGCal = (day: string, hhmm: string) =>
    day.replace(/-/g, "") + "T" + hhmm.replace(":", "") + "00"
  const dates =
    toGCal(eventDay, session.startTime || "00:00") +
    "/" +
    toGCal(eventDay, session.endTime || session.startTime || "01:00")
  const origin = typeof window !== "undefined" ? window.location.origin : ""
  const joinUrl = origin + listenUrl
  const details =
    session.speaker +
    (session.description ? "\n\n" + session.description : "") +
    `\n\nJoin session: ${joinUrl}`
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: session.name,
    dates,
    details,
    location: joinUrl,
    ...(session.track ? { trp: "false", sf: "true" } : {}),
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

function AddToCalendarButton({ session, eventDay, listenUrl }: { session: ConferenceSession; eventDay: string; listenUrl: string }) {
  return (
    <a
      href={buildGoogleCalendarUrl(session, eventDay, listenUrl)}
      target="_blank"
      rel="noopener noreferrer"
      title="Add to Google Calendar"
      className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-baltic-sea-700)] bg-transparent px-2.5 py-1.5 text-xs text-[var(--color-baltic-sea-300)] transition-colors hover:border-[var(--color-keppel-500)] hover:text-[var(--color-keppel-400)]"
    >
      <CalendarPlus className="h-3.5 w-3.5" />
      Add to Calendar
    </a>
  )
}

function SessionCard({ session, language, eventDay }: { session: ConferenceSession; language: string; eventDay: string | null }) {
  const trackColor = TRACK_COLORS[session.track || ""] || "var(--color-keppel-500)"
  const listenUrl = `/live/${session.id}/${language}`
  const [status, setStatus] = useState<SessionStatus | null>(null)

  useEffect(() => {
    if (eventDay === null) return
    setStatus(getSessionStatus(session, eventDay))
    const id = setInterval(() => setStatus(getSessionStatus(session, eventDay)), 30_000)
    return () => clearInterval(id)
  }, [session, eventDay])

  const timeRange = session.endTime
    ? `${session.startTime} – ${session.endTime}`
    : session.startTime

  return (
    <div className={`group flex flex-col gap-3 rounded-xl border bg-[var(--color-baltic-sea-900)] p-5 transition-all hover:-translate-y-0.5 ${
      status === "live"
        ? "border-red-500/40 hover:border-red-400/60"
        : status === "ended"
        ? "border-[var(--color-baltic-sea-800)] opacity-60 hover:opacity-80 hover:border-[var(--color-baltic-sea-700)]"
        : "border-[var(--color-baltic-sea-700)] hover:border-[var(--color-keppel-500)]"
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {session.track && (
              <span
                className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                style={{ background: trackColor + "22", color: trackColor }}
              >
                {session.track}
              </span>
            )}
            {status !== null && <StatusBadge status={status} />}
            {session.date && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <CalendarPlus className="h-3 w-3" /> {session.date}
              </span>
            )}
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" /> {timeRange}
            </span>
          </div>
          <h3 className="font-semibold text-[var(--color-baltic-sea-50)] leading-snug">{session.name}</h3>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Microphone className="h-3 w-3 shrink-0" /> {session.speaker}
          </p>
          {session.description && (
            <p className="mt-2 text-sm text-[var(--color-baltic-sea-300)] leading-relaxed line-clamp-2">
              {session.description}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Globe className="h-3.5 w-3.5 text-[var(--color-keppel-400)]" />
          {TTS_LANGUAGES.find((l) => l.code === language)?.flag}{" "}
          {TTS_LANGUAGES.find((l) => l.code === language)?.name}
        </div>
        <div className="flex items-center gap-2">
          {status === "upcoming" && eventDay !== null && (
            <AddToCalendarButton session={session} eventDay={session.date ?? eventDay} listenUrl={listenUrl} />
          )}
          {status === null ? null : status === "ended" ? (
            <span className="text-xs text-[var(--color-baltic-sea-500)]">Session ended</span>
          ) : (
            <Link
              href={listenUrl}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                status === "live"
                  ? "bg-red-500/20 text-red-300 hover:bg-red-500/30"
                  : "bg-[var(--color-keppel-500)] text-[var(--color-keppel-950)] hover:bg-[var(--color-keppel-400)]"
              }`}
            >
              {status === "live" ? "Join Live" : "Join"} <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

export default function SessionsPage() {
  const [language, setLanguage] = useState("en")
  const [search, setSearch] = useState("")
  const { sessions, loading, error, refresh } = useSessions()
  const eventConfig = useEventConfig()

  const filtered = sessions
    .filter(
      (s) =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.speaker.toLowerCase().includes(search.toLowerCase()) ||
        (s.description || "").toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const da = (a.date ?? eventConfig?.eventDay ?? "") + "T" + (a.startTime ?? "")
      const db = (b.date ?? eventConfig?.eventDay ?? "") + "T" + (b.startTime ?? "")
      return da.localeCompare(db)
    })

  const langOptions = TTS_LANGUAGES.map((l) => ({ text: `${l.flag} ${l.name}`, value: l.code }))
  const selectedLang = langOptions.find((l) => l.value === language) || langOptions[0]

  return (
    <div className="min-h-screen bg-background px-4 pb-16 pt-24 md:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-keppel-400)]">
              {eventConfig?.date ?? ""}
            </p>
            <h1 className="text-2xl font-bold tracking-tight">{eventConfig?.name ?? ""}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Browse sessions and join any talk live in your language.
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search sessions or speakers…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-baltic-sea-700)] bg-[var(--color-baltic-sea-950)] px-3 py-2 text-sm outline-none focus:border-[var(--color-keppel-500)]"
            />
          </div>
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 shrink-0 text-[var(--color-keppel-400)]" />
            <DropDownList
              data={langOptions}
              textField="text"
              dataItemKey="value"
              value={selectedLang}
              onChange={(e) => setLanguage(e.value.value)}
              style={{ minWidth: 160 }}
            />
          </div>
        </div>

        {/* Session list */}
        <div className="space-y-4">
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Loading sessions…</div>
          ) : error ? (
            <div className="py-12 text-center">
              <p className="text-sm text-destructive">{error}</p>
              <button onClick={refresh} className="mt-3 text-xs text-[var(--color-keppel-400)] underline underline-offset-2 hover:text-[var(--color-keppel-300)]">
                Retry
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No sessions match your search.</div>
          ) : (
            filtered.map((session) => (
              <SessionCard key={session.id} session={session} language={language} eventDay={eventConfig?.eventDay ?? null} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
