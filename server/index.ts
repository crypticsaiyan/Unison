import { WebSocketServer, WebSocket } from "ws";
import { STTService } from "./stt";
import dotenv from "dotenv";
import http, { IncomingMessage } from "http";
import { Buffer } from "buffer";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

import { TranslationService } from "./translate";
import { TTSService } from "./tts";

dotenv.config();

const PORT = parseInt(process.env.PORT || process.env.WEBSOCKET_PORT || "8080", 10);
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

if (!DEEPGRAM_API_KEY) {
  console.error("Missing DEEPGRAM_API_KEY");
  process.exit(1);
}

// --- Conference sessions store (file-backed, manageable via HTTP) ---
export interface SessionRecord {
  id: string;
  name: string;
  speaker: string;
  startTime: string;
  endTime?: string;
  date?: string;   // "YYYY-MM-DD" — overrides eventDay for this session
  track?: string;
  description?: string;
}

export interface EventConfig {
  name: string;
  date: string;
  eventDay: string;   // YYYY-MM-DD — legacy single day, kept for compat
  eventStart?: string; // YYYY-MM-DD — first day of event
  eventEnd?: string;   // YYYY-MM-DD — last day of event
}

const DATA_DIR = path.join(process.cwd(), "data");
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json");
const EVENT_CONFIG_FILE = path.join(DATA_DIR, "event-config.json");

const DEFAULT_EVENT_CONFIG: EventConfig = {
  name: "Tech Conference 2026",
  date: "June 2026 · Amsterdam",
  eventDay: new Date().toISOString().slice(0, 10),
};

const DEFAULT_SESSIONS: SessionRecord[] = [
  { id: "opening", name: "Opening Keynote: The Next Era of Web Development", speaker: "Alex Rivera · Principal Engineer", startTime: "09:00", endTime: "09:45", track: "Main Stage", description: "Where the web platform is headed — new primitives, new patterns, and what developers should be thinking about today." },
  { id: "session-1", name: "Building at Scale: Lessons from Millions of Users", speaker: "Jordan Kim · Staff Engineer", startTime: "10:00", endTime: "10:45", track: "Main Stage", description: "Real-world architecture decisions, trade-offs, and the hidden costs of scale." },
  { id: "workshop-1", name: "Workshop: Modern State Management Patterns", speaker: "Sam Patel · Developer Advocate", startTime: "11:00", endTime: "12:00", track: "Workshop", description: "Hands-on deep dive into state primitives, derived state, and keeping complex UIs predictable." },
  { id: "session-2", name: "Performance Without Compromise", speaker: "Morgan Lee · Performance Engineer", startTime: "13:00", endTime: "13:45", track: "Main Stage", description: "Profiling techniques, rendering strategies, and practical wins you can ship this week." },
  { id: "panel-1", name: "Panel: Open Source in 2026 — What's Changed?", speaker: "Casey Chen, Drew Santos, Avery Walsh", startTime: "14:00", endTime: "14:45", track: "Panel", description: "Three open-source maintainers on sustainability, governance, and the evolving relationship between companies and communities." },
  { id: "session-3", name: "AI-Augmented Development: Practical Patterns", speaker: "Taylor Brooks · AI Platform Lead", startTime: "15:00", endTime: "15:45", track: "Main Stage", description: "How AI tooling is changing the development loop — and where it still falls short." },
  { id: "closing", name: "Closing Keynote: What We're Building Toward", speaker: "Riley Nguyen · CTO", startTime: "16:00", endTime: "16:45", track: "Main Stage", description: "A look at the trends converging over the next five years — and the open questions we still need to answer." },
];

let sessionsStore: SessionRecord[] = [];
let eventConfigStore: EventConfig = { ...DEFAULT_EVENT_CONFIG };

function loadEventConfig(): void {
  try {
    if (fs.existsSync(EVENT_CONFIG_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(EVENT_CONFIG_FILE, "utf8"));
      eventConfigStore = { ...DEFAULT_EVENT_CONFIG, ...parsed };
    } else {
      saveEventConfig();
    }
  } catch (e) {
    console.error("[EventConfig] load failed, using defaults:", e);
  }
}

function saveEventConfig(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(EVENT_CONFIG_FILE, JSON.stringify(eventConfigStore, null, 2));
  } catch (e) {
    console.error("[EventConfig] save failed:", e);
  }
}

function loadSessions(): void {
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      sessionsStore = JSON.parse(fs.readFileSync(SESSIONS_FILE, "utf8"));
      if (!Array.isArray(sessionsStore)) sessionsStore = [...DEFAULT_SESSIONS];
    } else {
      sessionsStore = [...DEFAULT_SESSIONS];
      saveSessions();
    }
  } catch (e) {
    console.error("[Sessions] load failed, using defaults:", e);
    sessionsStore = [...DEFAULT_SESSIONS];
  }
}

function saveSessions(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessionsStore, null, 2));
  } catch (e) {
    console.error("[Sessions] save failed:", e);
  }
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || `session-${Date.now()}`
  );
}

function getSessionMeta(id: string): { name: string; speaker: string } {
  const s = sessionsStore.find((x) => x.id === id);
  return s ? { name: s.name, speaker: s.speaker } : { name: id, speaker: "Live Speaker" };
}

loadSessions();
loadEventConfig();

// Demo assumption: share of attendees who are NOT native English speakers.
// Used to compute the "without Unison" inclusion baseline on the dashboard.
const ASSUMED_NON_ENGLISH_RATIO = 0.75;

// --- Organiser stats / transcript / question stores ---
const peakBySession = new Map<string, number>();              // sessionId -> peak concurrent listeners
const historyBySession = new Map<string, number[]>();          // sessionId -> rolling listener counts (~10 min @ 5s)
const HISTORY_MAX = 120;

// Per-session aggregate that SURVIVES host disconnect, so an ended session keeps
// showing real peak/history/reach instead of vanishing (which used to trigger a
// fake demo fallback on the dashboard).
interface SessionAgg {
  targetLangs: Set<string>;   // languages the host offered
  langsServed: Set<string>;   // languages that ever had >=1 real listener
  ended: boolean;             // host has disconnected
}
const sessionAgg = new Map<string, SessionAgg>();

function getAgg(sessionId: string): SessionAgg {
  let a = sessionAgg.get(sessionId);
  if (!a) { a = { targetLangs: new Set(), langsServed: new Set(), ended: false }; sessionAgg.set(sessionId, a); }
  return a;
}

interface TranscriptStoreEntry { t: number; original: string; translated: string; lang: string }
const transcriptStore = new Map<string, TranscriptStoreEntry[]>(); // sessionId -> last 200 chunks
const TRANSCRIPT_MAX = 200;

interface QuestionStoreEntry { id: string; t: number; text: string; lang: string }
const questionStore = new Map<string, QuestionStoreEntry[]>();     // sessionId -> last 50 questions (English text)
const QUESTION_MAX = 50;

function countListeners(session: BroadcastSession): { total: number; byLang: Record<string, number> } {
  const byLang: Record<string, number> = {};
  let total = 0;
  session.listeners.forEach((sockets, lang) => {
    let n = 0;
    sockets.forEach((s) => { if (s.readyState === WebSocket.OPEN) n++; });
    if (n > 0) { byLang[lang] = n; total += n; }
  });
  return { total, byLang };
}

function pushTranscript(sessionId: string, entry: TranscriptStoreEntry) {
  let arr = transcriptStore.get(sessionId);
  if (!arr) { arr = []; transcriptStore.set(sessionId, arr); }
  arr.push(entry);
  if (arr.length > TRANSCRIPT_MAX) arr.splice(0, arr.length - TRANSCRIPT_MAX);
}

function pushQuestion(sessionId: string, entry: QuestionStoreEntry) {
  let arr = questionStore.get(sessionId);
  if (!arr) { arr = []; questionStore.set(sessionId, arr); }
  arr.push(entry);
  if (arr.length > QUESTION_MAX) arr.splice(0, arr.length - QUESTION_MAX);
}

function buildStats() {
  const listenersByLanguage: Record<string, number> = {};
  const listenersBySession: any[] = [];
  let totalListeners = 0;
  let englishListeners = 0;

  // Union of currently-live broadcasts and any session that ran earlier (ended
  // sessions stay in sessionAgg so the dashboard keeps real peak/history).
  const sessionIds = new Set<string>([...broadcasts.keys(), ...sessionAgg.keys()]);
  let targetLangUnion = new Set<string>();
  let servedLangUnion = new Set<string>();

  sessionIds.forEach((sessionId) => {
    const live = broadcasts.get(sessionId);
    const agg = getAgg(sessionId);
    const { total, byLang } = live ? countListeners(live) : { total: 0, byLang: {} as Record<string, number> };

    totalListeners += total;
    for (const [lang, n] of Object.entries(byLang)) {
      listenersByLanguage[lang] = (listenersByLanguage[lang] || 0) + n;
      if (lang === "en") englishListeners += n;
      agg.langsServed.add(lang);
    }
    if (live) live.targetLangs.forEach((l) => agg.targetLangs.add(l));

    agg.targetLangs.forEach((l) => targetLangUnion.add(l));
    agg.langsServed.forEach((l) => servedLangUnion.add(l));

    const peak = Math.max(peakBySession.get(sessionId) || 0, total);
    peakBySession.set(sessionId, peak);
    const meta = getSessionMeta(sessionId);
    listenersBySession.push({
      sessionId,
      name: meta?.name || sessionId,
      count: total,
      peak,
      languages: live ? Object.keys(byLang) : [...agg.langsServed],
      history: historyBySession.get(sessionId) || [],
      status: total > 0 ? "live" : "ended",
    });
  });

  // Live sessions first, then ended; within a group by current listener count.
  listenersBySession.sort((a, b) =>
    (a.status === b.status ? b.count - a.count : a.status === "live" ? -1 : 1)
  );

  // Reach = distinct languages that were actually served / distinct languages
  // the host(s) offered. Naturally lands below 100 when some offered languages
  // had no listeners, instead of being hardcoded to 100.
  const offeredCount = targetLangUnion.size;
  const reachPercentage = offeredCount > 0
    ? Math.round((servedLangUnion.size / offeredCount) * 100)
    : 0;

  const nonEnglishServed = totalListeners - englishListeners;

  return {
    totalListeners,
    listenersByLanguage: Object.entries(listenersByLanguage)
      .map(([language, count]) => ({ language, count }))
      .sort((a, b) => b.count - a.count),
    listenersBySession,
    reachPercentage,
    languagesServed: servedLangUnion.size,
    languagesOffered: offeredCount,
    activeLanguages: Object.keys(listenersByLanguage),
    englishListeners,
    nonEnglishListeners: nonEnglishServed,
    assumedNonEnglishRatio: ASSUMED_NON_ENGLISH_RATIO,
    assumedNonEnglishBaseline: nonEnglishServed,
  };
}

// Sample listener counts into per-session history every 5s for the line chart.
// Only LIVE sessions are sampled — an ended session's history is frozen at its
// last real shape so it keeps showing the curve it actually had (plus the single
// trailing zero added at disconnect to show the drop-off).
setInterval(() => {
  broadcasts.forEach((session, sessionId) => {
    const { total, byLang } = countListeners(session);
    const agg = getAgg(sessionId);
    session.targetLangs.forEach((l) => agg.targetLangs.add(l));
    Object.keys(byLang).forEach((l) => agg.langsServed.add(l));
    let h = historyBySession.get(sessionId);
    if (!h) { h = []; historyBySession.set(sessionId, h); }
    h.push(total);
    if (h.length > HISTORY_MAX) h.splice(0, h.length - HISTORY_MAX);
    const peak = Math.max(peakBySession.get(sessionId) || 0, total);
    peakBySession.set(sessionId, peak);
  });
}, 5000);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function sendJSON(res: http.ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "Content-Type": "application/json", ...CORS_HEADERS });
  res.end(JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);

  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  const readBody = (cb: (parsed: any) => void) => {
    let body = "";
    req.on("data", (c) => { body += c; if (body.length > 1e5) req.destroy(); });
    req.on("end", () => {
      try { cb(JSON.parse(body || "{}")); }
      catch { sendJSON(res, 400, { error: "bad_json" }); }
    });
  };

  // --- Sessions CRUD ---
  // GET /sessions — list all conference sessions
  if (req.method === "GET" && url.pathname === "/sessions") {
    sendJSON(res, 200, { sessions: sessionsStore });
    return;
  }

  // POST /sessions — create a session  body: { name, speaker, startTime, track?, description?, id? }
  if (req.method === "POST" && url.pathname === "/sessions") {
    readBody((data) => {
      if (!data.name || typeof data.name !== "string") {
        sendJSON(res, 400, { error: "name_required" });
        return;
      }
      let id = (data.id && String(data.id).trim()) || slugify(data.name);
      // ensure unique id
      if (sessionsStore.some((s) => s.id === id)) id = `${id}-${Date.now().toString(36).slice(-4)}`;
      const record: SessionRecord = {
        id,
        name: String(data.name).trim(),
        speaker: String(data.speaker || "TBD").trim(),
        startTime: String(data.startTime || "").trim(),
        endTime: data.endTime ? String(data.endTime).trim() : undefined,
        date: data.date ? String(data.date).trim() : undefined,
        track: data.track ? String(data.track).trim() : undefined,
        description: data.description ? String(data.description).trim() : undefined,
      };
      sessionsStore.push(record);
      saveSessions();
      sendJSON(res, 200, { ok: true, session: record });
    });
    return;
  }

  // PUT /sessions?id=<id> — update a session
  if (req.method === "PUT" && url.pathname === "/sessions") {
    const id = url.searchParams.get("id") || "";
    readBody((data) => {
      const idx = sessionsStore.findIndex((s) => s.id === id);
      if (idx === -1) { sendJSON(res, 404, { error: "not_found" }); return; }
      const cur = sessionsStore[idx];
      sessionsStore[idx] = {
        ...cur,
        name: data.name != null ? String(data.name).trim() : cur.name,
        speaker: data.speaker != null ? String(data.speaker).trim() : cur.speaker,
        startTime: data.startTime != null ? String(data.startTime).trim() : cur.startTime,
        endTime: data.endTime != null ? String(data.endTime).trim() || undefined : cur.endTime,
        date: data.date != null ? String(data.date).trim() || undefined : cur.date,
        track: data.track != null ? String(data.track).trim() || undefined : cur.track,
        description: data.description != null ? String(data.description).trim() || undefined : cur.description,
      };
      saveSessions();
      sendJSON(res, 200, { ok: true, session: sessionsStore[idx] });
    });
    return;
  }

  // DELETE /sessions?id=<id>
  if (req.method === "DELETE" && url.pathname === "/sessions") {
    const id = url.searchParams.get("id") || "";
    const before = sessionsStore.length;
    sessionsStore = sessionsStore.filter((s) => s.id !== id);
    if (sessionsStore.length === before) { sendJSON(res, 404, { error: "not_found" }); return; }
    saveSessions();
    sendJSON(res, 200, { ok: true });
    return;
  }

  // GET /event-config — return current event config
  if (req.method === "GET" && url.pathname === "/event-config") {
    sendJSON(res, 200, eventConfigStore);
    return;
  }

  // PUT /event-config — update event config
  if (req.method === "PUT" && url.pathname === "/event-config") {
    readBody((data) => {
      if (data.name != null) eventConfigStore.name = String(data.name).trim();
      if (data.date != null) eventConfigStore.date = String(data.date).trim();
      if (data.eventDay != null) eventConfigStore.eventDay = String(data.eventDay).trim();
      if (data.eventStart != null) eventConfigStore.eventStart = String(data.eventStart).trim();
      if (data.eventEnd != null) eventConfigStore.eventEnd = String(data.eventEnd).trim();
      saveEventConfig();
      sendJSON(res, 200, { ok: true, config: eventConfigStore });
    });
    return;
  }

  // GET /stats — organiser dashboard payload
  if (req.method === "GET" && url.pathname === "/stats") {
    try {
      sendJSON(res, 200, buildStats());
    } catch (e) {
      sendJSON(res, 500, { error: "stats_failed" });
    }
    return;
  }

  // GET /transcript?session=<id>&seconds=90
  if (req.method === "GET" && url.pathname === "/transcript") {
    const sessionId = url.searchParams.get("session") || "";
    const seconds = parseInt(url.searchParams.get("seconds") || "0", 10);
    const all = transcriptStore.get(sessionId) || [];
    const entries = seconds > 0 ? all.filter((e) => e.t >= Date.now() - seconds * 1000) : all;
    sendJSON(res, 200, { sessionId, entries });
    return;
  }

  // GET /questions?session=<id>
  if (req.method === "GET" && url.pathname === "/questions") {
    const sessionId = url.searchParams.get("session") || "";
    sendJSON(res, 200, { sessionId, questions: questionStore.get(sessionId) || [] });
    return;
  }

  // POST /debug/transcript  body: { sessionId, text, lang? }
  // Test/demo helper to seed transcript grounding without a live broadcast.
  // Disabled unless ENABLE_DEBUG_ROUTES=1 to keep production/submission clean.
  if (req.method === "POST" && url.pathname === "/debug/transcript") {
    if (process.env.ENABLE_DEBUG_ROUTES !== "1") {
      sendJSON(res, 404, { error: "not_found" });
      return;
    }
    let body = "";
    req.on("data", (c) => { body += c; if (body.length > 1e5) req.destroy(); });
    req.on("end", () => {
      try {
        const { sessionId, text, lang } = JSON.parse(body || "{}");
        if (!sessionId || !text) { sendJSON(res, 400, { error: "missing_fields" }); return; }
        pushTranscript(sessionId, { t: Date.now(), original: text, translated: text, lang: lang || "en" });
        sendJSON(res, 200, { ok: true });
      } catch {
        sendJSON(res, 400, { error: "bad_json" });
      }
    });
    return;
  }

  // POST /question  body: { sessionId, text (English), lang }
  if (req.method === "POST" && url.pathname === "/question") {
    let body = "";
    req.on("data", (c) => { body += c; if (body.length > 1e5) req.destroy(); });
    req.on("end", () => {
      try {
        const { sessionId, text, lang } = JSON.parse(body || "{}");
        if (!sessionId || !text) { sendJSON(res, 400, { error: "missing_fields" }); return; }
        const entry: QuestionStoreEntry = { id: randomUUID(), t: Date.now(), text, lang: lang || "en" };
        pushQuestion(sessionId, entry);
        sendJSON(res, 200, { ok: true, question: entry });
      } catch {
        sendJSON(res, 400, { error: "bad_json" });
      }
    });
    return;
  }

  res.writeHead(200, { "Content-Type": "text/plain", ...CORS_HEADERS });
  res.end("Unison WebSocket Server is running\n");
});

const wss = new WebSocketServer({ server });
const translationService = new TranslationService();
const ttsService = new TTSService(DEEPGRAM_API_KEY);

// PCM config streamed to listeners (Deepgram Aura native rate)
const TTS_ENCODING = "linear16" as const;
const TTS_SAMPLE_RATE = 24000;

// Per-listener TTS queue: serializes audio from concurrent speakers so chunks
// never interleave on the same socket. Depth is capped so stale utterances are
// dropped rather than letting the queue grow and creating 8+ second backlogs.
const listenerQueues = new WeakMap<WebSocket, Promise<void>>();
const listenerQueueDepth = new WeakMap<WebSocket, number>();
const MAX_QUEUE_DEPTH = 1; // 1 running + 1 waiting = max 2 in-flight at once

function enqueueTTS(ws: WebSocket, fn: () => Promise<void>): void {
  const prev = listenerQueues.get(ws) ?? Promise.resolve();
  const next = prev.then(fn).catch((e) => {
    console.error("[TTS Queue] Error:", e);
  });
  listenerQueues.set(ws, next);
}

function streamTTSToSocket(ws: WebSocket, text: string, targetLang: string, voiceId?: string): void {
  const depth = listenerQueueDepth.get(ws) ?? 0;
  if (depth > MAX_QUEUE_DEPTH) {
    console.log(`[TTS Queue] Dropping utterance (depth=${depth}) to prevent backlog`);
    return;
  }
  listenerQueueDepth.set(ws, depth + 1);

  enqueueTTS(ws, async () => {
    const ttsStart = Date.now();
    try {
      if (ws.readyState !== WebSocket.OPEN) return;
      ws.send(JSON.stringify({ type: "tts-start", encoding: TTS_ENCODING, sampleRate: TTS_SAMPLE_RATE }));
      await ttsService.streamAudio(text, targetLang, (chunk) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(chunk);
      }, voiceId, { progressive: true, encoding: TTS_ENCODING, sampleRate: TTS_SAMPLE_RATE });
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "tts-end" }));
      }
      console.log(`[TTS] done in ${Date.now() - ttsStart}ms`);
    } finally {
      const d = listenerQueueDepth.get(ws) ?? 1;
      listenerQueueDepth.set(ws, Math.max(0, d - 1));
    }
  });
}

// --- BROADCAST STATE (one session per host) ---
interface BroadcastSession {
  targetLangs: string[];
  listeners: Map<string, Set<WebSocket>>; // targetLang -> listener sockets
}
const broadcasts = new Map<string, BroadcastSession>(); // broadcastId -> session
const videoRooms = new Map<string, Set<WebSocket>>();   // broadcastId -> video listener sockets
// Listeners who connected before the host started
const waitingListeners = new Map<string, Map<string, Set<WebSocket>>>(); // broadcastId -> lang -> sockets

// --- NEW ROOM STATE ---
interface RoomMember {
  userId: string;
  wsAudio: WebSocket | null;
  wsVideo: WebSocket | null; // Optional separate video socket
  sourceLanguage: string;
  targetLanguage: string;
  targetVoice: string | null;
  voicePreferences?: Record<string, string>; // peerId -> voiceId
}

interface Room {
  id: string;
  members: Map<string, RoomMember>; // userId -> Member
}

const rooms = new Map<string, Room>();

console.log(`[Server] Starting WebSocket server on port ${PORT}`);

wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
  const url = new URL(req.url || "", `http://${req.headers.host}`);
  const role = url.searchParams.get("role") || "host"; // 'host', 'listener', 'member', 'member-video'
  
  // --- ROOM MEMBER LOGIC (Audio/Control) ---
  if (role === 'member') {
    const roomId = url.searchParams.get("room");
    const userId = url.searchParams.get("user") || randomUUID();
    const sourceLang = url.searchParams.get("source") || "en";
    const targetLang = url.searchParams.get("target") || "es"; // One target per user for now
    const voiceId = url.searchParams.get("voice"); 
    const sampleRate = parseInt(url.searchParams.get("sample_rate") || "16000", 10);

    if (!roomId) {
      ws.close(1008, "Room ID required");
      return;
    }

    console.log(`[Room ${roomId}] Member connected: ${userId} (${sourceLang} -> ${targetLang})`);

    // Get or Create Room
    let room = rooms.get(roomId);
    if (!room) {
      room = { id: roomId, members: new Map() };
      rooms.set(roomId, room);
    }

    // Register Member or Update Audio Socket
    let member = room.members.get(userId);
    if (!member) {
      member = { 
        userId, 
        wsAudio: ws, 
        wsVideo: null, 
        sourceLanguage: sourceLang, 
        targetLanguage: targetLang,
        targetVoice: voiceId || null,
        voicePreferences: {} // Initialize
      };
      room.members.set(userId, member);
    } else {
      member.wsAudio = ws;
      member.sourceLanguage = sourceLang;
      member.targetLanguage = targetLang;
      // Keep existing preferences if re-connecting? For now, reset or keep is fine.
      if (!member.voicePreferences) member.voicePreferences = {};
      // Update default voice if provided, else keep old?
      if (voiceId) member.targetVoice = voiceId;
    }

    // Notify others that someone joined
    // Broadcast as JSON string for consistency
    broadcastToRoom(room, userId, { type: 'user-joined', userId, sourceLanguage: sourceLang });

    // Send list of current participants to the new user
    const participants = Array.from(room.members.values())
      .filter(m => m.userId !== userId)
      .map(m => ({ userId: m.userId, sourceLanguage: m.sourceLanguage }));
    
    ws.send(JSON.stringify({ type: 'room-state', participants }));

    // Setup STT for this user
    const sttService = new STTService({
      apiKey: DEEPGRAM_API_KEY,
      sourceLanguage: sourceLang === 'auto' ? 'multi' : sourceLang,
      sampleRate: sampleRate,
      onTranscript: async (text, isFinal, detectedLanguage) => {
        const actualSourceLang = (sourceLang === 'auto' && detectedLanguage) 
          ? detectedLanguage 
          : (sourceLang === 'auto' ? 'en' : sourceLang);

        // 1. Send loopback (transcript to self)
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: isFinal ? "transcript" : "partial",
            userId: userId, // It's me
            original: text,
            translated: isFinal ? text : undefined, // No translation needed for self usually
            isSelf: true,
            timestamp: Date.now()
          }));
        }

        // 2. Broadcast to Room
        if (isFinal && text.trim().length > 0) {
            const currentRoom = rooms.get(roomId); // Refetch to be safe
            if (!currentRoom) return;
            const finalAt = Date.now();

            // Iterate other members
            await Promise.all(Array.from(currentRoom.members.values()).map(async (otherMember) => {
              if (otherMember.userId === userId) return; // Skip self
              if (!otherMember.wsAudio || otherMember.wsAudio.readyState !== WebSocket.OPEN) return;

              try {
                const translatedText = await translationService.translate(text, actualSourceLang, otherMember.targetLanguage);
                const translatedAt = Date.now();
                console.log(`[Room ${roomId}] ${userId}->${otherMember.userId} translate=${translatedAt - finalAt}ms`);

                if (!otherMember.wsAudio || otherMember.wsAudio.readyState !== WebSocket.OPEN) return;

                otherMember.wsAudio.send(JSON.stringify({
                  type: "transcript",
                  userId: userId,
                  original: text,
                  translated: translatedText,
                  timestamp: translatedAt,
                  sourceLanguage: actualSourceLang
                }));

                if (!translatedText) return;

                const specificVoice = otherMember.voicePreferences?.[userId];
                const finalVoice = specificVoice || otherMember.targetVoice;
                // Non-blocking: queued per-listener so concurrent speakers never interleave
                streamTTSToSocket(otherMember.wsAudio, translatedText, otherMember.targetLanguage, finalVoice || undefined);
              } catch (e) {
                console.error(`[Room ${roomId}] Translation/TTS failed for ${otherMember.userId}`, e);
              }
            }));
        }
      },
      onError: (err) => {
          if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "error", message: "STT Error" }));
      }
    });

    sttService.start();

    ws.on("message", (message: Buffer | ArrayBuffer | Buffer[]) => {
      // 1. Try to parse as Control Message (JSON)
      try {
          const msgString = message.toString();
          if (msgString.trim().startsWith('{')) {
              const data = JSON.parse(msgString);
              if (data.type === 'set-voice-preference') {
                  const mem = room.members.get(userId);
                  if (mem) {
                    if (!mem.voicePreferences) mem.voicePreferences = {};
                    mem.voicePreferences[data.peerId] = data.voiceId;
                    console.log(`[Room ${roomId}] User ${userId} set preference: ${data.peerId} -> ${data.voiceId}`);
                  }
                  return; // Handled as control message
              }
          }
      } catch (e) {
          // Not valid JSON, proceed to treat as audio
      }

      // 2. Treat as Audio Data
      if (Buffer.isBuffer(message)) sttService.sendAudio(message);
      else if (message instanceof ArrayBuffer) sttService.sendAudio(Buffer.from(message));
      else if (Array.isArray(message)) sttService.sendAudio(Buffer.concat(message));
    });

    ws.on("close", () => {
      console.log(`[Room ${roomId}] Member audio disconnected: ${userId}`);
      sttService.stop();
      if (rooms.has(roomId)) {
        const r = rooms.get(roomId)!;
        const m = r.members.get(userId);
        if (m) {
           m.wsAudio = null;
           // Wait for video to close too?
           // For simplicity, handle cleanup more aggressively or wait a bit
           if (!m.wsVideo || m.wsVideo.readyState !== WebSocket.OPEN) {
               r.members.delete(userId);
               broadcastToRoom(r, userId, { type: 'user-left', userId });
               if (r.members.size === 0) rooms.delete(roomId);
           }
        }
      }
    });

    ws.on("error", (err) => {
       console.error(`[Room ${roomId}] Audio Error for ${userId}:`, err);
       sttService.stop();
    });
  }

  // --- ROOM MEMBER VIDEO LOGIC ---
  else if (role === 'member-video') {
    const roomId = url.searchParams.get("room");
    const userId = url.searchParams.get("user");

    if (!roomId || !userId) {
      ws.close(1008, "Room ID and User ID required");
      return;
    }

    let room = rooms.get(roomId);
    if (!room) {
        room = { id: roomId, members: new Map() };
        rooms.set(roomId, room);
    }
    
    let member = room.members.get(userId);
    if (!member) {
      // Audio socket hasn't connected yet — create a placeholder so wsVideo is
      // registered. The audio socket will fill in real language/voice when it connects.
      member = {
        userId,
        wsAudio: null,
        wsVideo: ws,
        sourceLanguage: '',
        targetLanguage: '',
        targetVoice: null,
      };
      room.members.set(userId, member);
    } else {
      member.wsVideo = ws;
    }

    console.log(`[Room ${roomId}] Video connected: ${userId}`);

    ws.on('message', (message) => {
        let frameData: string = "";
        
        if (Buffer.isBuffer(message)) {
            frameData = message.toString('base64');
        } else if (message instanceof ArrayBuffer) {
            frameData = Buffer.from(message).toString('base64');
        } else {
             return;
        }

        const payload = JSON.stringify({
            type: 'video-frame',
            userId: userId,
            data: frameData
        });

        const currentRoom = rooms.get(roomId);
        if (currentRoom) {
            currentRoom.members.forEach((m) => {
                if (m.userId !== userId && m.wsVideo && m.wsVideo.readyState === WebSocket.OPEN) {
                    m.wsVideo.send(payload);
                }
            });
        }
    });

    ws.on('close', () => {
        console.log(`[Room ${roomId}] Video disconnected: ${userId}`);
        const r = rooms.get(roomId);
        if (r) {
            const m = r.members.get(userId);
            if (m) {
                m.wsVideo = null;
                if (!m.wsAudio || m.wsAudio.readyState !== WebSocket.OPEN) {
                    r.members.delete(userId);
                    broadcastToRoom(r, userId, { type: 'user-left', userId });
                    if (r.members.size === 0) rooms.delete(roomId);
                }
            }
        }
    });
  }
  
  // --- HOST LOGIC (Speaker) ---
  else if (role === 'host') {
    const sourceLang = url.searchParams.get("source") || "en";
    const targetsParam = url.searchParams.get("targets") || "es";
    const targetLangs = targetsParam.split(',').filter(t => t.length > 0);
    const sampleRate = parseInt(url.searchParams.get("sample_rate") || "16000", 10);
    const voicesParam = url.searchParams.get("voices");
    const broadcastId = url.searchParams.get("id") || randomUUID();

    let targetVoices: Record<string, string> = {};
    if (voicesParam) {
       try {
           targetVoices = JSON.parse(voicesParam);
       } catch (e) {
           console.error("Failed to parse voices param", e);
       }
    }

    console.log(`[Server] Host connected id=${broadcastId}: ${sourceLang} -> [${targetLangs.join(', ')}]`, targetVoices);

    // Create session
    const session: BroadcastSession = { targetLangs, listeners: new Map() };
    broadcasts.set(broadcastId, session);

    // Record offered languages and reopen the aggregate (a restarted session is live again).
    const agg = getAgg(broadcastId);
    targetLangs.forEach((l) => agg.targetLangs.add(l));
    agg.ended = false;

    // Migrate any listeners who connected before the host started
    const waiting = waitingListeners.get(broadcastId);
    if (waiting) {
      waiting.forEach((sockets, lang) => {
        if (!session.listeners.has(lang)) session.listeners.set(lang, new Set());
        sockets.forEach(sock => {
          if (sock.readyState === WebSocket.OPEN) {
            session.listeners.get(lang)!.add(sock);
            sock.send(JSON.stringify({ type: 'info', message: 'Broadcast has started!' }));
            sock.on("close", () => session.listeners.get(lang)?.delete(sock));
          }
        });
      });
      waitingListeners.delete(broadcastId);
    }

    const sttService = new STTService({
      apiKey: DEEPGRAM_API_KEY,
      sourceLanguage: sourceLang === 'auto' ? 'multi' : sourceLang,
      sampleRate: sampleRate,
      onTranscript: async (text, isFinal, detectedLanguage) => {
        const now = Date.now();
        
        const actualSourceLang = (sourceLang === 'auto' && detectedLanguage) 
          ? detectedLanguage 
          : (sourceLang === 'auto' ? 'en' : sourceLang);

        if (ws.readyState === WebSocket.OPEN) {
          const msg: any = {
            type: isFinal ? "transcript" : "partial",
            original: text,
            translated: "", 
            timestamp: now,
            sourceLanguage: actualSourceLang,
            targetLanguage: "multi" 
          };
          
          if (!isFinal) {
             ws.send(JSON.stringify(msg));
          }
        }

        if (isFinal && text.trim().length > 0) {
          console.log(`[STT] Final: "${text}" (Detected: ${detectedLanguage || 'N/A'})`);
          const finalAt = Date.now();

          // Record source transcript once per final utterance (for Q&A grounding
          // and post-talk summary), keyed by session id (== broadcastId).
          pushTranscript(broadcastId, {
            t: finalAt,
            original: text,
            translated: text,
            lang: actualSourceLang,
          });

          try {
            console.log(`[Broadcast] Processing targets: ${targetLangs.join(', ')}`);

            await Promise.all(targetLangs.map(async (lang) => {
               try {
                  const translatedText = await translationService.translate(text, actualSourceLang, lang);
                  const translatedAt = Date.now();

                  const specificListeners = session.listeners.get(lang);
                  if (!specificListeners || specificListeners.size === 0) return;

                  console.log(`[Broadcast] lang=${lang} translate=${translatedAt - finalAt}ms`);

                  const updateMsg = JSON.stringify({
                    type: "transcript",
                    original: text,
                    translated: translatedText,
                    timestamp: translatedAt,
                    sourceLanguage: actualSourceLang,
                    targetLanguage: lang
                  });

                  specificListeners.forEach(l => {
                    if (l.readyState === WebSocket.OPEN) l.send(updateMsg);
                  });

                  if (!translatedText) return;

                  const voiceId = targetVoices[lang];
                  // Non-blocking: each listener gets its own serialized TTS queue
                  specificListeners.forEach(l => streamTTSToSocket(l, translatedText, lang, voiceId));
               } catch (err) {
                  console.error(`[Broadcast] Error processing ${lang}:`, err);
               }
            }));

          } catch (pipelineError) {
            console.error("[Pipeline] Error:", pipelineError);
          }
        }
      },
      onError: (err) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "error", message: "STT Error" }));
      }
    });

    sttService.start();

    ws.on("message", (message: Buffer | ArrayBuffer | Buffer[]) => {
      if (Buffer.isBuffer(message)) sttService.sendAudio(message);
      else if (message instanceof ArrayBuffer) sttService.sendAudio(Buffer.from(message));
      else if (Array.isArray(message)) sttService.sendAudio(Buffer.concat(message));
    });

    ws.on("close", () => {
      console.log(`[Server] Host disconnected id=${broadcastId}`);
      broadcasts.delete(broadcastId);
      waitingListeners.delete(broadcastId);
      getAgg(broadcastId).ended = true;
      // One trailing zero so the line drops to 0 at end, then the frozen history
      // is preserved (sampler skips ended sessions).
      const h = historyBySession.get(broadcastId);
      if (h && h[h.length - 1] !== 0) {
        h.push(0);
        if (h.length > HISTORY_MAX) h.splice(0, h.length - HISTORY_MAX);
      }

      session.listeners.forEach(sockets => {
        sockets.forEach(l => {
          if (l.readyState === WebSocket.OPEN) {
            l.send(JSON.stringify({ type: 'info', message: 'Host ended the broadcast.' }));
          }
        });
      });

      sttService.stop();
    });

    ws.on("error", (error) => {
      console.error(`[Server] Host error: ${error.message}`);
      sttService.stop();
      broadcasts.delete(broadcastId);
      waitingListeners.delete(broadcastId);
    });
  } 
  
  // LISTENER LOGIC (Receiver)
  else if (role === 'listener') {
    const listenLang = url.searchParams.get("lang") || "es";
    const broadcastId = url.searchParams.get("id");

    const session = broadcastId ? broadcasts.get(broadcastId) : undefined;

    if (!session) {
      // Host hasn't started yet — park listener in the waiting pool
      ws.send(JSON.stringify({ type: 'waiting', message: 'Waiting for the broadcaster to start...' }));
      if (broadcastId) {
        if (!waitingListeners.has(broadcastId)) waitingListeners.set(broadcastId, new Map());
        const byLang = waitingListeners.get(broadcastId)!;
        if (!byLang.has(listenLang)) byLang.set(listenLang, new Set());
        byLang.get(listenLang)!.add(ws);
        ws.on("close", () => byLang.get(listenLang)?.delete(ws));
        ws.on("error", () => byLang.get(listenLang)?.delete(ws));
      }
      return;
    }

    ws.send(JSON.stringify({ type: 'info', message: 'Connected to live broadcast.' }));
    if (!session.listeners.has(listenLang)) session.listeners.set(listenLang, new Set());
    session.listeners.get(listenLang)!.add(ws);

    ws.on("close", () => session.listeners.get(listenLang)?.delete(ws));
    ws.on("error", () => session.listeners.get(listenLang)?.delete(ws));
  }
  else if (role === 'host-video') {
    const broadcastId = url.searchParams.get("id") || "default";
    // Ensure room exists so listeners joining after host can receive frames
    if (!videoRooms.has(broadcastId)) videoRooms.set(broadcastId, new Set());
    ws.on('message', (message) => {
      videoRooms.get(broadcastId)?.forEach(client => {
        if (client.readyState === WebSocket.OPEN) client.send(message);
      });
    });
  }
  else if (role === 'listener-video') {
    const broadcastId = url.searchParams.get("id") || "default";
    if (!videoRooms.has(broadcastId)) videoRooms.set(broadcastId, new Set());
    const room = videoRooms.get(broadcastId)!;
    room.add(ws);
    ws.on('close', () => room.delete(ws));
  }
});

function broadcastToRoom(room: Room, excludeUserId: string, message: any) {
  const json = JSON.stringify(message);
  room.members.forEach((m) => {
    if (m.userId !== excludeUserId && m.wsAudio && m.wsAudio.readyState === WebSocket.OPEN) {
      m.wsAudio.send(json);
    }
  });
}

server.listen(PORT, () => {
  console.log(`[Server] Listening on http://localhost:${PORT}`);
});
