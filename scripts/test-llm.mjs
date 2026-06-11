// Quick OpenRouter connectivity test that reads the key from .env ONLY
// (ignores any broken OPENROUTER_API_KEY exported in the shell).
// Run: node scripts/test-llm.mjs
import { readFileSync } from "node:fs"

function loadEnv() {
  const env = {}
  try {
    const raw = readFileSync(new URL("../.env", import.meta.url), "utf8")
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i)
      if (m) env[m[1]] = m[2]
    }
  } catch {}
  return env
}

const env = loadEnv()
const key = env.OPENROUTER_API_KEY
const model = env.OPENROUTER_QA_MODEL || "meta-llama/llama-3.2-3b-instruct:free"

if (!key) {
  console.error("❌ No OPENROUTER_API_KEY found in .env — paste a valid key first.")
  process.exit(1)
}

console.log(`Using model: ${model}`)
console.log(`Key prefix: ${key.slice(0, 12)}…`)

const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    "HTTP-Referer": "https://unison.app",
    "X-Title": "Unison",
  },
  body: JSON.stringify({
    model,
    messages: [{ role: "user", content: "Reply with exactly: UNISON OK" }],
    max_tokens: 500,
  }),
})

console.log(`HTTP ${res.status}`)
const data = await res.json()
if (res.ok) {
  const msg = data?.choices?.[0]?.message
  const answer =
    (typeof msg?.content === "string" && msg.content.trim()) ||
    (typeof msg?.reasoning === "string" && msg.reasoning.trim()) ||
    "(empty)"
  console.log("✅ Answer:", answer)
} else {
  console.error("❌ Error:", JSON.stringify(data))
  process.exit(1)
}
