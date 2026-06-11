export interface ConferenceSession {
  id: string
  name: string
  speaker: string
  startTime: string
  track?: string
  description?: string
}

export const EVENT_CONFIG = {
  name: "React Summit / JSNation 2026",
  date: "June 11–12, 2026 · Amsterdam",
  sessions: [
    {
      id: "keynote",
      name: "Keynote: React 20 and the Compiler Era",
      speaker: "Andrew Clark · Meta",
      startTime: "09:30",
      track: "Main Stage",
      description: "What's coming in React 20 — the compiler, server actions, and the path to zero-bundle UI.",
    },
    {
      id: "server-components",
      name: "Server Components in Production: Lessons from Scale",
      speaker: "Delba de Oliveira · Vercel",
      startTime: "10:15",
      track: "Main Stage",
      description: "Real-world patterns, pitfalls, and performance wins from shipping RSC at scale.",
    },
    {
      id: "ai-ux",
      name: "Workshop: Building AI-Powered UX with React",
      speaker: "Tejas Kumar · Gitpod",
      startTime: "11:00",
      track: "Workshop",
      description: "Hands-on workshop: streaming UI, generative components, and agentic patterns in React.",
    },
    {
      id: "signals",
      name: "Signals vs. State: A Reactivity Deep Dive",
      speaker: "Jason Miller · Google",
      startTime: "13:00",
      track: "Main Stage",
      description: "Why fine-grained reactivity matters and what React can learn from Preact Signals.",
    },
    {
      id: "panel",
      name: "Panel: The Future of Open Source JavaScript",
      speaker: "Ryan Dahl, Rich Harris, Evan You",
      startTime: "14:30",
      track: "Main Stage",
      description: "Node, Deno, Bun, Vite — where is the JS ecosystem heading in 2027?",
    },
    {
      id: "perf",
      name: "Micro-Optimising React: What the Profiler Doesn't Show",
      speaker: "Nadia Makarevich · AG Grid",
      startTime: "15:30",
      track: "Main Stage",
      description: "Hidden rendering costs, scheduler internals, and how to read a flame graph like a pro.",
    },
    {
      id: "closing",
      name: "Closing Keynote: JS at the Edge",
      speaker: "Guillermo Rauch · Vercel",
      startTime: "16:30",
      track: "Main Stage",
      description: "Edge computing, AI inference at the CDN layer, and the next five years of the web.",
    },
  ] as ConferenceSession[],
}

export function getSession(id: string): ConferenceSession | undefined {
  return EVENT_CONFIG.sessions.find((s) => s.id === id)
}

/** Fallback used when a listener joins a session id that isn't in the config. */
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
