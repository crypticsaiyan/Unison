"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { DotGlobe } from "@/components/dot-globe"
import {
  Microphone,
  Translate,
  SpeakerHigh,
  ArrowRight,
  Waveform,
  Globe,
  Lightning,
  ChartLineUp,
  ChatCircleDots,
  ChartDonut,
  GridFour,
  Gauge,
} from "@phosphor-icons/react"

const LANGUAGES = [
  "हिन्दी", "Español", "Français", "Deutsch", "日本語", "Italiano",
  "Português", "العربية", "한국어", "Nederlands", "English",
]

// "language" in each language, ending with English
const LANGUAGE_WORDS = [
  "भाषा",       // Hindi
  "idioma",     // Spanish
  "langue",     // French
  "Sprache",    // German
  "言語",        // Japanese
  "lingua",     // Italian
  "idioma",     // Portuguese
  "لغة",        // Arabic
  "언어",        // Korean
  "taal",       // Dutch
  "language",   // English — final
]

const CYCLE_INTERVAL = 600   // ms between words
const PAUSE_ON_ENGLISH = 4000 // ms to rest on "language" before restarting

function CyclingWord() {
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(true)
  const final = index === LANGUAGE_WORDS.length - 1

  useEffect(() => {
    const delay = final ? PAUSE_ON_ENGLISH : CYCLE_INTERVAL
    const fadeOut = !final ? setTimeout(() => setVisible(false), CYCLE_INTERVAL - 180) : undefined
    const next = setTimeout(() => {
      setIndex((i) => (i + 1) % LANGUAGE_WORDS.length)
      setVisible(true)
    }, delay)
    return () => { if (fadeOut) clearTimeout(fadeOut); clearTimeout(next) }
  }, [index, final])

  return (
    <span
      className="inline-block transition-opacity duration-150"
      style={{ opacity: visible ? 1 : 0 }}
    >
      {LANGUAGE_WORDS[index]}
    </span>
  )
}

export function LandingPage() {
  return (
    <div className="flex-1 w-full bg-[var(--color-baltic-sea-950)] text-[var(--color-baltic-sea-100)]">
      <div className="h-16" />

      <main>
        {/* ---------------------------------------------------------------- */}
        {/* HERO — asymmetric split: copy left, globe right                  */}
        {/* ---------------------------------------------------------------- */}
        <section className="relative isolate overflow-hidden border-b border-[var(--color-baltic-sea-800)]">
          {/* ambient grid + glow */}
          <div
            className="pointer-events-none absolute inset-0 -z-10 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(var(--color-baltic-sea-200) 1px, transparent 1px), linear-gradient(90deg, var(--color-baltic-sea-200) 1px, transparent 1px)",
              backgroundSize: "64px 64px",
            }}
          />
          <div className="pointer-events-none absolute -top-32 right-0 -z-10 h-[600px] w-[600px] rounded-full bg-[var(--color-keppel-500)]/10 blur-[120px]" />

          <div className="mx-auto grid max-w-[1400px] items-center gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:gap-8 lg:px-12 lg:py-28">
            {/* Left: copy */}
            <div className="relative z-10 text-center lg:text-left">

              <h1 className="mt-6 text-balance text-3xl font-bold leading-[1.1] tracking-tight text-[var(--color-baltic-sea-50)] sm:text-4xl lg:text-5xl">
                Every talk,
                <br />
                in <span className="text-[var(--color-keppel-400)]">every <CyclingWord /></span>,
                <br />
                in real time.
              </h1>

              <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-[var(--color-baltic-sea-300)] lg:mx-0">
                Unison live-dubs a speaker into every attendee's language as they
                talk, and lets the audience ask questions in their own words.
                Real-time STT, translation and neural voices in one pipeline.
              </p>

              <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
                <Button
                  asChild
                  size="lg"
                  className="group w-full bg-[var(--color-keppel-500)] font-semibold text-[var(--color-keppel-950)] shadow-lg shadow-[var(--color-keppel-900)]/30 hover:bg-[var(--color-keppel-400)] sm:w-auto"
                >
                  <Link href="/broadcast">
                    Start a broadcast
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="w-full border-[var(--color-baltic-sea-700)] bg-transparent font-semibold text-[var(--color-baltic-sea-100)] hover:border-[var(--color-keppel-500)] hover:bg-[var(--color-baltic-sea-900)] sm:w-auto"
                >
                  <Link href="/organiser?key=demo">View organiser dashboard</Link>
                </Button>
              </div>

            </div>

            {/* Right: globe */}
            <div className="relative mx-auto aspect-square w-full max-w-[560px]">
              <div className="absolute inset-0 rounded-full bg-[var(--color-keppel-500)]/15 blur-3xl" />
              <DotGlobe className="h-full w-full" />
            </div>
          </div>

          {/* marquee language strip */}
          <div className="relative border-t border-[var(--color-baltic-sea-800)] bg-[var(--color-baltic-sea-900)]/40 py-4">
            <div className="flex items-center gap-8 overflow-hidden">
              <div className="flex shrink-0 animate-[marquee_28s_linear_infinite] items-center gap-8 whitespace-nowrap">
                {[...LANGUAGES, ...LANGUAGES].map((lang, i) => (
                  <span
                    key={i}
                    className="text-sm font-medium text-[var(--color-baltic-sea-400)]"
                  >
                    {lang}
                    <span className="ml-8 text-[var(--color-keppel-700)]">•</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* IMPACT STAT BAND                                                  */}
        {/* ---------------------------------------------------------------- */}
        <section className="border-b border-[var(--color-baltic-sea-800)] bg-[var(--color-baltic-sea-950)]">
          <div className="mx-auto grid max-w-[1400px] grid-cols-2 gap-px overflow-hidden px-4 sm:px-6 lg:grid-cols-4 lg:px-12">
            {[
              { stat: "7", label: "languages dubbed live" },
              { stat: "15+", label: "source languages" },
              { stat: "~3s", label: "speech-to-dub latency" },
              { stat: "2-way", label: "audience Q&A loop" },
            ].map((item) => (
              <div
                key={item.label}
                className="border-x border-[var(--color-baltic-sea-800)] py-10 text-center first:border-l-0"
              >
                <div className="text-3xl font-bold text-[var(--color-keppel-400)]">
                  {item.stat}
                </div>
                <div className="mt-1 text-xs text-[var(--color-baltic-sea-400)]">
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* THE PROBLEM → SOLUTION                                            */}
        {/* ---------------------------------------------------------------- */}
        <section className="border-b border-[var(--color-baltic-sea-800)] py-24 lg:py-32">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-12">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-medium uppercase tracking-wide text-[var(--color-keppel-400)]">
                Why Unison
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--color-baltic-sea-50)] sm:text-3xl">
                Great talks shouldn't be lost in translation.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-[var(--color-baltic-sea-300)]">
                At a global conference, most of the room hears a talk in a language
                that isn't their first. Unison closes that gap instantly, for
                everyone, without interrupting the speaker.
              </p>
            </div>

            <div className="mt-16 grid gap-6 md:grid-cols-3">
              {[
                {
                  icon: Microphone,
                  title: "Speaker talks normally",
                  body: "No scripts, no pauses. The speaker picks a session and starts talking on stage.",
                },
                {
                  icon: Translate,
                  title: "Unison dubs in real time",
                  body: "Speech is transcribed, translated and re-voiced per language with neural TTS in ~3 seconds.",
                },
                {
                  icon: SpeakerHigh,
                  title: "Everyone follows along",
                  body: "Attendees hear the talk in their language and read a live transcript on their device.",
                },
              ].map((step, i) => (
                <div
                  key={step.title}
                  className="group relative rounded-2xl border border-[var(--color-baltic-sea-800)] bg-[var(--color-baltic-sea-900)]/40 p-7 transition-all hover:border-[var(--color-keppel-600)] hover:bg-[var(--color-baltic-sea-900)]"
                >
                  <div className="mb-5 flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-baltic-sea-800)] text-[var(--color-keppel-400)] transition-colors group-hover:bg-[var(--color-keppel-500)] group-hover:text-[var(--color-keppel-950)]">
                      <step.icon className="h-6 w-6" weight="fill" />
                    </div>
                    <span className="text-4xl font-bold text-[var(--color-baltic-sea-800)] transition-colors group-hover:text-[var(--color-keppel-800)]">
                      0{i + 1}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--color-baltic-sea-50)]">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--color-baltic-sea-400)]">
                    {step.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* PRODUCT SURFACES — bento grid                                     */}
        {/* ---------------------------------------------------------------- */}
        <section className="border-b border-[var(--color-baltic-sea-800)] bg-[var(--color-baltic-sea-900)]/20 py-24 lg:py-32">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-12">
            <div className="mb-14 max-w-2xl">
              <p className="text-sm font-medium uppercase tracking-wide text-[var(--color-keppel-400)]">
                One platform, every role
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--color-baltic-sea-50)] sm:text-3xl">
                Built for speakers, attendees and organisers.
              </h2>
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
              {/* Broadcast — large feature */}
              <Link
                href="/broadcast"
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[var(--color-baltic-sea-800)] bg-[var(--color-baltic-sea-950)] p-8 transition-all hover:border-[var(--color-keppel-600)] lg:col-span-2 lg:row-span-2"
              >
                <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[var(--color-keppel-500)]/5 blur-3xl transition-opacity group-hover:bg-[var(--color-keppel-500)]/10" />
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-keppel-500)]/15 text-[var(--color-keppel-400)]">
                    <SpeakerHigh className="h-6 w-6" weight="fill" />
                  </div>
                  <h3 className="mt-5 text-xl font-semibold text-[var(--color-baltic-sea-50)]">
                    Broadcast a session
                  </h3>
                  <p className="mt-3 max-w-md text-sm leading-relaxed text-[var(--color-baltic-sea-300)]">
                    Go live from the stage. Pick a session from the event schedule,
                    choose target languages, and Unison fans your voice out to every
                    listener, dubbed and transcribed, while audience questions come
                    back to you in English.
                  </p>
                </div>
                <span className="mt-8 inline-flex items-center text-sm font-semibold text-[var(--color-keppel-400)]">
                  Open broadcaster
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>

              {/* Organiser dashboard */}
              <Link
                href="/organiser?key=demo"
                className="group relative overflow-hidden rounded-2xl border border-[var(--color-baltic-sea-800)] bg-[var(--color-baltic-sea-950)] p-7 transition-all hover:border-[var(--color-keppel-600)]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-baltic-sea-800)] text-[var(--color-keppel-400)]">
                  <ChartLineUp className="h-5 w-5" weight="fill" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-[var(--color-baltic-sea-50)]">
                  Organiser dashboard
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-baltic-sea-400)]">
                  Live language reach, listener analytics and inclusion metrics.
                </p>
              </Link>

              {/* Q&A */}
              <div className="group relative overflow-hidden rounded-2xl border border-[var(--color-baltic-sea-800)] bg-[var(--color-baltic-sea-950)] p-7">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-baltic-sea-800)] text-[var(--color-keppel-400)]">
                  <ChatCircleDots className="h-5 w-5" weight="fill" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-[var(--color-baltic-sea-50)]">
                  Ask in any language
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-baltic-sea-400)]">
                  Attendees ask questions in their own words, grounded in the live
                  transcript, and the speaker sees them in English.
                </p>
              </div>


            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* TECH STACK                                                        */}
        {/* ---------------------------------------------------------------- */}
        <section className="border-b border-[var(--color-baltic-sea-800)] py-24 lg:py-28">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-12">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div>
                <p className="text-sm font-medium uppercase tracking-wide text-[var(--color-keppel-400)]">
                  Built for real-time
                </p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--color-baltic-sea-50)] sm:text-3xl">
                  A streaming pipeline, end to end.
                </h2>
                <p className="mt-4 max-w-md text-base leading-relaxed text-[var(--color-baltic-sea-300)]">
                  Audio streams in over WebSockets, gets transcribed, translated and
                  re-voiced, then streams back out, all while the speaker keeps
                  talking.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { icon: Waveform, name: "Deepgram", desc: "STT + Aura voices" },
                  { icon: Globe, name: "Google Translate", desc: "Fast neural translation" },
                  { icon: Lightning, name: "WebSockets", desc: "Low-latency streaming" },
                ].map((t) => (
                  <div
                    key={t.name}
                    className="rounded-xl border border-[var(--color-baltic-sea-800)] bg-[var(--color-baltic-sea-950)] p-6"
                  >
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-baltic-sea-800)]">
                      <t.icon className="h-5 w-5 text-[var(--color-keppel-400)]" weight="fill" />
                    </div>
                    <h3 className="font-semibold text-[var(--color-baltic-sea-100)]">
                      {t.name}
                    </h3>
                    <p className="mt-1 text-sm text-[var(--color-baltic-sea-400)]">
                      {t.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* KENDO UI                                                          */}
        {/* ---------------------------------------------------------------- */}
        <section className="border-b border-[var(--color-baltic-sea-800)] bg-[var(--color-baltic-sea-950)] py-24 lg:py-28">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-12">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-medium uppercase tracking-wide text-[var(--color-keppel-400)]">
                Built with Kendo UI for React
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--color-baltic-sea-50)] sm:text-3xl">
                Every surface is a Kendo surface.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-[var(--color-baltic-sea-300)]">
                The attendee and organiser experiences are built end to end on
                Kendo UI for React, from the live transcript feed to the
                analytics dashboard.
              </p>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: Gauge,
                  name: "Charts & Gauges",
                  desc: "Reach gauge, language donut, and listeners-over-time line chart on the organiser dashboard.",
                },
                {
                  icon: GridFour,
                  name: "Grid",
                  desc: "Session schedule and inline session management with sorting and dialogs.",
                },
                {
                  icon: ChatCircleDots,
                  name: "Chat & ListView",
                  desc: "Attendee Q&A chat, transcript feed, and the recent-questions list.",
                },
                {
                  icon: ChartDonut,
                  name: "Indicators & more",
                  desc: "DropDownList, Window, Dialog, ProgressBar, Tooltip, Loader, Skeleton, and Notification throughout.",
                },
              ].map((k) => (
                <div
                  key={k.name}
                  className="rounded-xl border border-[var(--color-baltic-sea-800)] bg-[var(--color-baltic-sea-900)] p-6"
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-baltic-sea-800)]">
                    <k.icon className="h-5 w-5 text-[var(--color-keppel-400)]" weight="fill" />
                  </div>
                  <h3 className="font-semibold text-[var(--color-baltic-sea-100)]">
                    {k.name}
                  </h3>
                  <p className="mt-1 text-sm text-[var(--color-baltic-sea-400)]">
                    {k.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* CTA                                                               */}
        {/* ---------------------------------------------------------------- */}
        <section className="relative overflow-hidden py-24 lg:py-32">
          <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--color-keppel-500)]/10 blur-[120px]" />
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <h2 className="text-3xl font-bold tracking-tight text-[var(--color-baltic-sea-50)] sm:text-4xl">
              Make every seat the best seat.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-base text-[var(--color-baltic-sea-300)]">
              Spin up a session and hear your voice land in another language in
              seconds.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="group w-full bg-[var(--color-keppel-500)] font-semibold text-[var(--color-keppel-950)] hover:bg-[var(--color-keppel-400)] sm:w-auto"
              >
                <Link href="/broadcast">
                  Start a broadcast
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="w-full border-[var(--color-baltic-sea-700)] bg-transparent font-semibold text-[var(--color-baltic-sea-100)] hover:border-[var(--color-keppel-500)] hover:bg-[var(--color-baltic-sea-900)] sm:w-auto"
              >
                <Link href="/sessions">Browse sessions</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="hidden" />
    </div>
  )
}
