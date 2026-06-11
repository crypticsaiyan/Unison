# Requirements Document

## Introduction

Unison (formerly PolyDub) is a live multilingual conference dubbing tool with a working real-time audio pipeline (speaker → Deepgram STT → translation → Deepgram Aura TTS), broadcast/room modes, VOD dubbing, and 15+ language support. This feature set transforms Unison from a generic communication tool into **conference inclusion infrastructure** for entry into the Progress x GitNation hackathon at React Summit / JSNation.

The upgrade has five thrusts:
1. **Kendo UI integration** (required by the sponsor) across the attendee and organiser experience, styled to match the existing dark "baltic-sea / keppel" theme.
2. **A conference event layer** tying broadcasts to a real event schedule and sessions.
3. **A live organiser dashboard** showing language reach, listener analytics, and active sessions.
4. **An AI-powered Q&A layer** letting attendees ask questions in their native language, grounded in the live transcript, with a two-way translation loop back to the speaker.
5. **An optional post-talk summary** generated from the full transcript.

The product is also being **renamed from PolyDub to Unison** throughout the codebase and UI.

### Scope notes / assumptions
- The winning demo is the source of truth for prioritisation. Build order is strict: Kendo install → DropDownList → ListView transcript → event config → organiser dashboard → Q&A → speaker question feed → summary.
- Kendo components must visually match the existing theme; the default Kendo theme will be customised (CSS variable overrides) rather than used as-is.
- Organiser stats may be partially derived/mocked for demo purposes (e.g., assumed non-English speaker baseline), but listener counts and language distribution must come from real server room state.
- Q&A and summary use the Claude API; an API key is assumed available via environment variable.

## Glossary
- **Session**: A conference talk/slot defined in the event config (e.g., Keynote). A broadcast is attached to a session.
- **Listener channel**: A `(session, language)` pair an attendee joins; listener counts are tracked per channel.
- **Reach percentage**: Inclusion metric = listeners served in their language ÷ (listeners + assumed non-English baseline).
- **Transcript chunk**: A finalized STT/translation entry stored server-side per session for Q&A grounding.

## Requirements

### Requirement 1: Project rename to Unison
**User Story:** As a hackathon team, I want the product rebranded from PolyDub to Unison, so that the product identity is consistent for judges.

#### Acceptance Criteria
1. WHEN the application loads any page THEN the system SHALL display the product name "Unison" in the header, page titles, and metadata.
2. WHERE the name "PolyDub" appears in user-facing UI text, the system SHALL display "Unison" instead.
3. THE system SHALL update the application metadata (HTML title, layout metadata) to reference "Unison".
4. WHILE renaming user-facing strings, the system SHALL preserve existing functionality, routes, and the WebSocket protocol without regression.
5. WHERE internal package identifiers or non-user-facing references exist, the system MAY retain them if changing them risks breaking the build, but SHALL rename user-visible occurrences.

### Requirement 2: Kendo UI installation and theming
**User Story:** As a hackathon entrant, I want Kendo React components installed and themed to match the site, so that the sponsor requirement is met without breaking the visual design.

#### Acceptance Criteria
1. THE system SHALL include the Kendo React packages required by the feature set (dropdowns, grid, charts, gauges, dialogs, listview, layout, data-query, conversational-ui, and the default theme) as project dependencies.
2. THE system SHALL load the Kendo theme stylesheet globally so Kendo components render with base styling.
3. WHERE Kendo components are rendered, the system SHALL apply theme overrides so component colors, surfaces, radius, and typography align with the existing dark baltic-sea/keppel palette (keppel as accent, baltic-sea surfaces, existing radius).
4. WHEN a Kendo component is displayed alongside existing Radix/Tailwind components THEN the system SHALL present a visually consistent appearance (no default Kendo blue/light surfaces clashing with the dark theme).
5. IF the Kendo theme CSS conflicts with existing global styles THEN the system SHALL scope or override styles such that existing pages remain visually unchanged.

### Requirement 3: Kendo DropDownList language selector
**User Story:** As an attendee or speaker, I want a clear language picker showing flags and names, so that I can choose my language confidently on join.

#### Acceptance Criteria
1. WHEN a speaker is on the broadcaster join screen THEN the system SHALL present a Kendo DropDownList for language selection.
2. WHEN an attendee is on the listener join screen THEN the system SHALL present a Kendo DropDownList for language selection.
3. THE DropDownList SHALL render each item with both a flag and the language name via an item template.
4. WHEN a user selects a language in the DropDownList THEN the system SHALL update the selected language used for the session.
5. THE DropDownList SHALL be styled to match the site theme per Requirement 2.
6. WHERE the broadcaster supports multiple target languages, the system SHALL continue to support selecting source and target languages (retaining existing multi-target capability), using Kendo controls for the primary selection.

### Requirement 4: Kendo ListView live transcript feed
**User Story:** As an attendee, I want a live scrolling transcript showing original and translated text, so that I can follow the talk visually in my language.

#### Acceptance Criteria
1. WHEN an attendee is on the listener view during an active broadcast THEN the system SHALL display a Kendo ListView transcript feed.
2. WHEN a new finalized transcript entry arrives THEN the system SHALL append an item containing a timestamp, the original text, and the translated text.
3. WHEN a new item is appended THEN the system SHALL auto-scroll the ListView to the latest entry.
4. WHILE no transcript entries exist THEN the system SHALL display an empty/placeholder state.
5. THE ListView SHALL be styled to match the site theme per Requirement 2.

### Requirement 5: Conference event configuration and session selection
**User Story:** As an organiser, I want broadcasts tied to a defined event schedule, so that the product reads as conference infrastructure rather than generic comms.

#### Acceptance Criteria
1. THE system SHALL provide an event configuration defining the event name and a list of sessions, each with an id, name, speaker, and start time.
2. WHEN a speaker starts a broadcast THEN the system SHALL allow selecting a session from the event config via a Kendo DropDownList.
3. WHEN an attendee joins THEN the system SHALL associate the listener with a session id and a language.
4. THE system SHALL support a room/listener URL scheme that includes the session id and language (implemented as `/live/[sessionId]/[language]`; the legacy `/room/[roomId]` multi-party route is preserved unchanged).
5. WHEN an attendee is on the listener join/active screen THEN the system SHALL display the session name, speaker, current language, and live attendee count.
6. THE listener session info SHALL be presented using a Kendo layout component (Card/TileLayout) styled to match the theme.
7. IF a listener navigates to a session id not present in the event config THEN the system SHALL handle it gracefully (fallback display without crashing).

### Requirement 6: Server-side session state and stats data
**User Story:** As the organiser dashboard, I want a stats endpoint backed by real room state, so that displayed analytics reflect actual listeners.

#### Acceptance Criteria
1. THE WebSocket server SHALL track, per session, the set of connected listeners and their selected languages.
2. THE WebSocket server SHALL track peak listener count per session over the session's lifetime.
3. THE system SHALL expose an organiser stats endpoint returning total listeners, listeners by language, listeners by session (with id, name, current count, and a recent count history), a reach percentage, and the list of active languages.
4. WHEN listeners join or leave THEN the system SHALL update the tracked counts so subsequent stats reflect the change.
5. THE reach percentage SHALL be derived as listeners ÷ (listeners + assumed non-English baseline), where the baseline MAY be a configurable/mocked value for the demo.
6. WHEN there are no active listeners THEN the stats endpoint SHALL return well-formed empty/zeroed data without erroring.
7. THE listeners-by-session history SHALL contain a rolling series of recent counts suitable for plotting the last ~10 minutes.

### Requirement 7: Organiser dashboard page
**User Story:** As an organiser, I want a live dashboard of language reach and listener analytics, so that I can demonstrate inclusion impact in real time.

#### Acceptance Criteria
1. THE system SHALL provide an organiser dashboard route (e.g., `/organiser`).
2. WHEN the dashboard is accessed without the demo access key THEN the system SHALL gate access (simple password or `?key=demo` query param) and SHALL render the dashboard only when the key is valid.
3. THE dashboard SHALL display a language reach hero stat using a Kendo RadialGauge showing the inclusion percentage, with "without Unison" vs "with Unison" framing text.
4. THE dashboard SHALL display a Kendo DonutChart of listener count per language across active sessions, with a percentage breakdown label.
5. THE dashboard SHALL display a Kendo line/sparkline chart of listener count over time, with one line per active session covering the recent window.
6. THE dashboard SHALL display a Kendo Grid of active sessions with columns: Session Name, Active Listeners, Languages in Use, Peak Listeners, and Status.
7. WHILE the dashboard is open THEN the system SHALL refresh its data periodically (polling every ~5 seconds or via live updates) so charts and grid reflect current state.
8. THE dashboard SHALL be styled to match the site theme per Requirement 2.
9. WHEN Phase 4 Q&A is enabled THEN the dashboard SHALL include a Kendo ListView of the last 10 attendee questions with question text, language asked, and timestamp.
10. IF the stats endpoint is unreachable THEN the dashboard SHALL display a non-crashing error/empty state and continue retrying.

### Requirement 8: Server-side transcript store for Q&A grounding
**User Story:** As the Q&A system, I want recent transcript context per session, so that answers are grounded in what the speaker actually said.

#### Acceptance Criteria
1. THE WebSocket server SHALL maintain a per-session store of recent transcript chunks (retaining at least the last 200 chunks per session).
2. WHEN a finalized transcript chunk is produced for a session THEN the system SHALL push it to that session's transcript store with a timestamp.
3. THE system SHALL provide a way to retrieve the transcript covering approximately the last 90 seconds for a given session.
4. WHEN a session ends THEN the system MAY retain the transcript for post-talk summary use until cleared.
5. THE transcript store SHALL bound memory by discarding entries beyond the retention limit.

### Requirement 9: Attendee Q&A via Kendo Chat
**User Story:** As an attendee, I want to ask questions in my own language and get answers grounded in the live talk, so that I can participate without language barriers.

#### Acceptance Criteria
1. WHEN an attendee is on the listener view THEN the system SHALL present a collapsible panel containing a Kendo Chat (conversational-ui) component.
2. WHEN an attendee submits a question in their language THEN the system SHALL display it as a user message bubble.
3. WHEN an attendee submits a question THEN the system SHALL call a Q&A API with the question text, the attendee language, and the session id.
4. THE Q&A API SHALL translate the question to English, retrieve the last ~90 seconds of session transcript, and call the Claude API with a prompt instructing it to answer only from the transcript and to say the speaker has not addressed it when the answer is absent.
5. THE Q&A API SHALL translate the answer back into the attendee's language and return it.
6. WHEN the answer is returned THEN the system SHALL display it as a bot message bubble in the attendee's language.
7. WHILE a Q&A request is in flight THEN the system SHALL indicate a pending/loading state.
8. IF the Q&A API fails THEN the system SHALL display a friendly error message in the chat without crashing the listener view.
9. THE Chat component SHALL be styled to match the site theme per Requirement 2.

### Requirement 10: Speaker question feed (two-way loop)
**User Story:** As a speaker, I want to see attendee questions in English during the talk, so that I can address them without interrupting the flow.

#### Acceptance Criteria
1. WHEN an attendee submits a question for a session THEN the system SHALL make the English-translated question available to that session's speaker view.
2. WHEN the speaker is broadcasting THEN the system SHALL display a questions panel listing recent attendee questions in English with the language each was asked in.
3. WHEN a new question arrives THEN the system SHALL update the speaker's questions panel in near real time.
4. THE questions panel SHALL be styled to match the site theme per Requirement 2.
5. WHILE no questions exist THEN the system SHALL show an empty state.

### Requirement 11: Post-talk summary (optional)
**User Story:** As an organiser/speaker, I want an auto-generated summary when a talk ends, so that attendees get takeaways and references.

#### Acceptance Criteria
1. WHEN the host clicks "End Session" THEN the system SHALL generate a summary from the full session transcript via the Claude API.
2. THE summary SHALL include key takeaways (about five bullet points), technologies/tools mentioned, and any code snippets extracted from the transcript.
3. WHEN the summary is generated THEN the system SHALL display it in a Kendo Window/Dialog overlay styled to match the theme.
4. THE system SHALL allow downloading the summary (markdown or PDF).
5. IF transcript content is insufficient or the summary call fails THEN the system SHALL display a graceful message instead of crashing.
6. THIS requirement is optional and SHALL only be implemented after Requirements 1–10 are stable.

### Requirement 12: Demo robustness
**User Story:** As a presenter, I want the live demo to be resilient, so that a pipeline failure doesn't derail the pitch.

#### Acceptance Criteria
1. WHEN the real-time audio pipeline errors during use THEN the system SHALL surface a non-blocking error state rather than crashing the page.
2. THE organiser dashboard, transcript feed, and Q&A panel SHALL each degrade independently so a failure in one does not break the others.
3. THE system SHOULD support a demo data path (mocked/seeded stats) so the organiser dashboard remains visually populated for the pitch even with few live listeners.
