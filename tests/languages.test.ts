import { describe, it, expect } from "vitest"
import { getLanguage, languageName, languageFlag, TTS_LANGUAGES, STT_LANGUAGES } from "@/lib/languages"

describe("getLanguage", () => {
  it("returns correct entry for known code", () => {
    const lang = getLanguage("en")
    expect(lang.name).toBe("English")
    expect(lang.flag).toBe("🇺🇸")
  })

  it("returns fallback for unknown code", () => {
    const lang = getLanguage("xx")
    expect(lang.code).toBe("xx")
    expect(lang.name).toBe("XX")
    expect(lang.flag).toBe("🌐")
  })

  it("resolves codes from both STT and TTS lists", () => {
    expect(getLanguage("ja").name).toBe("Japanese")
    expect(getLanguage("hi").name).toBe("Hindi")
  })
})

describe("languageName", () => {
  it("returns name for known code", () => {
    expect(languageName("fr")).toBe("French")
    expect(languageName("de")).toBe("German")
  })

  it("returns uppercased code for unknown", () => {
    expect(languageName("zz")).toBe("ZZ")
  })
})

describe("languageFlag", () => {
  it("returns flag emoji for known code", () => {
    expect(languageFlag("es")).toBe("🇪🇸")
    expect(languageFlag("ja")).toBe("🇯🇵")
  })

  it("returns globe for unknown code", () => {
    expect(languageFlag("xx")).toBe("🌐")
  })
})

describe("TTS_LANGUAGES", () => {
  it("has unique codes", () => {
    const codes = TTS_LANGUAGES.map((l) => l.code)
    expect(new Set(codes).size).toBe(codes.length)
  })

  it("includes English", () => {
    expect(TTS_LANGUAGES.some((l) => l.code === "en")).toBe(true)
  })
})

describe("STT_LANGUAGES", () => {
  it("includes auto-detect", () => {
    expect(STT_LANGUAGES.some((l) => l.code === "auto")).toBe(true)
  })

  it("has more options than TTS", () => {
    expect(STT_LANGUAGES.length).toBeGreaterThan(TTS_LANGUAGES.length)
  })
})
