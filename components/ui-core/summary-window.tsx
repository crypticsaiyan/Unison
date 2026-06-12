"use client"

import { useState, useCallback } from "react"
import { Window } from "@progress/kendo-react-dialogs"
import { Button } from "@/components/ui/button"
import { SpinnerGap, DownloadSimple, FileText } from "@phosphor-icons/react"

interface SummaryData {
  takeaways: string[]
  technologies: string[]
  snippets: string[]
  error?: string
}

interface SummaryWindowProps {
  sessionId: string
  sessionName: string
  onClose: () => void
}

export function SummaryWindow({ sessionId, sessionName, onClose }: SummaryWindowProps) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<SummaryData | null>(null)
  const [started, setStarted] = useState(false)

  const generate = useCallback(async () => {
    setStarted(true)
    setLoading(true)
    try {
      const res = await fetch("/api/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      })
      const json = await res.json()
      setData(json)
    } catch {
      setData({ takeaways: [], technologies: [], snippets: [], error: "Failed to generate summary." })
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  const downloadMarkdown = useCallback(() => {
    if (!data) return
    const md = [
      `# ${sessionName}: Summary`,
      "",
      "## Key Takeaways",
      ...data.takeaways.map((t) => `- ${t}`),
      "",
      "## Technologies & Tools",
      ...(data.technologies.length ? data.technologies.map((t) => `- ${t}`) : ["- None mentioned"]),
      "",
      "## Code Snippets",
      ...(data.snippets.length ? data.snippets.map((s) => "```\n" + s + "\n```") : ["None mentioned"]),
    ].join("\n")
    const blob = new Blob([md], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${sessionId}-summary.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [data, sessionId, sessionName])

  return (
    <Window
      title={`Post-Talk Summary: ${sessionName}`}
      onClose={onClose}
      initialWidth={560}
      initialHeight={560}
      modal
    >
      <div className="flex h-full flex-col gap-4 p-2 text-[var(--color-baltic-sea-100)]">
        {!started && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <FileText className="h-10 w-10 text-[var(--color-keppel-400)]" />
            <p className="max-w-xs text-sm text-muted-foreground">
              Generate an AI summary of this talk from the full transcript: takeaways, tools, and code.
            </p>
            <Button onClick={generate}>Generate Summary</Button>
          </div>
        )}

        {loading && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
            <SpinnerGap className="h-8 w-8 animate-spin" weight="bold" />
            <span className="text-sm">Summarising the talk…</span>
          </div>
        )}

        {!loading && data?.error && (
          <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-muted-foreground">
            {data.error}
          </div>
        )}

        {!loading && data && !data.error && (
          <div className="flex-1 space-y-4 overflow-y-auto pr-1">
            <section>
              <h3 className="mb-2 text-sm font-semibold text-[var(--color-keppel-400)]">Key Takeaways</h3>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {data.takeaways.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </section>
            {data.technologies.length > 0 && (
              <section>
                <h3 className="mb-2 text-sm font-semibold text-[var(--color-keppel-400)]">Technologies & Tools</h3>
                <div className="flex flex-wrap gap-2">
                  {data.technologies.map((t, i) => (
                    <span key={i} className="rounded-full bg-[var(--color-baltic-sea-800)] px-2.5 py-1 text-xs">{t}</span>
                  ))}
                </div>
              </section>
            )}
            {data.snippets.length > 0 && (
              <section>
                <h3 className="mb-2 text-sm font-semibold text-[var(--color-keppel-400)]">Code Snippets</h3>
                {data.snippets.map((s, i) => (
                  <pre key={i} className="mb-2 overflow-x-auto rounded-lg bg-[var(--color-baltic-sea-950)] p-3 text-xs">
                    <code>{s}</code>
                  </pre>
                ))}
              </section>
            )}
          </div>
        )}

        {!loading && data && !data.error && (
          <div className="flex justify-end border-t border-[var(--color-baltic-sea-800)] pt-3">
            <Button variant="outline" onClick={downloadMarkdown} className="gap-2">
              <DownloadSimple className="h-4 w-4" /> Download .md
            </Button>
          </div>
        )}
      </div>
    </Window>
  )
}
