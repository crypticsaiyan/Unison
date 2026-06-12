# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Unison** is a real-time multilingual conference dubbing platform — "conference inclusion infrastructure." It uses Deepgram (STT + TTS) and Google Translate to live-dub a speaker into every attendee's language, plus an OpenRouter-powered Q&A loop so attendees can ask questions in their own language grounded in the live transcript. Built with Kendo UI for React across the attendee and organiser experience.

## Common Commands

```bash
# Development (run both in separate terminals)
pnpm dev          # Next.js frontend on http://localhost:3000
pnpm server       # WebSocket + HTTP server on :8080

# Build & production
pnpm build        # Next.js app build
pnpm start        # Start built Next.js app

# Code quality / utilities
pnpm lint                      # ESLint via Next.js config
node scripts/test-llm.mjs      # OpenRouter connectivity check (reads .env)
```

**Required environment variables** (in `.env`):
- `DEEPGRAM_API_KEY` — STT and TTS
- `NEXT_PUBLIC_WS_URL` — WebSocket server URL (default `ws://localhost:8080`)
- `NEXT_PUBLIC_STATS_URL` — WS server HTTP base (default `http://localhost:8080`)

**Optional:**
- `OPENROUTER_API_KEY` (+ `OPENROUTER_QA_MODEL`, `OPENROUTER_SUMMARY_MODEL`) — AI Q&A and summaries
- `ENABLE_DEBUG_ROUTES=1` — enables `POST /debug/transcript` for seeding transcript without a mic

> A shell-exported `OPENROUTER_API_KEY` overrides `.env`. Keep them in sync or `unset` the shell one.

## Architecture

Two separate processes must run simultaneously:

1. **Next.js app** (`app/`) — frontend + REST API routes
2. **WebSocket + HTTP server** (`server/index.ts`) — real-time audio/translation pipeline AND plain HTTP endpoints for stats, transcript, questions, and session CRUD

### Surfaces

| Surface | Route | Description |
|---------|-------|-------------|
| Broadcast | `/broadcast` | One host → many listeners with live translation; shows audience questions in English |
| Attendee | `/live/[sessionId]/[language]` | Listener view: dubbed audio, Kendo transcript, Q&A chat, networking |
| Sessions | `/sessions` | Conference schedule (loads from the server-backed store) |
| Manage Sessions | `/sessions/manage` | Kendo Grid CRUD for sessions |
| Organiser | `/organiser?key=demo` | Kendo Charts/Gauge/Grid analytics dashboard |

### Real-time Pipeline

```
Mic audio (PCM) → WebSocket → server/stt.ts (Deepgram Nova-2)
  → server/translate.ts (Google Translate) → server/tts.ts (Deepgram Aura-2)
  → WebSocket → AudioPlayback component → attendee
```

### Deepgram WebSocket transport note

Node 24/26 ship a native global `WebSocket` that negotiates experimental WebSocket-over-HTTP2, which **fails** Deepgram's streaming handshake (immediate close, `statusCode: undefined`). `server/stt.ts` forces the SDK to use the `ws` package transport via `createClient(key, { global: { websocket: { client: WS } } })`. Keep this when touching STT.

### WS server HTTP endpoints (consumed by Next API routes)

- `GET /stats` — organiser dashboard payload
- `GET /transcript?session=&seconds=` — recent transcript for Q&A grounding
- `GET /questions?session=` / `POST /question` — speaker question feed
- `GET|POST|PUT|DELETE /sessions` — session CRUD (file-backed at `data/sessions.json`)
- `POST /debug/transcript` — gated behind `ENABLE_DEBUG_ROUTES=1`

### State in the WS server (`server/index.ts`)

- `broadcasts: Map<id, { targetLangs, listeners }>` — broadcast subscribers per language
- `sessionsStore` — conference sessions, persisted to `data/sessions.json`
- `transcriptStore` / `questionStore` — per-session, in-memory (reset on restart)
- `peakBySession` / `historyBySession` — analytics, sampled every 5s

## Key Files

- `server/index.ts` — WS + HTTP server; broadcast logic, stats, sessions, transcript/question stores
- `server/stt.ts` / `server/tts.ts` / `server/translate.ts` — Deepgram/Google wrappers
- `hooks/use-websocket.ts` — broadcast WS client hook
- `hooks/use-sessions.ts` — sessions CRUD client hook
- `lib/llm.ts` — OpenRouter client (used by `/api/qa` and `/api/summary`)
- `lib/event-config.ts` — default/fallback session definitions
- `lib/languages.ts` — language lists and lookup helpers
- `lib/srt.ts` — SRT subtitle generation
- `app/kendo-theme.css` — Kendo theme overrides mapping to the baltic-sea/keppel palette
- `components/ui-core/` — core product components (Kendo + custom)

## Conventions

- Theme palette: baltic-sea (surfaces) + keppel (accent), defined in `app/globals.css`.
- Kendo components are themed via `app/kendo-theme.css`; keep new Kendo usage consistent with it.
- AI routes degrade gracefully: missing key or transcript returns a friendly message, never a 500.

## Testing

No automated test suite is currently in the repo. Verify changes with `pnpm build`, by booting `pnpm server` and exercising the HTTP endpoints, and by running the live broadcast/listener flow manually.
