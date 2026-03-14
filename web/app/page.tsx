'use client'

import { useEffect, useMemo, useState } from 'react'
import { CoachDashboard } from './components/CoachDashboard'
import { EssayForm } from './components/EssayForm'
import { HistoryDetailDrawer } from './components/HistoryDetailDrawer'
import { HistoryPanel } from './components/HistoryPanel'
import { ProductHeader } from './components/ProductHeader'
import { ResultPanel } from './components/ResultPanel'
import { ScoreHighlights } from './components/ScoreHighlights'
import { StudentDetailPanel } from './components/StudentDetailPanel'
import { StudentOverviewPanel } from './components/StudentOverviewPanel'
import { Toast } from './components/Toast'
import { WorkspaceSection } from './components/WorkspaceSection'
import { GradeResponse, HistoryItem } from './components/types'

const API_BASE = 'https://zk-writing-coach.onrender.com'

export default function Page() {
  const [prompt, setPrompt] = useState('请介绍你最喜欢的一位老师')
  const [studentName, setStudentName] = useState('')
  const [essay, setEssay] = useState('My favorite teacher is Ms Li. She is very kind and helpful. She always helps me with English. I like her very much.')
  const [result, setResult] = useState<GradeResponse | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [selectedHistory, setSelectedHistory] = useState<HistoryItem | null>(null)
  const [selectedStudent, setSelectedStudent] = useState('')
  const [loading, setLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' | 'info' } | null>(null)

  async function fetchHistory() {
    setHistoryLoading(true)
    try {
      const res = await fetch(`${API_BASE}/history?limit=30`, { cache: 'no-store' })
      if (!res.ok) {
        throw new Error(`历史记录加载失败: ${res.status}`)
      }
      const data: HistoryItem[] = await res.json()
      setHistory(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : '历史记录加载失败'
      setError(message)
      setToast({ message, tone: 'error' })
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 2600)
    return () => window.clearTimeout(timer)
  }, [toast])

  
  async function handleImageSubmit(file: File) {
    setLoading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('prompt', prompt)
      if (studentName) formData.append('student_name', studentName)

      const res = await fetch(`${API_BASE}/grade/image`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        throw new Error(`请求失败: ${res.status}`)
      }

      const data = await res.json()
      setResult(data)
      await fetchHistory()
      setToast({
        message: '照片解析并批改完成，结果已保存。',
        tone: 'success',
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : '请求失败'
      setError(message)
      setToast({ message, tone: 'error' })
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          essay,
          student_name: studentName || undefined,
        }),
      })

      if (!res.ok) {
        throw new Error(`请求失败: ${res.status}`)
      }

      const data: GradeResponse = await res.json()
      setResult(data)
      await fetchHistory()
      setToast({
        message: data.engine === 'ai' ? 'GPT-5.4 批改完成，结果已保存。' : '已完成批改，并使用规则模式兜底保存。',
        tone: 'success',
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : '请求失败'
      setError(message)
      setToast({ message, tone: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const latestEngine = useMemo(() => {
    return result?.engine || history[0]?.engine || null
  }, [result, history])

  const studentOptions = useMemo(() => {
    return Array.from(new Set(history.map((item) => item.student_name?.trim()).filter(Boolean) as string[]))
  }, [history])

  const studentSummaries = useMemo(() => {
    return studentOptions.map((name) => {
      const items = history.filter((item) => (item.student_name || '') === name)
      const latest = items[0]
      const avg = items.length ? Number((items.reduce((sum, item) => sum + item.score, 0) / items.length).toFixed(1)) : null
      return {
        name,
        count: items.length,
        latestScore: latest?.score ?? null,
        avgScore: avg,
      }
    })
  }, [history, studentOptions])

  const filteredHistory = useMemo(() => {
    if (!selectedStudent) return history
    return history.filter((item) => (item.student_name || '') === selectedStudent)
  }, [history, selectedStudent])

  return (
    <>
      <main className="page productPage">
        <ProductHeader apiBase={API_BASE} latestEngine={latestEngine} historyCount={filteredHistory.length} />

        <StudentOverviewPanel
          students={studentSummaries}
          selectedStudent={selectedStudent}
          onSelectStudent={setSelectedStudent}
        />

        <CoachDashboard history={filteredHistory} selectedStudent={selectedStudent} />

        <StudentDetailPanel selectedStudent={selectedStudent} history={filteredHistory} />

        <ScoreHighlights result={result} />

        <WorkspaceSection
          title="作文批改工作台"
          description="左侧输入作文，中间查看本次批改结果，右侧管理历史记录。现在支持交互反馈、学生筛选、历史详情与教练视图。"
        >
          <section className="grid threeCols">
            <EssayForm
              onImageSubmit={handleImageSubmit}
              prompt={prompt}
              setPrompt={setPrompt}
              studentName={studentName}
              setStudentName={setStudentName}
              essay={essay}
              setEssay={setEssay}
              loading={loading}
              error={error}
              onSubmit={handleSubmit}
            />

            <ResultPanel result={result} />

            <HistoryPanel
              history={filteredHistory}
              historyLoading={historyLoading}
              selectedStudent={selectedStudent}
              studentOptions={studentOptions}
              onStudentFilterChange={setSelectedStudent}
              onRefresh={fetchHistory}
              onViewDetail={(item) => setSelectedHistory(item)}
              onLoad={(item) => {
                setResult(item)
                setPrompt(item.prompt)
                setEssay(item.essay)
                setStudentName(item.student_name || '')
                setToast({ message: '已载入历史记录到编辑器。', tone: 'info' })
              }}
            />
          </section>
        </WorkspaceSection>
      </main>

      <HistoryDetailDrawer
        item={selectedHistory}
        onClose={() => setSelectedHistory(null)}
        onLoad={(item) => {
          setResult(item)
          setPrompt(item.prompt)
          setEssay(item.essay)
          setStudentName(item.student_name || '')
          setSelectedHistory(null)
          setToast({ message: '历史详情已载入编辑器。', tone: 'info' })
        }}
      />

      {toast ? <Toast message={toast.message} tone={toast.tone} /> : null}
    </>
  )
}
