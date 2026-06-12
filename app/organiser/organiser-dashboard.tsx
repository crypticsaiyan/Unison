"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import {
  Chart,
  ChartSeries,
  ChartSeriesItem,
  ChartCategoryAxis,
  ChartCategoryAxisItem,
  ChartValueAxis,
  ChartValueAxisItem,
  ChartLegend,
  ChartTitle,
} from "@progress/kendo-react-charts"
import { RadialGauge } from "@progress/kendo-react-gauges"
import { Grid, GridColumn, GridToolbar } from "@progress/kendo-react-grid"
import { Dialog, DialogActionsBar } from "@progress/kendo-react-dialogs"
import { DropDownList } from "@progress/kendo-react-dropdowns"
import { ListView, ListViewItemProps } from "@progress/kendo-react-listview"
import { Loader, Skeleton, Badge } from "@progress/kendo-react-indicators"
import { ProgressBar } from "@progress/kendo-react-progressbars"
import { Tooltip } from "@progress/kendo-react-tooltip"
import "hammerjs"
import { getLanguage } from "@/lib/languages"
import { Globe, Users, ChartLine, Question, GearSix, FloppyDisk, CalendarBlank, Plus, PencilSimple, Trash } from "@phosphor-icons/react"
import { useSessions } from "@/hooks/use-sessions"
import type { ConferenceSession } from "@/lib/event-config"

const ACCESS_KEY = "demo"
const KEPPEL = ["#3fbfb0", "#5fd0c2", "#2f9e91", "#8fe0d6", "#1f6b63", "#b9ece5"]

interface Stats {
  totalListeners: number
  listenersByLanguage: { language: string; count: number }[]
  listenersBySession: {
    sessionId: string
    name: string
    count: number
    peak: number
    languages: string[]
    history: number[]
    status: string
  }[]
  reachPercentage: number
  languagesServed?: number
  languagesOffered?: number
  activeLanguages: string[]
  englishListeners: number
  nonEnglishListeners: number
  assumedNonEnglishBaseline: number
  _seeded?: boolean
}

interface QuestionEntry { id: string; t: number; text: string; lang: string }
interface EventConfig { name: string; date: string; eventDay: string; eventStart?: string; eventEnd?: string }

function QuestionItem(props: ListViewItemProps) {
  const q = props.dataItem as QuestionEntry
  return (
    <div className="flex flex-col gap-1 border-b border-[var(--color-baltic-sea-800)] px-4 py-3">
      <p className="text-sm text-[var(--color-baltic-sea-50)]">{q.text}</p>
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
        <span className="text-[var(--color-keppel-400)]">{getLanguage(q.lang).flag} {getLanguage(q.lang).name}</span>
        <span>· {new Date(q.t).toLocaleTimeString()}</span>
      </div>
    </div>
  )
}

function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [val, setVal] = useState("")
  return (
    <div className="flex min-h-screen items-center justify-center px-4 pt-16">
      <div className="w-full max-w-sm rounded-xl border border-[var(--color-baltic-sea-700)] bg-[var(--color-baltic-sea-900)] p-6">
        <h1 className="mb-1 text-lg font-bold">Organiser Dashboard</h1>
        <p className="mb-4 text-sm text-muted-foreground">Enter the access key to continue.</p>
        <input
          type="password"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && val === ACCESS_KEY) onUnlock() }}
          placeholder="Access key"
          className="mb-3 w-full rounded-lg border border-[var(--color-baltic-sea-700)] bg-[var(--color-baltic-sea-950)] px-3 py-2 text-sm outline-none focus:border-[var(--color-keppel-500)]"
        />
        <button
          onClick={() => val === ACCESS_KEY && onUnlock()}
          className="w-full rounded-lg bg-[var(--color-keppel-500)] px-4 py-2 text-sm font-semibold text-[var(--color-keppel-950)] hover:bg-[var(--color-keppel-400)]"
        >
          Unlock
        </button>
        <p className="mt-3 text-center text-xs text-muted-foreground">Hint: append <code>?key=demo</code> to the URL.</p>
      </div>
    </div>
  )
}

export default function OrganiserDashboard() {
  const searchParams = useSearchParams()
  const keyParam = searchParams.get("key")
  const demoParam = searchParams.get("demo") === "1"
  const [unlocked, setUnlocked] = useState(false)
  const [stats, setStats] = useState<Stats | null>(null)
  const [questions, setQuestions] = useState<QuestionEntry[]>([])
  const [error, setError] = useState(false)
  const today = new Date().toISOString().slice(0, 10)
  const [eventConfig, setEventConfig] = useState<EventConfig>({ name: "", date: "", eventDay: today, eventStart: today, eventEnd: today })
  const [eventConfigSaving, setEventConfigSaving] = useState(false)
  const [eventConfigSaved, setEventConfigSaved] = useState(false)
  const { sessions, loading: sessionsLoading, error: sessionsError, refresh: refreshSessions, createSession, updateSession, deleteSession } = useSessions()
  const [editing, setEditing] = useState<Partial<ConferenceSession> | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<ConferenceSession | null>(null)
  const [sessionSaving, setSessionSaving] = useState(false)

  const authorized = unlocked || keyParam === ACCESS_KEY

  useEffect(() => {
    if (!authorized) return
    fetch("/api/event-config", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setEventConfig(d))
      .catch(() => {})
  }, [authorized])

  const saveEventConfig = useCallback(async () => {
    setEventConfigSaving(true)
    try {
      await fetch("/api/event-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventConfig),
      })
      setEventConfigSaved(true)
      setTimeout(() => setEventConfigSaved(false), 2000)
    } finally {
      setEventConfigSaving(false)
    }
  }, [eventConfig])

  const EMPTY_SESSION: Partial<ConferenceSession> = { name: "", speaker: "", startTime: "", endTime: "", track: "Main Stage", description: "" }

  const saveSession = useCallback(async () => {
    if (!editing?.name?.trim()) return
    setSessionSaving(true)
    if (editing.id) await updateSession(editing.id, editing)
    else await createSession(editing)
    setSessionSaving(false)
    setEditing(null)
  }, [editing, createSession, updateSession])

  const doDelete = useCallback(async () => {
    if (confirmDelete) await deleteSession(confirmDelete.id)
    setConfirmDelete(null)
  }, [confirmDelete, deleteSession])

  const fetchQuestions = useCallback(async (sessionId: string) => {
    try {
      const qres = await fetch(`/api/organiser/questions?session=${sessionId}`, { cache: "no-store" })
      if (qres.ok) {
        const qd = await qres.json()
        setQuestions((qd.questions || []).slice(-10).reverse())
      }
    } catch { /* questions are optional */ }
  }, [])

  useEffect(() => {
    if (!authorized) return
    const url = `/api/organiser/stream${demoParam ? "?demo=1" : ""}`
    const es = new EventSource(url)
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        setStats(data)
        setError(false)
        const liveSession = data.listenersBySession?.[0]?.sessionId
        if (liveSession) fetchQuestions(liveSession)
      } catch { /* ignore parse errors */ }
    }
    es.onerror = () => setError(true)
    return () => es.close()
  }, [authorized, demoParam, fetchQuestions])

  const donutData = useMemo(() => {
    if (!stats) return []
    return stats.listenersByLanguage.map((l) => ({
      category: getLanguage(l.language).name,
      value: l.count,
    }))
  }, [stats])

  const breakdownLabel = useMemo(() => {
    if (!stats || stats.totalListeners === 0) return ""
    return stats.listenersByLanguage
      .slice(0, 4)
      .map((l) => `${Math.round((l.count / stats.totalListeners) * 100)}% ${getLanguage(l.language).name}`)
      .join(" · ")
  }, [stats])

  const lineCategories = useMemo(() => {
    const maxLen = Math.max(0, ...(stats?.listenersBySession.map((s) => s.history.length) || [0]))
    return Array.from({ length: maxLen }, (_, i) => `-${(maxLen - i - 1) * 5}s`)
  }, [stats])

  // Sessions sorted chronologically. Undated sessions inherit the event day so
  // they interleave correctly with dated ones instead of clumping at one end.
  const sortedSessions = useMemo(() => {
    const fallbackDay = eventConfig.eventStart || eventConfig.eventDay || ""
    const effectiveDate = (s: ConferenceSession) => s.date || fallbackDay
    return [...sessions]
      .map((s) => ({ ...s, _effectiveDate: effectiveDate(s) }))
      .sort((a, b) => {
        const da = `${a._effectiveDate}T${a.startTime ?? ""}`
        const db = `${b._effectiveDate}T${b.startTime ?? ""}`
        return da.localeCompare(db)
      })
  }, [sessions, eventConfig.eventStart, eventConfig.eventDay])

  if (!authorized) return <PasswordGate onUnlock={() => setUnlocked(true)} />

  const reach = stats?.reachPercentage ?? 0
  const total = stats?.totalListeners ?? 0
  const englishOnly = stats?.englishListeners ?? 0
  const langsServed = stats?.languagesServed ?? 0
  const langsOffered = stats?.languagesOffered ?? 0

  return (
    <>
    <div className="min-h-screen bg-background px-4 pb-16 pt-24 md:px-8">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-keppel-400)]">
              {eventConfig.name || "Organiser Dashboard"}
            </p>
            <h1 className="text-2xl font-bold tracking-tight">Organiser Dashboard</h1>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className={`h-2 w-2 rounded-full ${error ? "bg-yellow-500" : "bg-green-500 animate-pulse"}`} />
            {error ? "Reconnecting…" : "Live · updating every 5s"}
            {stats?._seeded && <span className="ml-2 rounded bg-[var(--color-baltic-sea-800)] px-2 py-0.5">demo data</span>}
          </div>
        </div>

        {!stats ? (
          <DashboardSkeleton />
        ) : (
        <>
        {/* Hero + Donut */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Reach hero */}
          <div className="rounded-xl border border-[var(--color-baltic-sea-700)] bg-[var(--color-baltic-sea-900)] p-6 lg:col-span-1">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Globe className="h-4 w-4 text-[var(--color-keppel-400)]" /> Language reach
            </div>
            <div className="flex items-center justify-center">
              <Tooltip anchorElement="target" position="top">
                <span title={`${langsServed} of ${langsOffered} offered languages had listeners`}>
                  <RadialGauge
                    pointer={{ value: reach }}
                    scale={{
                      min: 0,
                      max: 100,
                      majorUnit: 20,
                      rangeSize: 8,
                      ranges: [
                        { from: 0, to: 50, color: "#7a4a4a" },
                        { from: 50, to: 80, color: "#b8a05f" },
                        { from: 80, to: 100, color: "#3fbfb0" },
                      ],
                    }}
                  />
                </span>
              </Tooltip>
            </div>
            <div className="mt-2 text-center">
              <div className="text-4xl font-bold text-[var(--color-keppel-400)]">{reach}%</div>
              <p className="mt-2 text-sm text-[var(--color-baltic-sea-100)]">
                <span className="font-semibold">{langsServed} of {langsOffered}</span> offered languages reached an attendee.
              </p>
              <p className="text-xs text-muted-foreground">
                Without Unison: only <span className="font-semibold">{englishOnly} of {total}</span> attendees could follow along.
              </p>
            </div>
          </div>

          {/* Donut */}
          <div className="rounded-xl border border-[var(--color-baltic-sea-700)] bg-[var(--color-baltic-sea-900)] p-6 lg:col-span-2">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Users className="h-4 w-4 text-[var(--color-keppel-400)]" /> Live language distribution
            </div>
            {donutData.length > 0 ? (
              <Chart style={{ height: 280 }} seriesColors={KEPPEL}>
                <ChartLegend position="right" />
                <ChartSeries>
                  <ChartSeriesItem
                    type="donut"
                    data={donutData}
                    categoryField="category"
                    field="value"
                  >
                  </ChartSeriesItem>
                </ChartSeries>
              </Chart>
            ) : (
              <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">No listeners yet.</div>
            )}
            {breakdownLabel && (
              <p className="mt-2 text-center text-sm font-medium text-[var(--color-baltic-sea-100)]">{breakdownLabel}</p>
            )}
            {/* Per-language reach bars (Kendo ProgressBar) */}
            {stats && stats.totalListeners > 0 && (
              <div className="mt-4 space-y-2">
                {stats.listenersByLanguage.slice(0, 5).map((l) => {
                  const pct = Math.round((l.count / stats.totalListeners) * 100)
                  return (
                    <div key={l.language} className="flex items-center gap-3">
                      <span className="w-24 shrink-0 text-xs text-muted-foreground">
                        {getLanguage(l.language).flag} {getLanguage(l.language).name}
                      </span>
                      <ProgressBar
                        value={pct}
                        labelVisible={false}
                        style={{ flex: 1 }}
                        progressStyle={{ background: "var(--color-keppel-500)" }}
                      />
                      <span className="w-10 shrink-0 text-right text-xs font-medium">{pct}%</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Line chart */}
        <div className="rounded-xl border border-[var(--color-baltic-sea-700)] bg-[var(--color-baltic-sea-900)] p-6">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <ChartLine className="h-4 w-4 text-[var(--color-keppel-400)]" /> Listeners over time
          </div>
          <Chart style={{ height: 260 }} seriesColors={KEPPEL}>
            <ChartTitle text="" />
            <ChartLegend position="bottom" />
            <ChartCategoryAxis>
              <ChartCategoryAxisItem categories={lineCategories} />
            </ChartCategoryAxis>
            <ChartValueAxis>
              <ChartValueAxisItem min={0} />
            </ChartValueAxis>
            <ChartSeries>
              {stats?.listenersBySession.map((s) => (
                <ChartSeriesItem key={s.sessionId} type="line" data={s.history} name={s.name} />
              ))}
            </ChartSeries>
          </Chart>
        </div>

        {/* Sessions grid */}
        <div className="rounded-xl border border-[var(--color-baltic-sea-700)] bg-[var(--color-baltic-sea-900)] p-1">
          <Grid data={stats?.listenersBySession || []} style={{ background: "transparent" }}>
            <GridColumn field="name" title="Session" />
            <GridColumn field="count" title="Active Listeners" width="150px" />
            <GridColumn
              title="Languages in Use"
              cells={{
                data: (props: any) => (
                  <td>{(props.dataItem.languages || []).map((l: string) => getLanguage(l).flag).join(" ")}</td>
                ),
              }}
            />
            <GridColumn field="peak" title="Peak Listeners" width="150px" />
            <GridColumn
              title="Status"
              width="120px"
              cells={{
                data: (props: any) => {
                  const live = props.dataItem.status === "live"
                  return (
                    <td>
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${live ? "text-green-400" : "text-muted-foreground"}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${live ? "bg-green-500" : "bg-muted-foreground"}`} /> {props.dataItem.status}
                      </span>
                    </td>
                  )
                },
              }}
            />
          </Grid>
        </div>

        {/* Questions */}
        <div className="rounded-xl border border-[var(--color-baltic-sea-700)] bg-[var(--color-baltic-sea-900)]">
          <div className="flex items-center gap-2 border-b border-[var(--color-baltic-sea-800)] px-4 py-3 text-sm font-medium text-muted-foreground">
            <Question className="h-4 w-4 text-[var(--color-keppel-400)]" /> Recent attendee questions
            {questions.length > 0 && (
              <span className="relative ml-2 inline-flex">
                <Badge themeColor="primary" rounded="full" size="small" position="inside">
                  {questions.length}
                </Badge>
              </span>
            )}
          </div>
          {questions.length > 0 ? (
            <ListView data={questions} item={QuestionItem} style={{ background: "transparent", border: "none" }} />
          ) : (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">No questions yet.</div>
          )}
        </div>
        </>
        )}

        {/* Session Management — always visible once authorized */}
        <div className="rounded-xl border border-[var(--color-baltic-sea-700)] bg-[var(--color-baltic-sea-900)]">
          <div className="flex items-center justify-between gap-2 border-b border-[var(--color-baltic-sea-800)] px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <CalendarBlank className="h-4 w-4 text-[var(--color-keppel-400)]" /> Session Schedule
            </div>
            <button
              onClick={() => setEditing({ ...EMPTY_SESSION, date: eventConfig.eventStart || eventConfig.eventDay || "" })}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-keppel-500)] px-3 py-1.5 text-xs font-semibold text-[var(--color-keppel-950)] hover:bg-[var(--color-keppel-400)]"
            >
              <Plus className="h-3.5 w-3.5" /> Add Session
            </button>
          </div>
          {sessionsError && (
            <div className="mx-4 mt-3 flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {sessionsError}
              <button onClick={refreshSessions} className="ml-4 text-xs underline underline-offset-2 opacity-80 hover:opacity-100">Retry</button>
            </div>
          )}
          <div className="p-1">
            <Grid data={sortedSessions} style={{ background: "transparent" }}>
              <GridToolbar>
                <span className="px-2 text-sm text-muted-foreground">
                  {sessionsLoading ? "Loading…" : `${sessions.length} session${sessions.length === 1 ? "" : "s"}`}
                </span>
              </GridToolbar>
              <GridColumn
                field="date"
                title="Date"
                width="130px"
                cells={{ data: (props: any) => {
                  const s = props.dataItem as ConferenceSession
                  const inherited = !s.date
                  const shown = s.date || eventConfig.eventStart || eventConfig.eventDay || "—"
                  return (
                    <td>
                      <span className={inherited ? "text-muted-foreground italic" : ""}>
                        {shown}{inherited ? " (event day)" : ""}
                      </span>
                    </td>
                  )
                }}}
              />
              <GridColumn field="startTime" title="Start" width="75px" />
              <GridColumn field="endTime" title="End" width="75px" />
              <GridColumn field="name" title="Session" />
              <GridColumn field="speaker" title="Speaker" />
              <GridColumn field="track" title="Track" width="120px" />
              <GridColumn
                title="Actions"
                width="100px"
                cells={{ data: (props: any) => (
                  <td>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          const { _effectiveDate, ...item } = props.dataItem as any
                          if (!item.date) item.date = eventConfig.eventStart || eventConfig.eventDay || ""
                          setEditing(item)
                        }}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-[var(--color-baltic-sea-800)] hover:text-[var(--color-keppel-400)]"
                        aria-label="Edit"
                      >
                        <PencilSimple className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(props.dataItem)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-[var(--color-baltic-sea-800)] hover:text-destructive"
                        aria-label="Delete"
                      >
                        <Trash className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                )}}
              />
            </Grid>
          </div>
        </div>

        {/* Event Settings — always visible once authorized */}
        <div className="rounded-xl border border-[var(--color-baltic-sea-700)] bg-[var(--color-baltic-sea-900)]">
          <div className="flex items-center gap-2 border-b border-[var(--color-baltic-sea-800)] px-4 py-3 text-sm font-medium text-muted-foreground">
            <GearSix className="h-4 w-4 text-[var(--color-keppel-400)]" /> Event Settings
          </div>
          <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--color-baltic-sea-300)]">Event name</label>
              <input
                type="text"
                value={eventConfig.name}
                onChange={(e) => setEventConfig((c) => ({ ...c, name: e.target.value }))}
                placeholder="Tech Conference 2026"
                className="rounded-lg border border-[var(--color-baltic-sea-700)] bg-[var(--color-baltic-sea-950)] px-3 py-2 text-sm outline-none focus:border-[var(--color-keppel-500)]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--color-baltic-sea-300)]">Date label</label>
              <input
                type="text"
                value={eventConfig.date}
                onChange={(e) => setEventConfig((c) => ({ ...c, date: e.target.value }))}
                placeholder="June 2026 · Amsterdam"
                className="rounded-lg border border-[var(--color-baltic-sea-700)] bg-[var(--color-baltic-sea-950)] px-3 py-2 text-sm outline-none focus:border-[var(--color-keppel-500)]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--color-baltic-sea-300)]">Event start date</label>
              <input
                type="date"
                value={eventConfig.eventStart ?? eventConfig.eventDay}
                onChange={(e) => setEventConfig((c) => ({ ...c, eventStart: e.target.value, eventDay: e.target.value }))}
                className="rounded-lg border border-[var(--color-baltic-sea-700)] bg-[var(--color-baltic-sea-950)] px-3 py-2 text-sm outline-none focus:border-[var(--color-keppel-500)]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--color-baltic-sea-300)]">Event end date</label>
              <input
                type="date"
                value={eventConfig.eventEnd ?? eventConfig.eventStart ?? eventConfig.eventDay}
                onChange={(e) => setEventConfig((c) => ({ ...c, eventEnd: e.target.value }))}
                className="rounded-lg border border-[var(--color-baltic-sea-700)] bg-[var(--color-baltic-sea-950)] px-3 py-2 text-sm outline-none focus:border-[var(--color-keppel-500)]"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-[var(--color-baltic-sea-800)] px-4 py-3">
            {eventConfigSaved && (
              <span className="text-xs text-[var(--color-keppel-400)]">Saved</span>
            )}
            <button
              onClick={saveEventConfig}
              disabled={eventConfigSaving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-keppel-500)] px-4 py-2 text-sm font-semibold text-[var(--color-keppel-950)] transition-colors hover:bg-[var(--color-keppel-400)] disabled:opacity-50"
            >
              <FloppyDisk className="h-4 w-4" />
              {eventConfigSaving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>

    {/* Add / Edit session dialog */}

    {editing && (
      <Dialog
        title={editing.id ? "Edit Session" : "Add Session"}
        onClose={() => setEditing(null)}
        width={480}
      >
        <div className="flex flex-col gap-4 py-1">
          <SessionField label="Session name *">
            <input
              value={editing.name || ""}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              placeholder="Keynote: The Future of React"
              className={sessionInputCls}
            />
          </SessionField>
          <SessionField label="Speaker">
            <input
              value={editing.speaker || ""}
              onChange={(e) => setEditing({ ...editing, speaker: e.target.value })}
              placeholder="Jane Doe · Acme"
              className={sessionInputCls}
            />
          </SessionField>
          <div className="grid grid-cols-2 gap-4">
            <SessionField label="Start time">
              <input
                value={editing.startTime || ""}
                onChange={(e) => setEditing({ ...editing, startTime: e.target.value })}
                placeholder="09:30"
                className={sessionInputCls}
              />
            </SessionField>
            <SessionField label="End time">
              <input
                value={editing.endTime || ""}
                onChange={(e) => setEditing({ ...editing, endTime: e.target.value })}
                placeholder="10:15"
                className={sessionInputCls}
              />
            </SessionField>
          </div>
          <SessionField label="Session date (overrides event day)">
            <input
              type="date"
              value={editing.date || ""}
              onChange={(e) => setEditing({ ...editing, date: e.target.value || undefined })}
              className={sessionInputCls}
            />
          </SessionField>
          <div className="grid grid-cols-2 gap-4">
            <SessionField label="Track">
              <DropDownList
                data={SESSION_TRACKS}
                value={editing.track || "Main Stage"}
                onChange={(e) => setEditing({ ...editing, track: e.value })}
                style={{ width: "100%" }}
              />
            </SessionField>
          </div>
          <SessionField label="Description">
            <textarea
              value={editing.description || ""}
              onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              placeholder="A short summary of the talk…"
              rows={3}
              className={sessionInputCls + " resize-none"}
            />
          </SessionField>
        </div>
        <DialogActionsBar>
          <button
            onClick={() => setEditing(null)}
            className="rounded-lg border border-[var(--color-baltic-sea-700)] px-4 py-2 text-sm font-medium text-[var(--color-baltic-sea-100)] hover:bg-[var(--color-baltic-sea-800)]"
          >
            Cancel
          </button>
          <button
            onClick={saveSession}
            disabled={sessionSaving || !editing.name?.trim()}
            className="rounded-lg bg-[var(--color-keppel-500)] px-4 py-2 text-sm font-semibold text-[var(--color-keppel-950)] hover:bg-[var(--color-keppel-400)] disabled:opacity-50"
          >
            {sessionSaving ? "Saving…" : editing.id ? "Save changes" : "Add session"}
          </button>
        </DialogActionsBar>
      </Dialog>
    )}

    {/* Delete confirm dialog */}
    {confirmDelete && (
      <Dialog title="Delete session?" onClose={() => setConfirmDelete(null)} width={400}>
        <p className="py-2 text-sm text-[var(--color-baltic-sea-200)]">
          Remove <span className="font-semibold">{confirmDelete.name}</span> from the schedule? This can't be undone.
        </p>
        <DialogActionsBar>
          <button
            onClick={() => setConfirmDelete(null)}
            className="rounded-lg border border-[var(--color-baltic-sea-700)] px-4 py-2 text-sm font-medium text-[var(--color-baltic-sea-100)] hover:bg-[var(--color-baltic-sea-800)]"
          >
            Cancel
          </button>
          <button
            onClick={doDelete}
            className="rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-white hover:bg-destructive/80"
          >
            Delete
          </button>
        </DialogActionsBar>
      </Dialog>
    )}
    </>
  )
}

const SESSION_TRACKS = ["Main Stage", "Workshop", "Panel", "Lightning Talk"]
const sessionInputCls = "w-full rounded-lg border border-[var(--color-baltic-sea-700)] bg-[var(--color-baltic-sea-950)] px-3 py-2 text-sm outline-none focus:border-[var(--color-keppel-500)]"

function SessionField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-[var(--color-baltic-sea-700)] bg-[var(--color-baltic-sea-900)] p-6">
          <div className="flex flex-col items-center gap-4 py-6">
            <Loader size="large" type="converging-spinner" themeColor="primary" />
            <span className="text-sm text-muted-foreground">Loading live stats…</span>
          </div>
        </div>
        <div className="rounded-xl border border-[var(--color-baltic-sea-700)] bg-[var(--color-baltic-sea-900)] p-6 lg:col-span-2">
          <Skeleton shape="text" style={{ width: "40%", height: 16, marginBottom: 16 }} />
          <Skeleton shape="rectangle" style={{ width: "100%", height: 240 }} />
        </div>
      </div>
      <div className="rounded-xl border border-[var(--color-baltic-sea-700)] bg-[var(--color-baltic-sea-900)] p-6">
        <Skeleton shape="text" style={{ width: "30%", height: 16, marginBottom: 16 }} />
        <Skeleton shape="rectangle" style={{ width: "100%", height: 220 }} />
      </div>
      <div className="rounded-xl border border-[var(--color-baltic-sea-700)] bg-[var(--color-baltic-sea-900)] p-6 space-y-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} shape="rectangle" style={{ width: "100%", height: 32 }} />
        ))}
      </div>
    </div>
  )
}
