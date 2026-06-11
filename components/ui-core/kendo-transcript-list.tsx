"use client"

import { useEffect, useRef } from "react"
import { ListView, ListViewItemProps } from "@progress/kendo-react-listview"
import { Waveform } from "@phosphor-icons/react"

export interface KendoTranscriptEntry {
  original: string
  translated: string
  timestamp: number
  sourceLanguage?: string
}

function formatTime(ts: number) {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  } catch {
    return ""
  }
}

function TranscriptItem(props: ListViewItemProps) {
  const item = props.dataItem as KendoTranscriptEntry
  return (
    <div className="flex flex-col gap-1 border-b border-[var(--color-baltic-sea-800)] px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono uppercase tracking-wide text-[var(--color-keppel-400)]">
          {formatTime(item.timestamp)}
        </span>
        {item.sourceLanguage && (
          <span className="text-[10px] uppercase text-muted-foreground">{item.sourceLanguage}</span>
        )}
      </div>
      <p className="text-sm font-semibold text-[var(--color-baltic-sea-50)] break-words">
        {item.translated}
      </p>
      {item.original && (
        <p className="text-xs italic text-muted-foreground break-words">{item.original}</p>
      )}
    </div>
  )
}

interface KendoTranscriptListProps {
  entries: KendoTranscriptEntry[]
  isWaiting?: boolean
}

export function KendoTranscriptList({ entries, isWaiting }: KendoTranscriptListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [entries.length])

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-[var(--color-baltic-sea-800)] bg-[var(--color-baltic-sea-900)]">
      <div className="flex items-center gap-2 border-b border-[var(--color-baltic-sea-800)] px-4 py-2.5">
        <Waveform className="h-4 w-4 text-[var(--color-keppel-400)]" />
        <span className="text-sm font-medium">Live Transcript</span>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {entries.length === 0 ? (
          <div className="flex h-full min-h-[160px] items-center justify-center px-6 text-center text-sm italic text-muted-foreground">
            {isWaiting
              ? "Waiting for the speaker to start…"
              : "Translations will appear here as the speaker talks."}
          </div>
        ) : (
          <ListView data={entries} item={TranscriptItem} style={{ background: "transparent", border: "none" }} />
        )}
      </div>
    </div>
  )
}
