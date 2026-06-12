import { NextRequest, NextResponse } from "next/server"

const WS_URL = process.env.NEXT_PUBLIC_STATS_URL || "http://localhost:8080"

export async function GET() {
  try {
    const res = await fetch(`${WS_URL}/event-config`, { cache: "no-store" })
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ name: "Tech Conference 2026", date: "June 2026", eventDay: new Date().toISOString().slice(0, 10) })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const res = await fetch(`${WS_URL}/event-config`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 })
  }
}
