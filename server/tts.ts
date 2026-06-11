import { createClient, LiveTTSEvents } from "@deepgram/sdk";
import WebSocket from "ws";

const VOICE_MAP: Record<string, string> = {
  en: "aura-2-thalia-en",
  es: "aura-2-celeste-es",
  fr: "aura-2-agathe-fr",
  de: "aura-2-viktoria-de",
  it: "aura-2-livia-it",
  ja: "aura-2-izanami-ja",
  nl: "aura-2-rhea-nl",
};

function getVoice(lang: string, override?: string): string {
  if (override) return override;
  const prefix = lang.split("-")[0];
  return VOICE_MAP[prefix] ?? VOICE_MAP["en"];
}

interface PendingFlush {
  resolve: () => void;
  chunks: Buffer[];
  onChunk: (chunk: Buffer) => void;
}

interface LiveConnection {
  client: any;
  pending: PendingFlush | null;
  ready: boolean;
  lang: string;
  voice: string;
}

export class TTSService {
  private deepgramClient: any;
  // Pool: one persistent WS TTS connection per voice model
  private pool = new Map<string, LiveConnection>();

  constructor(apiKey: string) {
    this.deepgramClient = createClient(apiKey, {
      global: { websocket: { client: WebSocket as any } },
    });
  }

  private getPoolKey(lang: string, voiceId?: string) {
    return getVoice(lang, voiceId);
  }

  private openConnection(voice: string, lang: string): LiveConnection {
    const conn: LiveConnection = {
      client: null,
      pending: null,
      ready: false,
      lang,
      voice,
    };

    const liveClient = this.deepgramClient.speak.live({
      model: voice,
      encoding: "linear16",
      sample_rate: 24000,
      container: "none",
    });

    conn.client = liveClient;

    liveClient.on(LiveTTSEvents.Open, () => {
      conn.ready = true;
      console.log(`[TTS Live] Connected: ${voice}`);
    });

    liveClient.on(LiveTTSEvents.Audio, (data: Buffer) => {
      if (conn.pending) {
        conn.pending.onChunk(Buffer.from(data));
      }
    });

    liveClient.on(LiveTTSEvents.Flushed, () => {
      if (conn.pending) {
        conn.pending.resolve();
        conn.pending = null;
      }
    });

    liveClient.on(LiveTTSEvents.Error, (err: any) => {
      console.error(`[TTS Live] Error (${voice}):`, err);
      if (conn.pending) {
        conn.pending.resolve();
        conn.pending = null;
      }
      conn.ready = false;
      // Remove from pool so next call opens a fresh connection
      this.pool.delete(voice);
    });

    liveClient.on(LiveTTSEvents.Close, () => {
      conn.ready = false;
      this.pool.delete(voice);
      if (conn.pending) {
        conn.pending.resolve();
        conn.pending = null;
      }
    });

    return conn;
  }

  private async getConn(lang: string, voiceId?: string): Promise<LiveConnection> {
    const key = this.getPoolKey(lang, voiceId);
    let conn = this.pool.get(key);

    if (!conn) {
      conn = this.openConnection(key, lang);
      this.pool.set(key, conn);
    }

    // Wait up to 2s for connection to open
    if (!conn.ready) {
      await new Promise<void>((resolve) => {
        const check = setInterval(() => {
          if (conn!.ready) { clearInterval(check); resolve(); }
        }, 50);
        setTimeout(() => { clearInterval(check); resolve(); }, 2000);
      });
    }

    return conn;
  }

  public async streamAudio(
    text: string,
    targetLang: string = "en",
    onChunk: (chunk: Buffer) => void,
    voiceId?: string,
    _options?: { progressive?: boolean; encoding?: "mp3" | "linear16"; sampleRate?: number }
  ): Promise<void> {
    if (!text || !text.trim()) return;

    try {
      const conn = await this.getConn(targetLang, voiceId);

      if (!conn.ready) {
        // WS not ready — fall back to REST
        return this.streamRest(text, targetLang, onChunk, voiceId);
      }

      // If another flush is in progress, wait for it first
      if (conn.pending) {
        await new Promise<void>((r) => {
          const orig = conn.pending!.resolve;
          conn.pending!.resolve = () => { orig(); r(); };
        });
      }

      await new Promise<void>((resolve) => {
        conn.pending = { resolve, chunks: [], onChunk };
        const ttsStart = Date.now();
        conn.client.sendText(text);
        conn.client.flush();
        conn.pending.resolve = () => {
          console.log(`[TTS Live] done in ${Date.now() - ttsStart}ms`);
          resolve();
        };
      });
    } catch (err) {
      console.error("[TTS] streamAudio error:", err);
      return this.streamRest(text, targetLang, onChunk, voiceId);
    }
  }

  private async streamRest(
    text: string,
    targetLang: string,
    onChunk: (chunk: Buffer) => void,
    voiceId?: string
  ): Promise<void> {
    try {
      const model = getVoice(targetLang, voiceId);
      const response = await this.deepgramClient.speak.request(
        { text },
        { model, encoding: "linear16", sample_rate: 24000, container: "none" }
      );
      const stream = await response.getStream();
      if (!stream) return;
      const reader = stream.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) onChunk(Buffer.from(value));
      }
    } catch (err) {
      console.error("[TTS REST fallback] Error:", err);
    }
  }

  public getVoiceForLanguage(lang: string, override?: string): string {
    return getVoice(lang, override);
  }
}
