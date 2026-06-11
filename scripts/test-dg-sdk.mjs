import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk"
import { readFileSync } from "node:fs"

const env = {}
for (const line of readFileSync(new URL("../.env", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i)
  if (m) env[m[1]] = m[2]
}

const dg = createClient(env.DEEPGRAM_API_KEY)
const conn = dg.listen.live({
  model: "nova-2",
  encoding: "linear16",
  sample_rate: 16000,
  channels: 1,
  language: "en-US",
})

conn.on(LiveTranscriptionEvents.Open, () => {
  console.log("✅ SDK streaming OPEN")
  setTimeout(() => { conn.finish(); process.exit(0) }, 500)
})
conn.on(LiveTranscriptionEvents.Error, (e) => {
  console.error("❌ SDK error:", e?.message || e)
  process.exit(1)
})
conn.on(LiveTranscriptionEvents.Close, () => console.log("SDK closed"))
setTimeout(() => { console.error("⏱ timed out waiting for open"); process.exit(1) }, 8000)
