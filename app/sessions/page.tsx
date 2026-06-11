"use client"

import { useState } from "react"
import Link from "next/link"
import { DropDownList } from "@progress/kendo-react-dropdowns"
import { Microphone, Globe, ArrowRight, Clock, GearSix } from "@phosphor-icons/react"
import { EVENT_CONFIG, ConferenceSession } from "@/lib/event-config"
import { TTS_LANGUAGES } from "@/lib/languages"
import { useSessions } from "@/hooks/use-sessions"

const TRACK_COLORS: Record<string, string> = {
  "Main Stage": "var(--color-keppel-500)",
  Workshop: "#8b5cf6",
  Panel: "#f59e0b",
}

function SessionCard({ session, language }: { session: ConferenceSession; language: string }) {
  const trackColor = TRACK_COLORS[session.track || ""] || "var(--color-keppel-500)"
  const listenUrl = `/live/${session.id}/${language}`

  return (
    <div className="group flex flex-col gap-3 rounded-xl border border-[var(--color-baltic-sea-700)] bg-[var(--color-baltic-sea-900)] p-5 transition-all hover:border-[var(--color-keppel-500)] hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            {session.track && (
              <span
                className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                style={{ background: trackColor + "22", color: trackColor }}
              >
                {session.track}
              </span>
            )}
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" /> {session.startTime}
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
          Listening in {TTS_LANGUAGES.find((l) => l.code === language)?.flag}{" "}
          {TTS_LANGUAGES.find((l) => l.code === language)?.name}
        </div>
        <Link
          href={listenUrl}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-keppel-500)] px-3 py-1.5 text-xs font-semibold text-[var(--color-keppel-950)] transition-colors hover:bg-[var(--color-keppel-400)]"
        >
          Join Live <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  )
}

export default function SessionsPage() {
  const [language, setLanguage] = useState("en")
  const [search, setSearch] = useState("")
  const { sessions, loading } = useSessions()

  const filtered = sessions.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.speaker.toLowerCase().includes(search.toLowerCase()) ||
      (s.description || "").toLowerCase().includes(search.toLowerCase())
  )

  const langOptions = TTS_LANGUAGES.map((l) => ({ text: `${l.flag} ${l.name}`, value: l.code }))
  const selectedLang = langOptions.find((l) => l.value === language) || langOptions[0]

  return (
    <div className="min-h-screen bg-background px-4 pb-16 pt-24 md:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-keppel-400)]">
              {EVENT_CONFIG.date}
            </p>
            <h1 className="text-2xl font-bold tracking-tight">{EVENT_CONFIG.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Browse sessions and join any talk live in your language.
            </p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              Sample schedule for demonstration — speakers and talks are illustrative.
            </p>
          </div>
          <Link
            href="/sessions/manage"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-baltic-sea-700)] px-3 py-2 text-sm font-medium text-[var(--color-baltic-sea-100)] transition-colors hover:border-[var(--color-keppel-500)] hover:text-[var(--color-keppel-400)]"
          >
            <GearSix className="h-4 w-4" /> Manage
          </Link>
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
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No sessions match your search.</div>
          ) : (
            filtered.map((session) => (
              <SessionCard key={session.id} session={session} language={language} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
