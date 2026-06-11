"use client"

import { useEffect, useRef, useState } from "react"
import { ListView, ListViewItemProps } from "@progress/kendo-react-listview"
import { Badge } from "@progress/kendo-react-indicators"
import { Notification, NotificationGroup } from "@progress/kendo-react-notification"
import { Fade } from "@progress/kendo-react-animation"
import { Question } from "@phosphor-icons/react"
import { getLanguage } from "@/lib/languages"

interface QuestionEntry { id: string; t: number; text: string; lang: string }

function QItem(props: ListViewItemProps) {
  const q = props.dataItem as QuestionEntry
  return (
    <div className="flex flex-col gap-1 border-b border-[var(--color-baltic-sea-800)] px-4 py-3">
      <p className="text-sm text-[var(--color-baltic-sea-50)]">{q.text}</p>
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
        <span className="text-[var(--color-keppel-400)]">
          asked in {getLanguage(q.lang).flag} {getLanguage(q.lang).name}
        </span>
        <span>· {new Date(q.t).toLocaleTimeString()}</span>
      </div>
    </div>
  )
}

interface SpeakerQuestionsProps {
  sessionId: string
}

export function SpeakerQuestions({ sessionId }: SpeakerQuestionsProps) {
  const [questions, setQuestions] = useState<QuestionEntry[]>([])
  const [toast, setToast] = useState<QuestionEntry | null>(null)
  const seenIds = useRef<Set<string>>(new Set())
  const initialized = useRef(false)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!sessionId) return
    let active = true
    const poll = async () => {
      try {
        const res = await fetch(`/api/organiser/questions?session=${encodeURIComponent(sessionId)}`, { cache: "no-store" })
        if (!res.ok) return
        const data = await res.json()
        const all: QuestionEntry[] = data.questions || []
        if (!active) return

        // Detect newly arrived questions to surface a toast
        const fresh = all.filter((q) => !seenIds.current.has(q.id))
        all.forEach((q) => seenIds.current.add(q.id))
        if (initialized.current && fresh.length > 0) {
          const latest = fresh[fresh.length - 1]
          setToast(latest)
          if (toastTimer.current) clearTimeout(toastTimer.current)
          toastTimer.current = setTimeout(() => setToast(null), 5000)
        }
        initialized.current = true

        setQuestions(all.slice(-15).reverse())
      } catch { /* ignore */ }
    }
    poll()
    const id = setInterval(poll, 4000)
    return () => {
      active = false
      clearInterval(id)
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
  }, [sessionId])

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-[var(--color-baltic-sea-700)] bg-[var(--color-baltic-sea-900)]">
      <NotificationGroup style={{ position: "fixed", right: 16, bottom: 16, zIndex: 50, alignItems: "flex-end" }}>
        <Fade>
          {toast && (
            <Notification
              type={{ style: "info", icon: true }}
              closable
              onClose={() => setToast(null)}
            >
              <span>New question ({getLanguage(toast.lang).name}): {toast.text}</span>
            </Notification>
          )}
        </Fade>
      </NotificationGroup>
      <div className="flex items-center gap-2 border-b border-[var(--color-baltic-sea-800)] px-4 py-2.5 text-sm font-medium">
        <Question className="h-4 w-4 text-[var(--color-keppel-400)]" />
        Audience Questions
        {questions.length > 0 && (
          <span className="relative ml-auto inline-flex pr-2">
            <Badge themeColor="primary" rounded="full" size="small" position="inside">
              {questions.length}
            </Badge>
          </span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        {questions.length === 0 ? (
          <div className="flex h-full min-h-[120px] items-center justify-center px-6 text-center text-sm italic text-muted-foreground">
            Questions from attendees will appear here, translated to English.
          </div>
        ) : (
          <ListView data={questions} item={QItem} style={{ background: "transparent", border: "none" }} />
        )}
      </div>
    </div>
  )
}
