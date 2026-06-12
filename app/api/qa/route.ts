import { NextResponse } from "next/server"
import { TranslationService } from "@/server/translate"
import { generateText, hasLLM, QA_MODEL } from "@/lib/llm"

const STATS_URL = process.env.NEXT_PUBLIC_STATS_URL || "http://localhost:8080"

const translator = new TranslationService()

interface TranscriptEntry { t: number; original: string; translated: string; lang: string }

async function getTranscriptContext(sessionId: string): Promise<string> {
  try {
    const res = await fetch(
      `${STATS_URL}/transcript?session=${encodeURIComponent(sessionId)}&seconds=90`,
      { cache: "no-store", signal: AbortSignal.timeout(4000) }
    )
    if (!res.ok) return ""
    const data = await res.json()
    const entries: TranscriptEntry[] = data.entries || []
    return entries.map((e) => e.original).join(" ")
  } catch {
    return ""
  }
}

async function recordQuestion(sessionId: string, text: string, lang: string) {
  try {
    await fetch(`${STATS_URL}/question`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, text, lang }),
      signal: AbortSignal.timeout(4000),
    })
  } catch {
    /* speaker feed is best-effort */
  }
}

export async function POST(request: Request) {
  let lang = "en"
  try {
    const { question, language, sessionId } = await request.json()
    lang = language || "en"

    if (!question || !sessionId) {
      return NextResponse.json({ answer: "Please type a question first." }, { status: 200 })
    }

    // 1. Translate the question to English for grounding + speaker feed.
    const questionEn = lang === "en" ? question : await translator.translate(question, lang, "en")

    // 2. Surface to speaker view (best-effort, fire and forget).
    recordQuestion(sessionId, questionEn, lang)

    // 3. Grounding transcript (last 90s).
    const transcriptContext = await getTranscriptContext(sessionId)

    if (!hasLLM()) {
      return NextResponse.json({
        answer:
          lang === "en"
            ? "AI Q&A isn't configured for this demo (missing API key)."
            : await translator.translate(
                "AI Q&A isn't configured for this demo (missing API key).",
                "en",
                lang
              ),
      })
    }

    if (!transcriptContext.trim()) {
      const msg = "The speaker hasn't said anything yet, so I can't answer based on the talk."
      return NextResponse.json({
        answer: lang === "en" ? msg : await translator.translate(msg, "en", lang),
      })
    }

    // 4. Ask Claude, grounded strictly in the transcript.
    const prompt = `You are answering a question about a live conference talk.
Answer ONLY based on what the speaker has said so far. Do not add outside knowledge.
If the answer is not in the transcript, say "The speaker hasn't addressed this yet."

TRANSCRIPT (last 90 seconds):
${transcriptContext}

QUESTION (translated to English):
${questionEn}

Answer in 2-3 sentences maximum.`

    let answerEn: string
    try {
      answerEn = await generateText({
        prompt,
        model: QA_MODEL,
        maxTokens: 700,
      })
    } catch (llmErr) {
      // LLM unavailable (rate limit, empty response, timeout). Degrade gracefully
      // with a friendly message in the attendee's language instead of a 500-style error.
      console.error("[/api/qa] LLM error:", llmErr)
      const msg = "The Q&A assistant is busy right now. Please try asking again in a moment."
      return NextResponse.json({
        answer: lang === "en" ? msg : await translator.translate(msg, "en", lang),
      })
    }

    // 5. Translate answer back into the attendee's language.
    const answer = lang === "en" ? answerEn : await translator.translate(answerEn, "en", lang)

    return NextResponse.json({ answer, answerEn, questionEn })
  } catch (e) {
    console.error("[/api/qa] error:", e)
    const msg = "Something went wrong answering that. Please try again."
    let answer = msg
    if (lang !== "en") {
      try { answer = await translator.translate(msg, "en", lang) } catch { /* keep english */ }
    }
    return NextResponse.json({ answer }, { status: 200 })
  }
}
