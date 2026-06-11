// Connects as a broadcast host and sends a short burst of silence PCM to
// trigger Deepgram STT, so we can observe the real connection behavior/errors.
import WebSocket from "ws"

const url = "ws://localhost:8080?role=host&source=en&targets=es&id=keynote&sample_rate=16000"
console.log("connecting:", url)
const ws = new WebSocket(url)

ws.on("open", () => {
  console.log("[client] host socket open, streaming PCM…")
  // 16kHz mono linear16 → send 0.2s chunks of low-level noise for ~2s
  let sent = 0
  const timer = setInterval(() => {
    const samples = 3200 // 0.2s @ 16kHz
    const buf = Buffer.alloc(samples * 2)
    for (let i = 0; i < samples; i++) {
      buf.writeInt16LE(Math.floor((Math.random() - 0.5) * 1500), i * 2)
    }
    ws.send(buf)
    sent++
    if (sent >= 10) {
      clearInterval(timer)
      setTimeout(() => { console.log("[client] done"); ws.close() }, 1500)
    }
  }, 200)
})

ws.on("message", (data) => {
  const s = data.toString()
  if (s.startsWith("{")) console.log("[server→client]", s)
})

ws.on("error", (e) => console.error("[client] error", e.message))
ws.on("close", () => { console.log("[client] closed"); process.exit(0) })
