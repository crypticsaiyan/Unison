import { NextResponse } from "next/server"
import { generateText, hasLLM, SUMMARY_MODEL } from "@/lib/llm"

const STATS_URL = process.env.NEXT_PUBLIC_STATS_URL || "http://localhost:8080"

interface TranscriptEntry { t: number; original: string; translated: string; lang: string }

async function getFullTranscript(sessionId: string): Promise<string> {
  try {
    const res = await fetch(`${STATS_URL}/transcript?session=${encodeURIComponent(sessionId)}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return ""
    const data = await res.json()
    const entries: TranscriptEntry[] = data.entries || []
    return entries.map((e) => e.original).join(" ")
  } catch {
    return ""
  }
}

export async function POST(request: Request) {
  try {
    const { sessionId } = await request.json()
    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 200 })
    }

    const transcript = await getFullTranscript(sessionId)

    if (!transcript.trim() || transcript.length < 40) {
      return NextResponse.json({
        error: "Not enough transcript captured yet to summarise this talk.",
      })
    }

    if (!hasLLM()) {
      return NextResponse.json({
        error: "Summary isn't configured for this demo (missing API key).",
      })
    }

    const prompt = `You are summarising a live conference talk from its transcript.
Return STRICT JSON only, no markdown, with this shape:
{
  "takeaways": ["...", "...", "...", "...", "..."],
  "technologies": ["..."],
  "snippets": ["..."]
}
- "takeaways": exactly 5 concise bullet points of the key ideas.
- "technologies": tools, libraries, frameworks, or products mentioned.
- "snippets": any code or commands mentioned (empty array if none).

TRANSCRIPT:
${transcript}`

    const text = await generateText({
      prompt,
      model: SUMMARY_MODEL,
      maxTokens: 2000,
    })

    let parsed: any
    try {
      const jsonStart = text.indexOf("{")
      const jsonEnd = text.lastIndexOf("}")
      parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1))
    } catch {
      return NextResponse.json({
        takeaways: [text.trim()],
        technologies: [],
        snippets: [],
      })
    }

    return NextResponse.json({
      takeaways: parsed.takeaways || [],
      technologies: parsed.technologies || [],
      snippets: parsed.snippets || [],
    })
  } catch (e) {
    console.error("[/api/summary] error:", e)
    return NextResponse.json({ error: "Failed to generate summary. Please try again." }, { status: 200 })
  }
}
