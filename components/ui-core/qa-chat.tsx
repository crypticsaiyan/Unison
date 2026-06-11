"use client"

import { useState, useCallback } from "react"
import { Chat, ChatSendMessageEvent, Message } from "@progress/kendo-react-conversational-ui"
import { ChatCircleDots, CaretRight } from "@phosphor-icons/react"
import { getLanguage } from "@/lib/languages"

const ATTENDEE = { id: 1, name: "You" }
const BOT = { id: 0, name: "Unison AI" }

interface QaChatProps {
  sessionId: string
  language: string
}

export function QaChat({ sessionId, language }: QaChatProps) {
  const [open, setOpen] = useState(true)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      author: BOT,
      timestamp: new Date(),
      text: `Ask a question in ${getLanguage(language).name}. I'll answer based on what the speaker has said.`,
    },
  ])
  const [loading, setLoading] = useState(false)

  const handleSend = useCallback(
    async (event: ChatSendMessageEvent) => {
      const userText = event.message.text?.trim()
      if (!userText) return

      const userMsg: Message = {
        id: crypto.randomUUID(),
        author: ATTENDEE,
        timestamp: new Date(),
        text: userText,
      }
      setMessages((prev) => [...prev, userMsg])
      setLoading(true)

      // typing indicator
      const typingId = crypto.randomUUID()
      setMessages((prev) => [...prev, { id: typingId, author: BOT, typing: true }])

      try {
        const res = await fetch("/api/qa", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: userText, language, sessionId }),
        })
        const data = await res.json()
        setMessages((prev) =>
          prev
            .filter((m) => m.id !== typingId)
            .concat({
              id: crypto.randomUUID(),
              author: BOT,
              timestamp: new Date(),
              text: data.answer || "No answer available.",
            })
        )
      } catch {
        setMessages((prev) =>
          prev
            .filter((m) => m.id !== typingId)
            .concat({
              id: crypto.randomUUID(),
              author: BOT,
              timestamp: new Date(),
              text: "Sorry, I couldn't reach the Q&A service. Please try again.",
            })
        )
      } finally {
        setLoading(false)
      }
    },
    [language, sessionId]
  )

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl border border-[var(--color-baltic-sea-700)] bg-[var(--color-baltic-sea-900)] px-4 py-3 text-sm font-medium hover:border-[var(--color-keppel-500)]"
      >
        <ChatCircleDots className="h-5 w-5 text-[var(--color-keppel-400)]" />
        Ask a question
      </button>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-[var(--color-baltic-sea-700)] bg-[var(--color-baltic-sea-900)]">
      <div className="flex items-center justify-between border-b border-[var(--color-baltic-sea-800)] px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm font-medium">
          <ChatCircleDots className="h-4 w-4 text-[var(--color-keppel-400)]" />
          Ask the talk
        </div>
        <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground" aria-label="Collapse Q&A">
          <CaretRight className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 min-h-0">
        <Chat
          messages={messages}
          authorId={ATTENDEE.id}
          onSendMessage={handleSend}
          loading={loading}
          placeholder={`Ask in ${getLanguage(language).name}…`}
          height="100%"
          width="100%"
        />
      </div>
    </div>
  )
}
