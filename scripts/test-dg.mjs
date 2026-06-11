import WebSocket from "ws"
import { readFileSync } from "node:fs"

const env = {}
for (const line of readFileSync(new URL("../.env", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i)
  if (m) env[m[1]] = m[2]
}
const KEY = env.DEEPGRAM_API_KEY
console.log("DG key prefix:", KEY?.slice(0, 8), "len:", KEY?.length)

const url = "wss://api.deepgram.com/v1/listen?model=nova-2&encoding=linear16&sample_rate=16000&channels=1&language=en-US"
const ws = new WebSocket(url, { headers: { Authorization: `Token ${KEY}` } })

ws.on("open", () => {
  console.log("✅ streaming socket OPEN — auth + credits OK")
  ws.close()
})
ws.on("unexpected-response", (req, res) => {
  console.error(`❌ unexpected-response HTTP ${res.statusCode}`)
  let body = ""
  res.on("data", (c) => (body += c))
  res.on("end", () => { console.error("body:", body); process.exit(1) })
})
ws.on("error", (e) => console.error("❌ error:", e.message))
ws.on("close", (code, reason) => {
  console.log(`closed code=${code} reason=${reason?.toString() || "(none)"}`)
  process.exit(0)
})
