import { describe, it, expect } from "vitest"
import { convertLiveTranscriptsToSRT, convertUtterancesToSRT } from "@/lib/srt"

describe("convertLiveTranscriptsToSRT", () => {
  it("returns empty string for empty input", () => {
    expect(convertLiveTranscriptsToSRT([])).toBe("")
  })

  it("generates one SRT block for a single transcript", () => {
    const result = convertLiveTranscriptsToSRT([
      { original: "Hello", translated: "Hola", timestamp: 0 },
    ])
    expect(result).toContain("1\n")
    expect(result).toContain("Hola")
    expect(result).toContain("00:00:00,000 --> 00:00:03,000")
  })

  it("sets end time from next transcript timestamp", () => {
    const result = convertLiveTranscriptsToSRT([
      { original: "Hello", translated: "Hola", timestamp: 0 },
      { original: "World", translated: "Mundo", timestamp: 2000 },
    ])
    expect(result).toContain("00:00:00,000 --> 00:00:02,000")
    expect(result).toContain("00:00:02,000 --> 00:00:05,000")
  })

  it("caps end time at 5s past start when gap is large", () => {
    const result = convertLiveTranscriptsToSRT([
      { original: "A", translated: "A", timestamp: 0 },
      { original: "B", translated: "B", timestamp: 10000 },
    ])
    expect(result).toContain("00:00:00,000 --> 00:00:05,000")
  })

  it("numbers blocks sequentially", () => {
    const transcripts = Array.from({ length: 3 }, (_, i) => ({
      original: `Line ${i}`,
      translated: `Línea ${i}`,
      timestamp: i * 1000,
    }))
    const result = convertLiveTranscriptsToSRT(transcripts)
    expect(result).toContain("1\n")
    expect(result).toContain("2\n")
    expect(result).toContain("3\n")
  })
})

describe("convertUtterancesToSRT", () => {
  it("returns empty string for empty input", () => {
    expect(convertUtterancesToSRT([])).toBe("")
  })

  it("converts utterance seconds to SRT timestamps", () => {
    const result = convertUtterancesToSRT([
      { start: 0, end: 1.5, translated: "Hello" },
    ])
    expect(result).toContain("00:00:00,000 --> 00:00:01,500")
    expect(result).toContain("Hello")
  })

  it("generates correct block index for multiple utterances", () => {
    const result = convertUtterancesToSRT([
      { start: 0, end: 1, translated: "One" },
      { start: 2, end: 3, translated: "Two" },
    ])
    expect(result).toContain("1\n")
    expect(result).toContain("2\n")
  })
})
