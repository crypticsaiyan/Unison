# Unison — Real-Time Conference Dubbing

> Every attendee. Every language. Live.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=111)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Deepgram](https://img.shields.io/badge/Deepgram-STT%20%2B%20TTS-orange?style=flat)](https://deepgram.com/)

Unison is conference inclusion infrastructure. Speakers talk in any language; attendees hear and read in their own — live, with no hardware, no app install, and no interpreters.

## Features

| Mode | Route | What it does |
|------|-------|-------------|
| Live Broadcast | `/broadcast` | Speaker broadcasts while attendees receive translated audio + transcript |
| Multilingual Rooms | `/rooms`, `/room/[roomId]` | Many-to-many conversations where each participant hears others in their language |
| Session Schedule | `/sessions` | Conference schedule with per-session language selection and QR share links |
| Organiser Dashboard | `/organiser` | Live listener counts, Q&A feed, session analytics |

**Highlights:**

- Sub-second dubbing latency via persistent Deepgram WebSocket TTS (`SpeakLiveClient`)
- Deepgram Nova-2 STT with `no_delay` and 200ms endpointing
- Google Translate with LRU cache and in-flight deduplication
- Native Aura-2 voices for English, Spanish, French, German, Italian, Japanese, Dutch
- Attendee Q&A with AI-powered answers streamed to the speaker dashboard
- Session-aware networking: attendees matched by shared sessions

## How It Works

```text
Mic PCM → WebSocket
  → Deepgram Nova-2 STT
  → Google Translate
  → Deepgram Aura-2 TTS (persistent WS)
  → WebSocket → Browser AudioContext → Speaker
```

Two cooperating processes:

```text
Next.js app (:3000)        WebSocket server (:8080)
  /broadcast                 broadcast hosts & listeners
  /sessions                  room audio & video sockets
  /room/[roomId]             Deepgram streaming STT
  /organiser                 translation cache
  /api/tts-preview           Deepgram streaming TTS
  /api/qa
  /api/summary
```

## Tech Stack

- **App**: Next.js 16, React 19, TypeScript
- **UI**: Tailwind CSS v4, Kendo UI for React, Radix UI, Phosphor Icons
- **Realtime**: Node.js, `ws`, browser Web Audio APIs
- **STT**: Deepgram Nova-2 streaming
- **Translation**: Google Translate `gtx` endpoint with LRU cache
- **TTS**: Deepgram Aura-2 via persistent `SpeakLiveClient` WebSocket

## Prerequisites

- Node.js 18+
- pnpm
- [Deepgram API key](https://console.deepgram.com)

## Getting Started

```bash
git clone https://github.com/crypticsaiyan/Unison.git
cd Unison
pnpm install
cp .env.example .env
```

Edit `.env`:

```env
DEEPGRAM_API_KEY=your_deepgram_api_key_here
PORT=8080
NEXT_PUBLIC_WS_URL=ws://localhost:8080
```

Start both processes in separate terminals:

```bash
pnpm dev
pnpm run server
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Next.js dev server on `http://localhost:3000` |
| `pnpm run server` | WebSocket server on port `8080` |
| `pnpm build` | Build Next.js app |
| `pnpm start` | Start built Next.js app |
| `pnpm lint` | Run ESLint |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DEEPGRAM_API_KEY` | Yes | Deepgram STT and TTS |
| `NEXT_PUBLIC_WS_URL` | Yes | WebSocket server URL (`ws://localhost:8080` in dev) |
| `PORT` / `WEBSOCKET_PORT` | No | WS server port, defaults to `8080` |
| `OPENROUTER_API_KEY` | No | AI Q&A and session summary features |

## Project Structure

```text
app/
  broadcast/             Live broadcast host page
  live/[sessionId]/[language]/  Attendee listener page
  room/[roomId]/         Multilingual room
  rooms/                 Room lobby
  sessions/              Conference schedule
  organiser/             Organiser dashboard
  api/                   REST endpoints
components/
  ui-core/               Core product UI components
  ui/                    Shared primitives
hooks/                   WebSocket client hooks
server/                  WebSocket server + STT/TTS/translate wrappers
lib/                     Shared utilities (SRT, event config, languages)
```

## License

MIT
