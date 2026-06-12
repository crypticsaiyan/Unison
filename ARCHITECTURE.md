# Unison Architecture

<div align="center">
  <img src="public/arch.svg" alt="Unison architecture diagram" width="100%" />
</div>

## System Overview

Two processes run simultaneously:

```mermaid
graph LR
    Browser["Browser\n(Next.js client)"]

    subgraph "Next.js :3000"
        UI["UI Pages\n/broadcast /live /sessions /organiser"]
        QA["/api/qa"]
        SUMMARY["/api/summary"]
        SESS["/api/sessions"]
        EVT["/api/event-config"]
        ORG["/api/organiser/*"]
        TTS_PREV["/api/tts-preview"]
    end

    subgraph "WebSocket + HTTP Server :8080"
        WS["ws + http server\nserver/index.ts"]
        STT["STTService\nDeepgram Nova-2"]
        TR["TranslationService\nGoogle gtx"]
        TTS["TTSService\nDeepgram Aura-2"]
        STORE["sessions.json\nstats / transcript / questions"]
    end

    Browser -- "HTTP / pages" --> UI
    Browser -- "REST" --> QA
    Browser -- "REST" --> SUMMARY
    Browser -- "REST" --> TTS_PREV
    QA & SUMMARY & SESS & EVT & ORG -- "HTTP proxy" --> WS
    Browser -- "WebSocket\nbinary + JSON" --> WS
    WS --> STT --> TR --> TTS --> WS
    WS --- STORE
```

---

## WebSocket Role Routing

```mermaid
flowchart TD
    CONN["New WS connection\n?role=..."]
    CONN --> R1{"role?"}

    R1 -- "host" --> HOST["Broadcast host\nopen STT stream\nreceive PCM\nfan out to listeners\npush transcript to store"]
    R1 -- "listener" --> LIST["Broadcast listener (?id=session&lang=)\nreceive translated PCM + transcript\ntracked for stats"]
```

The server also serves plain HTTP on the same port:

```mermaid
flowchart TD
    HTTP["HTTP request"] --> P{"path?"}
    P -- "GET /stats" --> S1["organiser analytics payload"]
    P -- "GET /transcript" --> S2["recent transcript (Q&A grounding)"]
    P -- "GET /questions · POST /question" --> S3["speaker question feed"]
    P -- "GET|POST|PUT|DELETE /sessions" --> S4["session CRUD → data/sessions.json"]
    P -- "GET|PUT /event-config" --> S5["event details store"]
```

---

## Broadcast Flow

```mermaid
sequenceDiagram
    participant H as Host browser
    participant WS as WS server
    participant DG_STT as Deepgram Nova-2
    participant TR as TranslationService
    participant DG_TTS as Deepgram Aura-2
    participant L_ES as Listener (ES)
    participant L_FR as Listener (FR)

    H->>WS: connect ?role=host&source=en&targets=es,fr
    WS->>DG_STT: open streaming connection

    loop every ~100ms
        H->>WS: PCM binary frame
        WS->>DG_STT: forward audio
    end

    DG_STT-->>WS: final transcript
    WS->>TR: translate(text, en→es)
    WS->>TR: translate(text, en→fr)

    WS-->>L_ES: {type:"transcript", translated}
    WS-->>L_FR: {type:"transcript", translated}

    WS->>DG_TTS: streamAudio("Hola mundo", es)
    WS->>DG_TTS: streamAudio("Bonjour monde", fr)

    loop PCM chunks
        DG_TTS-->>WS: linear16 chunk
        WS-->>L_ES: binary PCM
        WS-->>L_FR: binary PCM
    end
```

---

## TTS Service: Persistent WebSocket Pool

Each voice model gets one persistent `SpeakLiveClient` connection. `sendText()` + `flush()` streams audio chunks back via `LiveTTSEvents.Audio`, eliminating per-sentence HTTP round-trips.

```mermaid
flowchart LR
    TEXT["text + voice"]
    TEXT --> POOL{"connection\npool"}
    POOL -- "exists + open" --> SEND["sendText + flush"]
    POOL -- "missing/closed" --> OPEN["new SpeakLiveClient\nlinear16, 24kHz"]
    OPEN --> SEND
    SEND --> CHUNKS["LiveTTSEvents.Audio\n→ onChunk(buf)"]
    SEND --> FLUSHED["LiveTTSEvents.Flushed\n→ resolve promise"]
```

---

## Translation Service

```mermaid
flowchart TD
    REQ["translate(text, src, tgt)"]
    REQ --> SAME{"src == tgt?"}
    SAME -- "yes" --> PASSTHROUGH["return text"]
    SAME -- "no" --> CACHE{"LRU cache hit?"}
    CACHE -- "yes" --> RETURN_CACHE["return cached"]
    CACHE -- "no" --> INFLIGHT{"in-flight exists?"}
    INFLIGHT -- "yes" --> SHARE["share promise"]
    INFLIGHT -- "no" --> FETCH["GET google gtx\n2.5s timeout"]
    FETCH -- "ok" --> STORE["store LRU (max 500)"]
    FETCH -- "error" --> FALLBACK["return original"]
```

---

## Browser Audio Playback

```mermaid
flowchart TD
    BINARY["ArrayBuffer\nbinary WS message"]
    BINARY --> DECODE["Int16LE → float32\n÷ 32768"]
    DECODE --> ABUF["AudioContext.createBuffer\nmono, 24kHz"]
    ABUF --> SCHED{"nextStartTime\n< currentTime?"}
    SCHED -- "yes" --> RESET["nextStartTime = currentTime"]
    SCHED -- "no" --> QUEUE["source.start(nextStartTime)"]
    RESET --> QUEUE
    QUEUE --> ADVANCE["nextStartTime += buffer.duration"]
```

---

## Organiser Stats Lifecycle

Stats survive a talk ending so the dashboard keeps showing real numbers
instead of falling back to demo data. A per-session aggregate (offered
languages, served languages, ended flag) persists after the host
disconnects; peak and history are kept in their own maps.

```mermaid
flowchart TD
    SAMPLE["every 5s: sample live broadcasts"]
    SAMPLE --> HIST["push count to historyBySession"]
    SAMPLE --> PEAK["update peakBySession"]
    SAMPLE --> AGG["record served + offered langs"]

    END["host disconnects"] --> MARK["sessionAgg.ended = true"]
    MARK --> ZERO["push one trailing 0 to history"]

    BUILD["buildStats()"] --> UNION["live broadcasts ∪ ended sessions"]
    UNION --> STATUS["status: live if count>0 else ended"]
    UNION --> REACH["reach = served langs / offered langs"]
```

Reach is a language-coverage ratio (distinct languages that had a
listener over distinct languages the host offered), not a hardcoded
100%. Ended sessions keep their real peak and frozen history curve.

---

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `DEEPGRAM_API_KEY` | STT and TTS |
| `NEXT_PUBLIC_WS_URL` | WebSocket server address |
| `NEXT_PUBLIC_STATS_URL` | WS server HTTP base for organiser/session APIs |
| `PORT` / `WEBSOCKET_PORT` | WS listening port (default 8080) |
| `OPENROUTER_API_KEY` | AI Q&A and session summaries |
| `OPENROUTER_QA_MODEL` | Q&A model slug (default `openai/gpt-4o-mini`) |
| `OPENROUTER_SUMMARY_MODEL` | Summary model slug (default `anthropic/claude-sonnet-4`) |
| `ENABLE_DEBUG_ROUTES` | Set `1` to enable `POST /debug/transcript` |
