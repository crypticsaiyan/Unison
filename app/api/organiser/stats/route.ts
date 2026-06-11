import { NextResponse } from "next/server"

const STATS_URL = process.env.NEXT_PUBLIC_STATS_URL || "http://localhost:8080"

// Seeded demo dataset so the dashboard stays visually populated for the pitch
// even when there are few live listeners. Activated via ?demo=1 or when the
// live server is unreachable / empty.
function demoStats() {
  const mkHistory = (base: number) =>
    Array.from({ length: 24 }, (_, i) => Math.max(0, Math.round(base + Math.sin(i / 3) * 4 + i / 4)))
  return {
    totalListeners: 47,
    listenersByLanguage: [
      { language: "hi", count: 20 },
      { language: "es", count: 15 },
      { language: "fr", count: 7 },
      { language: "de", count: 3 },
      { language: "en", count: 2 },
    ],
    listenersBySession: [
      {
        sessionId: "keynote",
        name: "Keynote: The Future of React",
        count: 42,
        peak: 51,
        languages: ["hi", "es", "fr", "de", "en"],
        history: mkHistory(30),
        status: "live",
      },
      {
        sessionId: "workshop-1",
        name: "Workshop: AI-Powered UX",
        count: 5,
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
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const demo = searchParams.get("demo") === "1"

  if (demo) {
    return NextResponse.json(demoStats())
  }

  try {
    const res = await fetch(`${STATS_URL}/stats`, {
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) throw new Error(`stats ${res.status}`)
    const data = await res.json()
    // If nothing is live, fall back to seeded demo data so the dashboard isn't empty.
    if (!data || data.totalListeners === 0) {
      return NextResponse.json({ ...demoStats(), _seeded: true })
    }
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ ...demoStats(), _seeded: true })
  }
}
