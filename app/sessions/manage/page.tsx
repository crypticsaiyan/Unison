"use client"

import { useState } from "react"
import Link from "next/link"
import { Grid, GridColumn, GridToolbar } from "@progress/kendo-react-grid"
import { Dialog, DialogActionsBar } from "@progress/kendo-react-dialogs"
import { DropDownList } from "@progress/kendo-react-dropdowns"
import { Button } from "@/components/ui/button"
import { Plus, PencilSimple, Trash, ArrowLeft, CalendarBlank } from "@phosphor-icons/react"
import { useSessions } from "@/hooks/use-sessions"
import type { ConferenceSession } from "@/lib/event-config"

const TRACKS = ["Main Stage", "Workshop", "Panel", "Lightning Talk"]

const EMPTY: Partial<ConferenceSession> = {
  name: "",
  speaker: "",
  startTime: "",
  track: "Main Stage",
  description: "",
}

export default function ManageSessionsPage() {
  const { sessions, loading, error, createSession, updateSession, deleteSession } = useSessions()
  const [editing, setEditing] = useState<Partial<ConferenceSession> | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<ConferenceSession | null>(null)
  const [saving, setSaving] = useState(false)

  const openNew = () => setEditing({ ...EMPTY })
  const openEdit = (s: ConferenceSession) => setEditing({ ...s })

  const save = async () => {
    if (!editing?.name?.trim()) return
    setSaving(true)
    if (editing.id) {
      await updateSession(editing.id, editing)
    } else {
      await createSession(editing)
    }
    setSaving(false)
    setEditing(null)
  }

  const doDelete = async () => {
    if (confirmDelete) await deleteSession(confirmDelete.id)
    setConfirmDelete(null)
  }

  return (
    <div className="min-h-screen bg-background px-4 pb-16 pt-24 md:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Link
              href="/sessions"
              className="mb-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-[var(--color-keppel-400)]"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to schedule
            </Link>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              <CalendarBlank className="h-6 w-6 text-[var(--color-keppel-400)]" weight="fill" />
              Manage Sessions
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Add, edit and remove conference sessions. Changes are saved on the server.
            </p>
          </div>
          <Button onClick={openNew} className="gap-2">
            <Plus className="h-4 w-4" /> Add Session
          </Button>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Grid */}
        <div className="rounded-xl border border-[var(--color-baltic-sea-700)] bg-[var(--color-baltic-sea-900)] p-1">
          <Grid data={sessions} style={{ background: "transparent" }}>
            <GridToolbar>
              <span className="px-2 text-sm text-muted-foreground">
                {loading ? "Loading…" : `${sessions.length} session${sessions.length === 1 ? "" : "s"}`}
              </span>
            </GridToolbar>
            <GridColumn field="startTime" title="Time" width="90px" />
            <GridColumn field="name" title="Session" />
            <GridColumn field="speaker" title="Speaker" />
            <GridColumn field="track" title="Track" width="130px" />
            <GridColumn
              title="Actions"
              width="130px"
              cells={{ data: (props: any) => (
                <td>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEdit(props.dataItem)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-[var(--color-baltic-sea-800)] hover:text-[var(--color-keppel-400)]"
                      aria-label="Edit"
                    >
                      <PencilSimple className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(props.dataItem)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-[var(--color-baltic-sea-800)] hover:text-destructive"
                      aria-label="Delete"
                    >
                      <Trash className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              )}}
            />
          </Grid>
        </div>
      </div>

      {/* Add / Edit dialog */}
      {editing && (
        <Dialog
          title={editing.id ? "Edit Session" : "Add Session"}
          onClose={() => setEditing(null)}
          width={480}
        >
          <div className="flex flex-col gap-4 py-1">
            <Field label="Session name *">
              <input
                value={editing.name || ""}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="Keynote: The Future of React"
                className={inputCls}
              />
            </Field>
            <Field label="Speaker">
              <input
                value={editing.speaker || ""}
                onChange={(e) => setEditing({ ...editing, speaker: e.target.value })}
                placeholder="Jane Doe · Acme"
                className={inputCls}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Start time">
                <input
                  value={editing.startTime || ""}
                  onChange={(e) => setEditing({ ...editing, startTime: e.target.value })}
                  placeholder="09:30"
                  className={inputCls}
                />
              </Field>
              <Field label="Track">
                <DropDownList
                  data={TRACKS}
                  value={editing.track || "Main Stage"}
                  onChange={(e) => setEditing({ ...editing, track: e.value })}
                  style={{ width: "100%" }}
                />
              </Field>
            </div>
            <Field label="Description">
              <textarea
                value={editing.description || ""}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                placeholder="A short summary of the talk…"
                rows={3}
                className={inputCls + " resize-none"}
              />
            </Field>
          </div>
          <DialogActionsBar>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving || !editing.name?.trim()}>
              {saving ? "Saving…" : editing.id ? "Save changes" : "Add session"}
            </Button>
          </DialogActionsBar>
        </Dialog>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <Dialog title="Delete session?" onClose={() => setConfirmDelete(null)} width={400}>
          <p className="py-2 text-sm text-[var(--color-baltic-sea-200)]">
            Remove <span className="font-semibold">{confirmDelete.name}</span> from the schedule? This
            can't be undone.
          </p>
          <DialogActionsBar>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={doDelete}>
              Delete
            </Button>
          </DialogActionsBar>
        </Dialog>
      )}
    </div>
  )
}

const inputCls =
  "w-full rounded-lg border border-[var(--color-baltic-sea-700)] bg-[var(--color-baltic-sea-950)] px-3 py-2 text-sm outline-none focus:border-[var(--color-keppel-500)]"

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}
