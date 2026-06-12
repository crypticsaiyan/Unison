"use client"

import { useEffect, useRef, useState } from "react"
import { useParams } from "next/navigation"
import { Broadcast, FileText } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { AudioPlayback, AudioPlaybackHandle } from "@/components/ui-core/audio-playback"
import { VideoReceiver, VideoReceiverRef } from "@/components/ui-core/video-receiver"
import { KendoTranscriptList, KendoTranscriptEntry } from "@/components/ui-core/kendo-transcript-list"
import { SessionInfoCard } from "@/components/ui-core/session-info-card"
import { QaChat } from "@/components/ui-core/qa-chat"
import { AttendeeNetworking } from "@/components/ui-core/attendee-networking"
import { SummaryWindow } from "@/components/ui-core/summary-window"
import { KendoLanguageSelect } from "@/components/ui-core/kendo-language-select"
import { Loader } from "@progress/kendo-react-indicators"
import { TTS_LANGUAGES } from "@/lib/languages"
import { getSessionOrFallback } from "@/lib/event-config"

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080"

interface Message {
  type: string
  original: string
  translated: string
  timestamp: number
  sourceLanguage?: string
  targetLanguage?: string
}

export default function SessionListenerPage() {
  const params = useParams()
  const sessionId = typeof params.sessionId === "string" ? params.sessionId : ""
  const langCode = typeof params.language === "string" ? params.language : "en"
  const session = getSessionOrFallback(sessionId)

  const [hasJoined, setHasJoined] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [isWaiting, setIsWaiting] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [error, setError] = useState<string | null>(null)
  const [attendeeCount, setAttendeeCount] = useState(0)
  const [showSummary, setShowSummary] = useState(false)

  const [audioContext, setAudioContext] = useState<AudioContext | null>(null)
  const videoReceiverRef = useRef<VideoReceiverRef>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const audioPlaybackRef = useRef<AudioPlaybackHandle>(null)
  const ttsMetaRef = useRef<{ sampleRate: number } | null>(null)

  const handleJoin = async () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      await ctx.resume()
      setAudioContext(ctx)
    } catch (e) {
      console.error("AudioContext init failed", e)
    }
    setHasJoined(true)
  }

  // Live attendee count via the organiser stats proxy
  useEffect(() => {
    if (!hasJoined) return
    let active = true
    const poll = async () => {
      try {
        const res = await fetch("/api/organiser/stats", { cache: "no-store" })
        if (!res.ok) return
        const data = await res.json()
        const s = (data.listenersBySession || []).find((x: any) => x.sessionId === sessionId)
        if (active) setAttendeeCount(s?.count ?? 0)
      } catch { /* ignore */ }
    }
    poll()
    const id = setInterval(poll, 5000)
    return () => { active = false; clearInterval(id) }
  }, [hasJoined, sessionId])

  useEffect(() => {
    if (!hasJoined) return

    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    const wsUrl = `${WS_URL}?role=listener&id=${sessionId}&lang=${langCode}`
    const ws = new WebSocket(wsUrl)
    ws.binaryType = "arraybuffer"
    wsRef.current = ws

    ws.onopen = () => { setIsConnected(true); setError(null) }

    ws.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        const sampleRate = ttsMetaRef.current?.sampleRate ?? 24000
        audioPlaybackRef.current?.playPCM(event.data, sampleRate)
        return
      }
      try {
        if (typeof event.data !== "string") return
        const data = JSON.parse(event.data)
        if (data.type === "transcript") {
          setIsWaiting(false)
          setMessages((prev) => {
            // deduplicate: skip if same timestamp+original already present
            if (prev.some((m) => m.timestamp === data.timestamp && m.original === data.original)) return prev
            return [...prev, data]
          })
        } else if (data.type === "info") {
          // Broadcast lifecycle signals from the server.
          const msg = (data.message || "").toLowerCase()
          if (msg.includes("ended")) {
            // Host stopped — drop back to the waiting state.
            setIsWaiting(true)
          } else {
            // "Connected to live broadcast." / "Broadcast has started!"
            setIsWaiting(false)
          }
        } else if (data.type === "tts-start") {
          ttsMetaRef.current = { sampleRate: data.sampleRate ?? 24000 }
        } else if (data.type === "tts-end") {
          ttsMetaRef.current = null
        } else if (data.type === "waiting") {
          setIsWaiting(true)
        } else if (data.type === "error") {
          setError(data.message)
          ws.close()
        }
      } catch (e) {
        console.error("parse error", e)
      }
    }

    ws.onclose = () => setIsConnected(false)
    return () => ws.close()
  }, [sessionId, langCode, hasJoined])

  const entries: KendoTranscriptEntry[] = messages.map((m) => ({
    original: m.original,
    translated: m.translated,
    timestamp: m.timestamp,
    sourceLanguage: m.sourceLanguage,
  }))

  if (!hasJoined) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 pt-20">
        <div className="w-full max-w-md rounded-xl border border-[var(--color-baltic-sea-700)] bg-[var(--color-baltic-sea-900)] p-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-keppel-500)]/15">
            <Broadcast className="h-6 w-6 text-[var(--color-keppel-400)]" weight="fill" />
          </div>
          <h1 className="text-lg font-bold">{session.name}</h1>
          <p className="mb-1 text-sm text-muted-foreground">{session.speaker}</p>
          <p className="mb-5 text-xs text-muted-foreground">
            Choose the language you want to listen in.
          </p>
          <div className="mb-5 text-left">
            <KendoLanguageSelect
              label="Listen in"
              value={langCode}
              languages={TTS_LANGUAGES}
              onChange={(code) => {
                if (code !== langCode) {
                  window.location.href = `/live/${sessionId}/${code}`
                }
              }}
            />
          </div>
          <Button onClick={handleJoin} className="w-full">Join & Enable Audio</Button>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 pt-20">
        <div className="w-full max-w-md rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-center">
          <h1 className="mb-2 text-lg font-bold text-destructive">Session Unavailable</h1>
          <p className="mb-4 text-sm text-destructive/80">{error}</p>
          <Button variant="outline" onClick={() => window.location.reload()} className="w-full">Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background px-4 pb-10 pt-20 md:px-8 md:pt-24">
      <div className="mx-auto max-w-[1400px] space-y-8">
        
        {/* Session Info Header */}
        <div className="rounded-2xl border border-[var(--color-baltic-sea-800)] bg-[var(--color-baltic-sea-900)]/50 backdrop-blur-sm p-2 shadow-lg">
          <SessionInfoCard
            session={session}
            language={langCode}
            attendeeCount={attendeeCount}
            isLive={isConnected && messages.length > 0}
          />
        </div>

        <div className="grid gap-8 lg:grid-cols-12">
          
          {/* Left Column: Video + transcript */}
          <div className="flex flex-col gap-6 lg:col-span-8">
            {isWaiting ? (
              <div className="flex aspect-video w-full flex-col items-center justify-center rounded-2xl border border-[var(--color-baltic-sea-800)] bg-black text-muted-foreground/60 shadow-xl overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-baltic-sea-950)] to-transparent opacity-50" />
                <Loader size="large" type="pulsing" themeColor="primary" />
                <span className="mt-4 text-sm font-medium tracking-wide">Waiting for the broadcast to begin...</span>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-[var(--color-baltic-sea-800)] shadow-xl bg-black">
                <VideoReceiver
                  ref={videoReceiverRef}
                  wsUrl={WS_URL}
                  broadcastId={sessionId}
                  delayMs={0}
                  startRendering={isConnected}
                />
              </div>
            )}
            
            <div className="flex-1 min-h-[350px] rounded-2xl border border-[var(--color-baltic-sea-800)] bg-[var(--color-baltic-sea-900)]/50 backdrop-blur-sm shadow-lg overflow-hidden flex flex-col">
              <div className="p-4 border-b border-[var(--color-baltic-sea-800)] bg-black/20 flex items-center gap-2">
                <Broadcast className="h-5 w-5 text-[var(--color-keppel-400)]" />
                <h3 className="font-semibold text-sm">Live Translation</h3>
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-auto gap-1.5"
                  onClick={() => setShowSummary(true)}
                >
                  <FileText className="h-4 w-4" /> Summary
                </Button>
              </div>
              <div className="flex-1 overflow-hidden p-0">
                <KendoTranscriptList entries={entries} isWaiting={isWaiting} />
              </div>
            </div>
          </div>

          {/* Right Column: Q&A + Networking panel */}
          <div className="flex flex-col gap-6 lg:col-span-4">
            <div className="flex-1 min-h-[400px] rounded-2xl border border-[var(--color-baltic-sea-800)] bg-[var(--color-baltic-sea-900)]/50 backdrop-blur-sm shadow-lg overflow-hidden flex flex-col">
               <div className="p-4 border-b border-[var(--color-baltic-sea-800)] bg-black/20 flex items-center gap-2">
                <h3 className="font-semibold text-sm">Audience Q&A</h3>
              </div>
              <div className="flex-1 overflow-hidden">
                <QaChat sessionId={sessionId} language={langCode} />
              </div>
            </div>
            
            <div className="shrink-0 rounded-2xl border border-[var(--color-baltic-sea-800)] bg-[var(--color-baltic-sea-900)]/50 backdrop-blur-sm shadow-lg overflow-hidden flex flex-col">
              <div className="p-4 border-b border-[var(--color-baltic-sea-800)] bg-black/20 flex items-center gap-2">
                <h3 className="font-semibold text-sm">Networking</h3>
              </div>
              <div className="max-h-[320px] overflow-y-auto">
                <AttendeeNetworking sessionId={sessionId} language={langCode} />
              </div>
            </div>
          </div>
        </div>

        <div className="hidden">
          <AudioPlayback
            ref={audioPlaybackRef}
            audioQueue={[]}
            onAudioPlayed={() => {}}
            isEnabled={true}
            audioContext={audioContext}
            recordingDestination={null}
          />
        </div>
      </div>

      {showSummary && (
        <SummaryWindow
          sessionId={sessionId}
          sessionName={session.name}
          onClose={() => setShowSummary(false)}
        />
      )}
    </div>
  )
}
