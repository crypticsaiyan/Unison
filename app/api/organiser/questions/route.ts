import { NextResponse } from "next/server"

const STATS_URL = process.env.NEXT_PUBLIC_STATS_URL || "http://localhost:8080"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const session = searchParams.get("session") || ""
  try {
    const res = await fetch(`${STATS_URL}/questions?session=${encodeURIComponent(session)}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) throw new Error(`questions ${res.status}`)
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ sessionId: session, questions: [] })
  }
}
