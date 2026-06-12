"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { MicController, MicControllerHandle } from "@/components/ui-core/mic-controller"
import { LanguageSelector } from "@/components/ui-core/language-selector"
import { TranscriptView, TranscriptEntry } from "@/components/ui-core/transcript-view"
import { Button } from "@/components/ui/button"
import { WebcamBroadcaster, WebcamBroadcasterHandle } from "@/components/ui-core/webcam-broadcaster"
import { SpeakerQuestions } from "@/components/ui-core/speaker-questions"
import { SummaryWindow } from "@/components/ui-core/summary-window"
import { QrShareButton } from "@/components/ui-core/qr-share"
import { DropDownList, DropDownListChangeEvent } from "@progress/kendo-react-dropdowns"
import { EVENT_CONFIG, ConferenceSession } from "@/lib/event-config"
import { useSessions } from "@/hooks/use-sessions"
import { useWebSocket } from "@/hooks/use-websocket"
import { convertLiveTranscriptsToSRT } from "@/lib/srt"
import {
  Microphone,
  Translate,
  SpeakerHigh,
  Lightning,
  Waveform,
  Globe,
  DownloadSimple
} from "@phosphor-icons/react"

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080"

const SETTINGS_KEY = "unison.broadcast.settings"

interface PersistedSettings {
  sessionId?: string
  sourceLanguage?: string
  targetLanguages?: string[]
  targetVoices?: Record<string, string>
}

function loadSettings(): PersistedSettings {
  if (typeof window === "undefined") return {}
  try {
    return JSON.parse(window.localStorage.getItem(SETTINGS_KEY) || "{}")
  } catch {
    return {}
  }
}

export default function AppPage() {
  const { sessions: allSessions } = useSessions()
  // Read any persisted settings once, synchronously, so the first render uses them.
  const initialSettings = useRef<PersistedSettings>(loadSettings())
  const [session, setSession] = useState<ConferenceSession>(EVENT_CONFIG.sessions[0])
  const broadcastId = session.id
  const [sourceLanguage, setSourceLanguage] = useState(initialSettings.current.sourceLanguage ?? "auto")
  const [targetLanguages, setTargetLanguages] = useState<string[]>(initialSettings.current.targetLanguages ?? ["es"])
  const [targetVoices, setTargetVoices] = useState<Record<string, string>>(initialSettings.current.targetVoices ?? {})
  const [isRecording, setIsRecording] = useState(false)
  const [broadcastValidationError, setBroadcastValidationError] = useState<string | null>(null)
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([])
  const [partialTranscript, setPartialTranscript] = useState<{ original: string; translated?: string } | undefined>()
  const [showSummary, setShowSummary] = useState(false)
  const micRef = useRef<MicControllerHandle>(null)
  const webcamRef = useRef<WebcamBroadcasterHandle>(null)

  const handleTranscript = useCallback((entry: TranscriptEntry) => {
    setTranscripts(prev => [...prev, entry])
    setPartialTranscript(undefined)
  }, [])

  // Keep the selected session in sync with the managed list once it loads,
  // preferring the last-used session id from persisted settings.
  useEffect(() => {
    if (allSessions.length === 0) return
    const preferredId = initialSettings.current.sessionId
    setSession((cur) => {
      const wanted = preferredId ?? cur.id
      return allSessions.find((s) => s.id === wanted) || allSessions.find((s) => s.id === cur.id) || allSessions[0]
    })
    // Only honor the persisted id on the first resolution.
    initialSettings.current.sessionId = undefined
  }, [allSessions])

  // Persist settings whenever they change so a reload restores them.
  useEffect(() => {
    if (typeof window === "undefined") return
    const payload: PersistedSettings = {
      sessionId: session.id,
      sourceLanguage,
      targetLanguages,
      targetVoices,
    }
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(payload))
    } catch {
      /* storage may be unavailable (private mode) — ignore */
    }
  }, [session.id, sourceLanguage, targetLanguages, targetVoices])

  const handlePartialTranscript = useCallback((partial: { original: string; translated?: string }) => {
    setPartialTranscript(partial)
  }, [])

  const handleAudioData = useCallback((_audio: ArrayBuffer) => {}, [])

  const handleToggleTargetLanguage = useCallback((lang: string) => {
    setTargetLanguages(prev =>
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    )
    setBroadcastValidationError(null)
  }, [])

  const handleVoiceChange = useCallback((lang: string, voiceId: string) => {
    setTargetVoices(prev => ({ ...prev, [lang]: voiceId }))
  }, [])

  const {
    connect,
    disconnect,
    sendAudio,
    connectionStatus,
    error,
  } = useWebSocket({
    url: WS_URL,
    broadcastId,
    sourceLanguage,
    targetLanguages,
    targetVoices,
    onTranscript: handleTranscript,
    onPartialTranscript: handlePartialTranscript,
    onAudioData: handleAudioData,
  })

  const handleStart = useCallback((sampleRate?: number) => {
    if (targetLanguages.length === 0) {
      setBroadcastValidationError("Please select at least one target language")
      return
    }

    setBroadcastValidationError(null)
    connect(sampleRate)
    setIsRecording(true)
    setTranscripts([])
    setPartialTranscript(undefined)
  }, [connect, targetLanguages])

  const handleStop = useCallback(() => {
    disconnect()
    setIsRecording(false)
    setPartialTranscript(undefined)
  }, [disconnect])

  const handleMicAudioData = useCallback((chunk: ArrayBuffer) => sendAudio(chunk), [sendAudio])

  const handleStartSession = useCallback(() => {
    if (targetLanguages.length === 0) {
      setBroadcastValidationError("Please select at least one target language")
      return
    }
    micRef.current?.start()
  }, [targetLanguages])

  const handleEndSession = useCallback(() => {
    const hadTranscripts = transcripts.length > 0
    // Always tear down the mic + socket, regardless of the mic controller's internal state.
    micRef.current?.stop()
    webcamRef.current?.stop()
    handleStop()
    if (hadTranscripts) {
      setShowSummary(true)
    }
  }, [transcripts, handleStop])

  const handleDownloadSRT = useCallback(() => {
    if (transcripts.length === 0) return;
    const srt = convertLiveTranscriptsToSRT(transcripts.map(t => ({
       original: t.original,
       translated: t.translated,
       timestamp: t.timestamp
    })));
    const blob = new Blob([srt], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `broadcast_subtitles_${targetLanguages.join("_")}.srt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [transcripts, targetLanguages]);

  return (
    <div className="flex-1 w-full bg-background">
      <div className="h-16" />
      <main>
        <section className="py-12 sm:py-16">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-12">
            <div className="flex flex-col gap-6">
              {/* Conference session selector */}
              <div className="w-full rounded-xl border border-[var(--color-baltic-sea-700)] bg-[var(--color-baltic-sea-900)] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="h-4 w-4 text-[var(--color-keppel-400)]" />
                  <span className="text-sm font-medium">Conference Session — {EVENT_CONFIG.name}</span>
                </div>
                <DropDownList
                  data={allSessions.length ? allSessions : EVENT_CONFIG.sessions}
                  textField="name"
                  dataItemKey="id"
                  value={session}
                  disabled={isRecording}
                  onChange={(e: DropDownListChangeEvent) => {
                    if (e.value) setSession(e.value as ConferenceSession)
                  }}
                  style={{ width: "100%" }}
                />
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Speaker: {session.speaker} · {session.startTime}
                  </p>
                  <div className="flex items-center gap-3">
                    {isRecording && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-red-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                        Live
                      </span>
                    )}
                    <QrShareButton session={session} />
                  </div>
                </div>
              </div>

              {/* Row 1: Language Selector (Full Width) */}
              <div className="w-full">
                <LanguageSelector
                  sourceLanguage={sourceLanguage}
                  targetLanguages={targetLanguages}
                  targetVoices={targetVoices}
                  onSourceLanguageChange={setSourceLanguage}
                  onToggleTargetLanguage={handleToggleTargetLanguage}
                  onVoiceChange={handleVoiceChange}
                  disabled={isRecording}
                />
                {error && (
                  <div className="mt-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}
                {broadcastValidationError && (
                  <div className="mt-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-sm text-destructive">{broadcastValidationError}</p>
                  </div>
                )}
                {targetLanguages.length > 0 && (
                  <div className="mt-4 p-4 rounded-lg border bg-muted/20 space-y-2">
                    <p className="text-xs text-muted-foreground">Listener links — share after starting the broadcast</p>
                    <div className="space-y-1">
                      {targetLanguages.map((lang) => (
                        <p key={lang} className="text-sm font-mono break-all">
                          {typeof window !== "undefined" ? `${window.location.origin}/live/${broadcastId}/${lang}` : `/live/${broadcastId}/${lang}`}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Row 2: Video/Mic + Transcript */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Col 1: Video + Mic */}
                <div className="space-y-6">
                  <WebcamBroadcaster
                    ref={webcamRef}
                    wsUrl={WS_URL}
                    broadcastId={broadcastId}
                    canStart={targetLanguages.length > 0}
                    blockedReason="Please select at least one target language"
                  />
                  <MicController
                    ref={micRef}
                    isRecording={isRecording}
                    onStart={handleStart}
                    onStop={handleStop}
                    onAudioData={handleMicAudioData}
                    connectionStatus={connectionStatus}
                    canStart={targetLanguages.length > 0}
                    blockedReason="Please select at least one target language"
                  />
                  {isRecording ? (
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={handleEndSession}
                    >
                      End Session
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      className="w-full"
                      onClick={handleStartSession}
                      disabled={connectionStatus === "connecting"}
                    >
                      Start Session
                    </Button>
                  )}
                </div>

                {/* Col 2: Transcript */}
                <div className="h-full flex flex-col gap-4">
                  <div className="flex justify-between items-center px-2">
                     <h3 className="font-semibold text-lg">Live Transcript</h3>
                     <div className="flex items-center gap-2">
                       <Button 
                           variant="outline" 
                           size="sm" 
                           disabled={transcripts.length === 0}
                           onClick={handleDownloadSRT}
                           className="gap-2"
                       >
                           <DownloadSimple className="h-4 w-4" /> Download .SRT
                       </Button>
                       <Button
                           variant="destructive"
                           size="sm"
                           disabled={!isRecording && transcripts.length === 0}
                           onClick={handleEndSession}
                       >
                           End Session
                       </Button>
                     </div>
                  </div>
                  <TranscriptView
                    entries={transcripts}
                    isListening={isRecording}
                    currentPartial={partialTranscript}
                  />
                  {/* Two-way loop: attendee questions surfaced in English */}
                  <div className="h-[260px]">
                    <SpeakerQuestions sessionId={broadcastId} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      {showSummary && (
        <SummaryWindow
          sessionId={broadcastId}
          sessionName={session.name}
          onClose={() => setShowSummary(false)}
        />
      )}
    </div>
  )
}
