/**
 * Minimal OpenRouter client (OpenAI-compatible chat completions).
 * Used by /api/qa and /api/summary. Calling OpenRouter's REST API directly
 * keeps us independent of ai-SDK provider version peer constraints.
 */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

// Default models (override per call). OpenRouter model slugs.
// Paid models — far more reliable than the rate-limited `:free` tiers.
export const QA_MODEL = process.env.OPENROUTER_QA_MODEL || "openai/gpt-4o-mini"
export const SUMMARY_MODEL = process.env.OPENROUTER_SUMMARY_MODEL || "anthropic/claude-3.5-sonnet"

export function hasLLM(): boolean {
  return Boolean(OPENROUTER_API_KEY)
}

interface GenerateOptions {
  prompt: string
  model?: string
  maxTokens?: number
  temperature?: number
  timeoutMs?: number
}

/**
 * Generate text via OpenRouter. Throws on failure so callers can decide
 * how to degrade gracefully.
 */
export async function generateText({
  prompt,
  model = QA_MODEL,
  maxTokens = 400,
  temperature = 0.3,
  timeoutMs = 20000,
}: GenerateOptions): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY not configured")
  }

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      // Optional attribution headers recommended by OpenRouter
      "HTTP-Referer": "https://unison.app",
      "X-Title": "Unison",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
      temperature,
    }),
    signal: AbortSignal.timeout(timeoutMs),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    throw new Error(`OpenRouter HTTP ${res.status}: ${detail.slice(0, 200)}`)
  }

  const data = await res.json()
  const message = data?.choices?.[0]?.message
  // Most models return content; some reasoning models leave content empty and
  // put the answer in reasoning — fall back to that so the route still works.
  const text =
    (typeof message?.content === "string" && message.content.trim()) ||
    (typeof message?.reasoning === "string" && message.reasoning.trim()) ||
    ""
  if (!text) {
    throw new Error("OpenRouter returned no content")
  }
  return text.trim()
}
