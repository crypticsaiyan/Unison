// SSE endpoint: pushes stats every 3s so the dashboard updates in real-time
// without needing client-side polling.

const STATS_URL = process.env.NEXT_PUBLIC_STATS_URL || "http://localhost:8080"

function demoStats() {
  const mkHistory = (base: number) =>
    Array.from({ length: 24 }, (_, i) => Math.max(0, Math.round(base + Math.sin(i / 3) * 4 + i / 4)))
  return {
    totalListeners: 47 + Math.floor(Math.random() * 5),
    listenersByLanguage: [
      { language: "hi", count: 20 + Math.floor(Math.random() * 3) },
      { language: "es", count: 15 },
      { language: "fr", count: 7 },
      { language: "de", count: 3 },
      { language: "en", count: 2 },
    ],
    listenersBySession: [
      {
        sessionId: "keynote",
        name: "Keynote: React 20 and the Compiler Era",
        count: 42 + Math.floor(Math.random() * 6),
        peak: 56,
        languages: ["hi", "es", "fr", "de", "en"],
        history: mkHistory(30),
        status: "live",
      },
      {
        sessionId: "ai-ux",
        name: "Workshop: Building AI-Powered UX with React",
        count: 5 + Math.floor(Math.random() * 3),
        peak: 9,
        languages: ["es", "fr"],
        history: mkHistory(4),
        status: "live",
      },
    ],
    reachPercentage: 100,
    activeLanguages: ["hi", "es", "fr", "de", "en"],
    englishListeners: 2,
    nonEnglishListeners: 45,
    assumedNonEnglishRatio: 0.75,
    assumedNonEnglishBaseline: 45,
    _seeded: true,
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const demo = searchParams.get("demo") === "1"

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false
      request.signal.addEventListener("abort", () => { closed = true })

      const push = async () => {
        if (closed) return
        try {
          let payload: unknown
          if (demo) {
            payload = demoStats()
          } else {
            try {
              const res = await fetch(`${STATS_URL}/stats`, {
                cache: "no-store",
                signal: AbortSignal.timeout(3000),
              })
              const data = res.ok ? await res.json() : null
              payload = data && data.totalListeners > 0 ? data : { ...demoStats(), _seeded: true }
            } catch {
              payload = { ...demoStats(), _seeded: true }
            }
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
        } catch {
          // controller may be closed
        }
      }

      await push()
      const id = setInterval(push, 3000)

      // Clean up when client disconnects
      request.signal.addEventListener("abort", () => {
        clearInterval(id)
        try { controller.close() } catch { /* already closed */ }
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
