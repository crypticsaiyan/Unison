import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk"
import WS from "ws"
import { readFileSync } from "node:fs"

const env = {}
for (const line of readFileSync(new URL("../.env", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i)
  if (m) env[m[1]] = m[2]
}

const dg = createClient(env.DEEPGRAM_API_KEY, {
  global: { websocket: { client: WS } },
})
const conn = dg.listen.live({
  model: "nova-2", encoding: "linear16", sample_rate: 16000, channels: 1, language: "en-US",
})

conn.on(LiveTranscriptionEvents.Open, () => {
  console.log("✅ OPEN with ws-package transport")
  setTimeout(() => { conn.finish(); process.exit(0) }, 500)
})
conn.on(LiveTranscriptionEvents.Error, (e) => { console.error("❌ error:", e?.message || e); process.exit(1) })
setTimeout(() => { console.error("⏱ timed out"); process.exit(1) }, 8000)
