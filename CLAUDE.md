# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Unison** is a real-time multilingual conference dubbing platform. It uses Deepgram (STT + TTS) and Google Translate to enable live multilingual broadcasts and multi-party rooms for conference attendees.

## Common Commands

```bash
# Development (run both in separate terminals)
pnpm dev          # Next.js frontend on http://localhost:3000
pnpm server       # Node.js WebSocket server on ws://localhost:8080

# Build & production
pnpm build        # Next.js app build
pnpm start        # Start built Next.js app

# Code quality
pnpm lint         # ESLint via Next.js config
```

**Required environment variables** (copy `.env.example` → `.env`):
- `DEEPGRAM_API_KEY` — STT and TTS
- `NEXT_PUBLIC_WS_URL` — WebSocket server URL (default `ws://localhost:8080`)

## Architecture

Two separate processes must run simultaneously:

1. **Next.js app** (`app/`) — frontend + REST API routes (`/api/qa`, `/api/summary`, `/api/tts-preview`)
2. **WebSocket server** (`server/index.ts`) — real-time audio/video/translation pipeline

### Feature Modes

| Mode | Route | Description |
|------|-------|-------------|
| Broadcast | `/broadcast` | One host → many listeners with live translation |
| Rooms | `/room/[roomId]` | Many-to-many multilingual video conversations |
| Sessions | `/sessions` | Conference schedule with per-session listener links |

### Real-time Pipeline (Broadcast & Rooms)

```
Mic audio (PCM) → WebSocket → server/stt.ts (Deepgram Nova-2)
  → server/translate.ts (Google Translate) → server/tts.ts (Deepgram Aura-2)
  → WebSocket → AudioPlayback component → speaker
```

### WebSocket Message Protocol

The WS server (`server/index.ts`) manages two namespaces:
- **Broadcast**: host sends `start`/`audio`/`stop`; listeners receive `translated_audio` + `transcript`
- **Rooms**: members send `join`/`audio`/`video`; server fans out translated audio + video to all other members

### State in WS Server

- `listeners: Map<broadcastId, Set<WebSocket>>` — broadcast subscribers
- `rooms: Map<roomId, Map<memberId, RoomMember>>` — room participants with their language prefs

## Key Files

- `server/index.ts` — WebSocket server; all broadcast/room logic lives here
- `server/stt.ts` / `server/tts.ts` / `server/translate.ts` — thin wrappers around Deepgram/Google APIs
- `hooks/use-websocket.ts` — broadcast WS client hook
- `hooks/use-room.ts` — room-mode WS hook (dual sockets: audio + video)
- `lib/srt.ts` — SRT subtitle generation shared by all modes
- `lib/event-config.ts` — conference session definitions

## Testing

Tests live in `testsprite_tests/` and use the TestSprite framework. Test fixtures are in `testsprite_tests/fixtures/`. Results are written to `testsprite_tests/tmp/`.
