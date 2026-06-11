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
import { Grid, GridColumn } from "@progress/kendo-react-grid"
import { ListView, ListViewItemProps } from "@progress/kendo-react-listview"
import { Loader, Skeleton, Badge } from "@progress/kendo-react-indicators"
import { ProgressBar } from "@progress/kendo-react-progressbars"
import { Tooltip } from "@progress/kendo-react-tooltip"
import "hammerjs"
import { getLanguage } from "@/lib/languages"
import { Globe, Users, ChartLine, Question } from "@phosphor-icons/react"

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
  activeLanguages: string[]
  englishListeners: number
  nonEnglishListeners: number
  assumedNonEnglishBaseline: number
  _seeded?: boolean
}

interface QuestionEntry { id: string; t: number; text: string; lang: string }

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

  const authorized = unlocked || keyParam === ACCESS_KEY

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

  if (!authorized) return <PasswordGate onUnlock={() => setUnlocked(true)} />

  const reach = stats?.reachPercentage ?? 0
  const total = stats?.totalListeners ?? 0
  const englishOnly = stats?.englishListeners ?? 0

  return (
    <div className="min-h-screen bg-background px-4 pb-16 pt-24 md:px-8">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-keppel-400)]">
              React Summit / JSNation 2026
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
                <span title={`${reach}% of listeners are served in their own language`}>
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
                With Unison: <span className="font-semibold">{total} of {total}</span> attendees can follow this talk.
              </p>
              <p className="text-xs text-muted-foreground">
                Without Unison: only <span className="font-semibold">{englishOnly} of {total}</span> could.
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
                data: (props: any) => (
                  <td>
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> {props.dataItem.status}
                    </span>
                  </td>
                ),
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
      </div>
    </div>
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
