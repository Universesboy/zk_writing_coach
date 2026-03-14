'use client'

import { useState } from 'react'

export function CoachNoteEditor({ studentName, apiBase, initialNote }: { studentName: string; apiBase: string; initialNote: string }) {
  const [note, setNote] = useState(initialNote)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ text: string; tone: 'success' | 'error' | 'info' } | null>(null)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)

  async function saveNote() {
    setSaving(true)
    setStatus(null)
    try {
      const res = await fetch(`${apiBase}/students/${encodeURIComponent(studentName)}/note`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coach_note: note }),
      })
      if (!res.ok) throw new Error(`保存失败: ${res.status}`)
      const data = await res.json()
      setUpdatedAt(data.updated_at || null)
      setStatus({ text: '备注已保存成功。', tone: 'success' })
    } catch (e) {
      setStatus({ text: e instanceof Error ? e.message : '保存失败', tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="reportSection">
      <div className="coachHeader">
        <div>
          <p className="eyebrow">Coach Note</p>
          <h2>教练备注（可编辑）</h2>
        </div>
      </div>
      <textarea className="coachNoteTextarea" rows={8} value={note} onChange={(e) => setNote(e.target.value)} placeholder="写下该学生本阶段的训练观察、下阶段安排、与家长沟通要点…" />
      <div className="reportActionsBar">
        <div className="noteStatusGroup">
          {status ? <span className={`noteStatus noteStatus-${status.tone}`}>{status.text}</span> : null}
          {updatedAt ? <span className="noteUpdatedAt">最近保存：{new Date(updatedAt).toLocaleString()}</span> : null}
        </div>
        <button onClick={saveNote} disabled={saving}>{saving ? '保存中...' : '保存备注'}</button>
      </div>
    </section>
  )
}
