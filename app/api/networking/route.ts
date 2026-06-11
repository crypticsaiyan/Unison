// In-memory attendee interest store. Resets on server restart — fine for a demo.
// In production this would be Redis/DB.

interface Attendee {
  id: string
  name: string
  interests: string[]
  language: string
  sessionId: string
  joinedAt: number
}

// module-level so state persists across requests in the same process
const attendees = new Map<string, Attendee>()

function findMatches(me: Attendee): Attendee[] {
  const now = Date.now()
  const active = Array.from(attendees.values()).filter(
    (a) => a.id !== me.id && now - a.joinedAt < 30 * 60 * 1000 // active in last 30min
  )

  return active
    .map((a) => ({
      attendee: a,
      score: a.interests.filter((i) => me.interests.includes(i)).length,
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((x) => x.attendee)
}

export async function POST(request: Request) {
  const body = await request.json()
  const { action, id, name, interests, language, sessionId } = body

  if (action === "register") {
    if (!id || !interests?.length) {
      return Response.json({ error: "id and interests required" }, { status: 400 })
    }
    const attendee: Attendee = {
      id,
      name: name || "Anonymous",
      interests,
      language: language || "en",
      sessionId: sessionId || "",
      joinedAt: Date.now(),
    }
    attendees.set(id, attendee)
    const matches = findMatches(attendee)
    return Response.json({ registered: true, matches })
  }

  if (action === "matches") {
    const me = attendees.get(id)
    if (!me) return Response.json({ matches: [] })
    const matches = findMatches(me)
    return Response.json({ matches })
  }

  if (action === "heartbeat") {
    const a = attendees.get(id)
    if (a) { a.joinedAt = Date.now(); attendees.set(id, a) }
    return Response.json({ ok: true })
  }

  return Response.json({ error: "unknown action" }, { status: 400 })
}
