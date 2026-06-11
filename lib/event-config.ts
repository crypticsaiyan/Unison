export interface ConferenceSession {
  id: string
  name: string
  speaker: string
  startTime: string  // "HH:MM"
  endTime?: string   // "HH:MM"
  track?: string
  description?: string
}

export const EVENT_CONFIG = {
  name:    process.env.NEXT_PUBLIC_EVENT_NAME    || "Tech Conference 2026",
  date:    process.env.NEXT_PUBLIC_EVENT_DATE    || "June 2026 · Amsterdam",
  // Date used to compute live/upcoming/ended status (YYYY-MM-DD, local tz)
  eventDay: process.env.NEXT_PUBLIC_EVENT_DAY   || "2026-06-12",
  sessions: [
    {
      id: "opening",
      name: "Opening Keynote: The Next Era of Web Development",
      speaker: "Alex Rivera · Principal Engineer",
      startTime: "09:00",
      endTime: "09:45",
      track: "Main Stage",
      description: "Where the web platform is headed — new primitives, new patterns, and what developers should be thinking about today.",
    },
    {
      id: "session-1",
      name: "Building at Scale: Lessons from Millions of Users",
      speaker: "Jordan Kim · Staff Engineer",
      startTime: "10:00",
      endTime: "10:45",
      track: "Main Stage",
      description: "Real-world architecture decisions, trade-offs, and the hidden costs of scale.",
    },
    {
      id: "workshop-1",
      name: "Workshop: Modern State Management Patterns",
      speaker: "Sam Patel · Developer Advocate",
      startTime: "11:00",
      endTime: "12:00",
      track: "Workshop",
      description: "Hands-on deep dive into state primitives, derived state, and keeping complex UIs predictable.",
    },
    {
      id: "session-2",
      name: "Performance Without Compromise",
      speaker: "Morgan Lee · Performance Engineer",
      startTime: "13:00",
      endTime: "13:45",
      track: "Main Stage",
      description: "Profiling techniques, rendering strategies, and practical wins you can ship this week.",
    },
    {
      id: "panel-1",
      name: "Panel: Open Source in 2026 — What's Changed?",
      speaker: "Casey Chen, Drew Santos, Avery Walsh",
      startTime: "14:00",
      endTime: "14:45",
      track: "Panel",
      description: "Three open-source maintainers on sustainability, governance, and the evolving relationship between companies and communities.",
    },
    {
      id: "session-3",
      name: "AI-Augmented Development: Practical Patterns",
      speaker: "Taylor Brooks · AI Platform Lead",
      startTime: "15:00",
      endTime: "15:45",
      track: "Main Stage",
      description: "How AI tooling is changing the development loop — and where it still falls short.",
    },
    {
      id: "closing",
      name: "Closing Keynote: What We're Building Toward",
      speaker: "Riley Nguyen · CTO",
      startTime: "16:00",
      endTime: "16:45",
      track: "Main Stage",
      description: "A look at the trends converging over the next five years — and the open questions we still need to answer.",
    },
  ] as ConferenceSession[],
}

export type SessionStatus = "upcoming" | "live" | "ended"

export function getSessionStatus(session: ConferenceSession, eventDay: string): SessionStatus {
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)

  if (todayStr < eventDay) return "upcoming"
  if (todayStr > eventDay) return "ended"

  // Same day — compare HH:MM
  const pad = (s: string) => s.padStart(5, "0")
  const nowHHMM = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
  const start = pad(session.startTime || "00:00")
  const end = pad(session.endTime || session.startTime || "23:59")

  if (nowHHMM < start) return "upcoming"
  if (nowHHMM > end) return "ended"
  return "live"
}

export function getSession(id: string): ConferenceSession | undefined {
  return EVENT_CONFIG.sessions.find((s) => s.id === id)
}

export function getSessionOrFallback(id: string): ConferenceSession {
  return (
    getSession(id) ?? {
      id,
      name: id,
      speaker: "Live Speaker",
      startTime: "",
    }
  )
}
