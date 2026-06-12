"use client"

import { useState, useCallback } from "react"
import { QRCodeSVG } from "qrcode.react"
import { Window } from "@progress/kendo-react-dialogs"
import { DropDownList } from "@progress/kendo-react-dropdowns"
import { Button } from "@/components/ui/button"
import { QrCode, Copy, Check, Globe } from "@phosphor-icons/react"
import { TTS_LANGUAGES } from "@/lib/languages"
import type { ConferenceSession } from "@/lib/event-config"

interface QrShareProps {
  session: ConferenceSession
  onClose: () => void
}

export function QrShare({ session, onClose }: QrShareProps) {
  const [language, setLanguage] = useState("en")
  const [copied, setCopied] = useState(false)

  const langOptions = TTS_LANGUAGES.map((l) => ({ text: `${l.flag} ${l.name}`, value: l.code }))
  const selectedLang = langOptions.find((l) => l.value === language) || langOptions[0]

  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/live/${session.id}/${language}`
      : `/live/${session.id}/${language}`

  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [url])

  return (
    <Window
      title={`Share Session Link: ${session.name}`}
      onClose={onClose}
      initialWidth={420}
      initialHeight={560}
      modal
    >
      <div className="flex h-full flex-col items-center gap-5 p-4 text-[var(--color-baltic-sea-100)]">
        <p className="text-center text-sm text-muted-foreground">
          Display this QR on screen so attendees can join in their language.
        </p>

        {/* Language picker */}
        <div className="flex w-full items-center gap-3">
          <Globe className="h-4 w-4 shrink-0 text-[var(--color-keppel-400)]" />
          <span className="text-sm">Language:</span>
          <DropDownList
            data={langOptions}
            textField="text"
            dataItemKey="value"
            value={selectedLang}
            onChange={(e) => setLanguage(e.value.value)}
            style={{ flex: 1 }}
          />
        </div>

        {/* QR code */}
        <div className="rounded-2xl bg-white p-5 shadow-xl">
          <QRCodeSVG
            value={url}
            size={220}
            level="M"
            marginSize={1}
          />
        </div>

        {/* URL copy */}
        <div className="flex w-full items-center gap-2 rounded-lg border border-[var(--color-baltic-sea-700)] bg-[var(--color-baltic-sea-950)] px-3 py-2 text-xs font-mono text-[var(--color-baltic-sea-300)]">
          <span className="flex-1 truncate">{url}</span>
          <button
            onClick={copy}
            className="shrink-0 text-[var(--color-keppel-400)] hover:text-[var(--color-keppel-300)]"
            aria-label="Copy link"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Attendees scan this to join <strong>{session.name}</strong> in{" "}
          <strong>{selectedLang.text}</strong>. Change language above to generate a different QR.
        </p>
      </div>
    </Window>
  )
}

interface QrShareButtonProps {
  session: ConferenceSession
}

export function QrShareButton({ session }: QrShareButtonProps) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        <QrCode className="h-4 w-4" /> Share QR
      </Button>
      {open && <QrShare session={session} onClose={() => setOpen(false)} />}
    </>
  )
}
