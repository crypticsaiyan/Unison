export interface LanguageOption {
  code: string
  name: string
  flag: string
}

// Target Languages (Deepgram Aura-2 TTS support)
export const TTS_LANGUAGES: LanguageOption[] = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "es", name: "Spanish", flag: "🇪🇸" },
  { code: "fr", name: "French", flag: "🇫🇷" },
  { code: "de", name: "German", flag: "🇩🇪" },
  { code: "it", name: "Italian", flag: "🇮🇹" },
  { code: "nl", name: "Dutch", flag: "🇳🇱" },
  { code: "ja", name: "Japanese", flag: "🇯🇵" },
]

// Source Languages (Deepgram Nova-2 STT support)
export const STT_LANGUAGES: LanguageOption[] = [
  { code: "auto", name: "Auto-detect", flag: "🌐" },
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "es", name: "Spanish", flag: "🇪🇸" },
  { code: "fr", name: "French", flag: "🇫🇷" },
  { code: "de", name: "German", flag: "🇩🇪" },
  { code: "it", name: "Italian", flag: "🇮🇹" },
  { code: "nl", name: "Dutch", flag: "🇳🇱" },
  { code: "ja", name: "Japanese", flag: "🇯🇵" },
  { code: "pt", name: "Portuguese", flag: "🇵🇹" },
  { code: "hi", name: "Hindi", flag: "🇮🇳" },
  { code: "ar", name: "Arabic", flag: "🇸🇦" },
  { code: "ko", name: "Korean", flag: "🇰🇷" },
  { code: "tr", name: "Turkish", flag: "🇹🇷" },
  { code: "vi", name: "Vietnamese", flag: "🇻🇳" },
  { code: "uk", name: "Ukrainian", flag: "🇺🇦" },
  { code: "pl", name: "Polish", flag: "🇵🇱" },
]

const ALL_BY_CODE: Record<string, LanguageOption> = {}
for (const l of [...STT_LANGUAGES, ...TTS_LANGUAGES]) {
  if (!ALL_BY_CODE[l.code]) ALL_BY_CODE[l.code] = l
}

export function getLanguage(code: string): LanguageOption {
  return ALL_BY_CODE[code] || { code, name: code.toUpperCase(), flag: "🌐" }
}

export function languageName(code: string): string {
  return getLanguage(code).name
}

export function languageFlag(code: string): string {
  return getLanguage(code).flag
}
