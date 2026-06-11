import { describe, it, expect, vi, beforeEach } from "vitest"
import { TranslationService } from "@/server/translate"

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)

function mockGoogleResponse(translated: string) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => [[[translated, "original"]]],
  })
}

describe("TranslationService", () => {
  let svc: TranslationService

  beforeEach(() => {
    svc = new TranslationService()
    mockFetch.mockReset()
  })

  it("returns empty string for empty input", async () => {
    expect(await svc.translate("", "en", "es")).toBe("")
    expect(await svc.translate("   ", "en", "es")).toBe("")
  })

  it("returns original text when src and tgt are the same", async () => {
    const result = await svc.translate("Hello", "en", "en")
    expect(result).toBe("Hello")
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("normalizes lang tags before comparing (en-US vs en)", async () => {
    const result = await svc.translate("Hello", "en-US", "en")
    expect(result).toBe("Hello")
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("calls Google Translate and returns translated text", async () => {
    mockGoogleResponse("Hola")
    const result = await svc.translate("Hello", "en", "es")
    expect(result).toBe("Hola")
    expect(mockFetch).toHaveBeenCalledOnce()
  })

  it("returns cached result on second call", async () => {
    mockGoogleResponse("Bonjour")
    await svc.translate("Hello", "en", "fr")
    const result = await svc.translate("Hello", "en", "fr")
    expect(result).toBe("Bonjour")
    expect(mockFetch).toHaveBeenCalledOnce()
  })

  it("deduplicates in-flight requests for same key", async () => {
    mockGoogleResponse("Ciao")
    const [r1, r2] = await Promise.all([
      svc.translate("Hello", "en", "it"),
      svc.translate("Hello", "en", "it"),
    ])
    expect(r1).toBe("Ciao")
    expect(r2).toBe("Ciao")
    expect(mockFetch).toHaveBeenCalledOnce()
  })

  it("falls back to original on fetch error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("network error"))
    const result = await svc.translate("Hello", "en", "de")
    expect(result).toBe("Hello")
  })

  it("falls back to original on non-ok response", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 429 })
    const result = await svc.translate("Hello", "en", "ja")
    expect(result).toBe("Hello")
  })
})
