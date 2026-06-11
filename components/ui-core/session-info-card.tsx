"use client"

import { Card, CardBody } from "@progress/kendo-react-layout"
import { Broadcast, Microphone, Users, Globe } from "@phosphor-icons/react"
import { getLanguage } from "@/lib/languages"
import type { ConferenceSession } from "@/lib/event-config"

interface SessionInfoCardProps {
  session: ConferenceSession
  language: string
  attendeeCount: number
  isLive?: boolean
}

export function SessionInfoCard({ session, language, attendeeCount, isLive }: SessionInfoCardProps) {
  const lang = getLanguage(language)

  return (
    <Card className="w-full" style={{ background: "var(--color-baltic-sea-900)", borderColor: "var(--color-baltic-sea-700)" }}>
      <CardBody>
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-keppel-500)]/15">
                <Broadcast className="h-5 w-5 text-[var(--color-keppel-400)]" weight="fill" />
              </div>
              <div>
                <h2 className="text-base font-bold leading-tight text-[var(--color-baltic-sea-50)]">
                  {session.name}
                </h2>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Microphone className="h-3 w-3" /> {session.speaker}
                  {session.startTime && <span className="opacity-60">· {session.startTime}</span>}
                </p>
              </div>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                isLive
                  ? "bg-green-500/15 text-green-400"
                  : "bg-[var(--color-baltic-sea-800)] text-muted-foreground"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${isLive ? "bg-green-500 animate-pulse" : "bg-gray-500"}`} />
              {isLive ? "Live" : "Waiting"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-[var(--color-baltic-sea-800)] pt-3">
            <div className="flex items-center gap-2 text-sm">
              <Globe className="h-4 w-4 text-[var(--color-keppel-400)]" />
              <span className="text-muted-foreground">Your language:</span>
              <span className="font-medium">{lang.flag} {lang.name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-[var(--color-keppel-400)]" />
              <span className="text-muted-foreground">Listening now:</span>
              <span className="font-medium">{attendeeCount}</span>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}
