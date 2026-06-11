import { NextResponse } from "next/server"
import { EVENT_CONFIG } from "@/lib/event-config"

const STATS_URL = process.env.NEXT_PUBLIC_STATS_URL || "http://localhost:8080"

// GET — list sessions (falls back to the static event config if WS server is down)
export async function GET() {
  try {
    const res = await fetch(`${STATS_URL}/sessions`, {
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) throw new Error(`sessions ${res.status}`)
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ sessions: EVENT_CONFIG.sessions, _fallback: true })
  }
}

// POST — create a session
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const res = await fetch(`${STATS_URL}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(4000),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: "server_unreachable" }, { status: 502 })
  }
}

// PUT — update a session (?id=)
export async function PUT(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id") || ""
  try {
    const body = await request.json()
    const res = await fetch(`${STATS_URL}/sessions?id=${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(4000),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: "server_unreachable" }, { status: 502 })
  }
}

// DELETE — remove a session (?id=)
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id") || ""
  try {
    const res = await fetch(`${STATS_URL}/sessions?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      signal: AbortSignal.timeout(4000),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: "server_unreachable" }, { status: 502 })
  }
}
