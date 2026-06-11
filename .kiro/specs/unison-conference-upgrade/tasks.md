# Implementation Plan

- [x] 1. Kendo install + theme integration
  - Added Kendo packages, imported Kendo theme CSS in layout, added scoped dark-theme override stylesheet (`app/kendo-theme.css`) mapping Kendo CSS vars to baltic-sea/keppel tokens.
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 2. Rebrand PolyDub → Unison
  - Updated layout metadata, header brand text/alt + Organiser nav link, landing copy, rooms footer, listener view title, recording filename prefix, WS server banner.
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 3. Shared language lists + Kendo DropDownList selector
  - `lib/languages.ts`; `kendo-language-select.tsx` with flag+name item/value templates; used on the listener join screen.
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 4. Event config + session layer
  - `lib/event-config.ts`; broadcaster session DropDownList; `/live/[sessionId]/[language]` route; `session-info-card.tsx` (Kendo Card).
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

- [x] 5. Kendo ListView transcript feed
  - `kendo-transcript-list.tsx` with timestamp/original/translated, auto-scroll, empty state; rendered on listener view.
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 6. Server-side session stats + transcript + question stores and HTTP routes
  - sessionStats/transcript/question stores in `server/index.ts`; 5s sampling; GET /stats, GET /transcript, GET/POST questions; CORS. Verified via curl.
  - _Requirements: 6.1-6.7, 8.1-8.5, 10.1_

- [x] 7. Organiser dashboard
  - `/organiser` (client-only via dynamic import) with access gate, polling, RadialGauge, DonutChart, LineChart, Grid, questions ListView, demo seed; `/api/organiser/stats` + `/api/organiser/questions` proxies.
  - _Requirements: 7.1-7.10, 12.2, 12.3_

- [x] 8. Q&A chat + /api/qa
  - `qa-chat.tsx` (Kendo Chat) on listener view; `/api/qa` route: translate→Claude (haiku) grounded in transcript→translate back→record question. Graceful fallbacks.
  - _Requirements: 9.1-9.9_

- [x] 9. Speaker question feed
  - `speaker-questions.tsx` polling proxy; added to broadcaster page.
  - _Requirements: 10.2, 10.3, 10.4, 10.5_

- [x] 10. Post-talk summary
  - `/api/summary` (Claude sonnet, strict JSON) + Kendo Window overlay with markdown download; "End Session" button on broadcaster.
  - _Requirements: 11.1-11.6_

- [x] 11. Build verification + demo robustness pass
  - `pnpm build` passes; WS server boots; empty `/stats` well-formed; seeded demo path verified; routes return 200.
  - _Requirements: 12.1, 12.2, 12.3_
