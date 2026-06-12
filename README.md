# Unison — Real-Time Conference Dubbing

> Every attendee. Every language. Live.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=111)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Kendo UI](https://img.shields.io/badge/Kendo%20UI-React-orange?style=flat)](https://www.telerik.com/kendo-react-ui)
[![Deepgram](https://img.shields.io/badge/Deepgram-STT%20%2B%20TTS-13EF93?style=flat)](https://deepgram.com/)

Unison is **conference inclusion infrastructure**. A speaker talks on stage in their language; every attendee hears and reads the talk in their own — live, with no hardware, no app install, and no human interpreters. Attendees can ask questions in their native language and the speaker receives them in English, closing a two-way loop.

Built for the **Progress x GitNation Hackathon** with Kendo UI for React across the entire attendee and organiser experience.

## Features

| Surface | Route | What it does |
|---------|-------|--------------|
| Live Broadcast | `/broadcast` | Speaker goes live; attendees get translated audio + a live transcript. Shows incoming audience questions in English. |
| Attendee View | `/live/[sessionId]/[language]` | Join a session in your language — dubbed audio, Kendo transcript feed, AI Q&A chat, and interest-based networking. |
| Session Schedule | `/sessions` | Browse the conference schedule and join any talk live in your language. |
| Manage Sessions | `/sessions/manage` | Add, edit and delete sessions (Kendo Grid + dialog). Persisted server-side. |
| Organiser Dashboard | `/organiser?key=demo` | Live language-reach gauge, language distribution donut, listeners-over-time line chart, sessions grid, and recent questions. |

**Highlights:**

- Real-time speech → translation → neural voice pipeline with ~3s end-to-end latency
- Deepgram Nova-2 streaming STT and Aura-2 neural TTS (native voices for EN, ES, FR, DE, IT, JA, NL)
- Google Translate with an LRU cache and in-flight request deduplication
- AI-powered attendee Q&A, grounded strictly in the live transcript, via OpenRouter
- Auto-generated post-talk summaries (key takeaways, technologies, code snippets)
- Interest-based attendee networking with live match notifications
- Organiser analytics built entirely on Kendo Charts, Gauges and Grid
- Rotating dotted-globe landing page (cobe / WebGL)

## How It Works

```text
Mic PCM ──ws──▶ Deepgram Nova-2 STT
            ──▶ Google Translate (per target language)
            ──▶ Deepgram Aura-2 TTS
            ──ws──▶ Browser AudioContext ──▶ Attendee hears dubbed audio
```

Two cooperating processes:

```text
Next.js app (:3000)              WebSocket + HTTP server (:8080)
  /broadcast                       broadcast hosts & listeners
  /live/[sessionId]/[language]     Deepgram streaming STT
  /sessions, /sessions/manage      translation cache
  /organiser                       Aura-2 TTS
  /api/qa, /api/summary            session store (data/sessions.json)
  /api/sessions, /api/networking   stats / transcript / question stores
  /api/organiser/*, /api/tts-preview
```

The WS server also exposes plain HTTP endpoints (stats, transcript, questions, sessions CRUD) consumed by the Next.js API routes.

## Tech Stack

- **App**: Next.js 16, React 19, TypeScript
- **UI**: Tailwind CSS v4, **Kendo UI for React** (DropDownList, Grid, Charts, Gauges, ListView, Chat, Dialog, Window, Indicators, Notification, ProgressBar, Tooltip), Radix primitives, Phosphor Icons, cobe
- **Realtime**: Node.js, `ws`, browser Web Audio APIs
- **STT**: Deepgram Nova-2 streaming
- **Translation**: Google Translate `gtx` endpoint with LRU cache
- **TTS**: Deepgram Aura-2 (persistent `speak.live` WebSocket + REST fallback)
- **AI**: OpenRouter (Q&A answers + post-talk summaries)

## Prerequisites

- Node.js 18+ (tested on 20–26)
- pnpm
- [Deepgram API key](https://console.deepgram.com)
- [OpenRouter API key](https://openrouter.ai/keys) (optional — enables Q&A + summaries)

## Getting Started

```bash
git clone https://github.com/crypticsaiyan/Unison.git
cd Unison
pnpm install
```

Create `.env`:

```env
DEEPGRAM_API_KEY=your_deepgram_api_key
NEXT_PUBLIC_WS_URL=ws://localhost:8080
NEXT_PUBLIC_STATS_URL=http://localhost:8080
WEBSOCKET_PORT=8080

# Optional — enables AI Q&A and post-talk summaries
OPENROUTER_API_KEY=your_openrouter_key
OPENROUTER_QA_MODEL=nvidia/nemotron-nano-9b-v2:free
OPENROUTER_SUMMARY_MODEL=nvidia/nemotron-nano-9b-v2:free
```

Start both processes in separate terminals:

```bash
pnpm server   # WebSocket + HTTP server on :8080
pnpm dev      # Next.js app on :3000
```

Open [http://localhost:3000](http://localhost:3000).

> **Note:** if you have an `OPENROUTER_API_KEY` exported in your shell, it overrides the one in `.env`. `unset` it (or keep them in sync) before running.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Next.js dev server on `http://localhost:3000` |
| `pnpm server` | WebSocket + HTTP server on port `8080` |
| `pnpm build` | Build the Next.js app |
| `pnpm start` | Start the built Next.js app |
| `pnpm lint` | Run ESLint |
| `node scripts/test-llm.mjs` | Quick OpenRouter connectivity check (reads `.env`) |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DEEPGRAM_API_KEY` | Yes | Deepgram STT and TTS |
| `NEXT_PUBLIC_WS_URL` | Yes | WebSocket server URL (`ws://localhost:8080` in dev) |
| `NEXT_PUBLIC_STATS_URL` | Yes | WS server HTTP base for organiser/session APIs |
| `WEBSOCKET_PORT` / `PORT` | No | WS server port, defaults to `8080` |
| `OPENROUTER_API_KEY` | No | Enables AI Q&A and post-talk summaries |
| `OPENROUTER_QA_MODEL` | No | OpenRouter model slug for Q&A (defaults to a free model) |
| `OPENROUTER_SUMMARY_MODEL` | No | OpenRouter model slug for summaries |
| `ENABLE_DEBUG_ROUTES` | No | Set to `1` to enable `POST /debug/transcript` (seed transcript without a live mic) |

## Project Structure

```text
app/
  broadcast/                      Live broadcast host page
  live/[sessionId]/[language]/    Attendee listener page (transcript + Q&A + networking)
  sessions/                       Conference schedule
  sessions/manage/                Session CRUD management (Kendo Grid)
  organiser/                      Organiser analytics dashboard
  api/
    qa/                           Translate → OpenRouter (grounded) → translate back
    summary/                      Post-talk summary generation
    sessions/                     Sessions CRUD proxy → WS server
    networking/                   Interest-based attendee matching
    organiser/                    Stats / questions proxies
    tts-preview/                  Voice preview
components/
  ui-core/                        Core product UI (Kendo + custom)
  ui/                             Shared Radix-based primitives
  dot-globe.tsx                   Rotating WebGL globe (cobe)
  header.tsx, footer.tsx, landing-page.tsx
hooks/                            use-websocket, use-sessions
lib/                              languages, event-config, llm (OpenRouter), srt, utils
server/                           WebSocket + HTTP server, STT/TTS/translate wrappers
data/                             Runtime session store (sessions.json, git-ignored)
```

## License

MIT
