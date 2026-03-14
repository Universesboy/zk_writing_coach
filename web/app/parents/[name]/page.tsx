import { notFound } from 'next/navigation'
import { ParentSummaryCard } from '../../components/ParentSummaryCard'
import { ScoreTrendChart } from '../../components/ScoreTrendChart'

const API_BASE = 'http://127.0.0.1:8000'

type TagCount = { tag: string; count: number }
type Suggestion = { original: string; improved: string; reason: string }
type HistoryItem = {
  submission_id: string
  prompt: string
  essay: string
  student_name?: string | null
  score: number
  level: string
  strengths: string[]
  improvements: string[]
  sentence_suggestions: Suggestion[]
  polished_essay: string
  error_tags: string[]
  training_suggestions: string[]
  created_at: string
  engine: string
}
type StudentReport = {
  student_name: string
  total_submissions: number
  average_score: number
  best_score: number
  latest_score: number
  latest_level: string
  score_trend: number[]
  top_error_tags: TagCount[]
  recent_training_suggestions: string[]
  stage_summary: string
  next_stage_plan: string[]
  recent_records: HistoryItem[]
  coach_note?: string
}

async function getReport(name: string): Promise<StudentReport> {
  const res = await fetch(`${API_BASE}/students/${encodeURIComponent(name)}/report`, { cache: 'no-store' })
  if (!res.ok) notFound()
  return res.json()
}

export default async function ParentExportPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params
  const report = await getReport(name)

  return (
    <main className="reportPage parentExportPage">
      <section className="reportHero">
        <p className="eyebrow">Parent Version</p>
        <h1>{report.student_name} 学习阶段反馈</h1>
        <p className="subtitle">{report.stage_summary}</p>
      </section>

      <ParentSummaryCard
        studentName={report.student_name}
        averageScore={report.average_score}
        bestScore={report.best_score}
        topTags={report.top_error_tags.map((item) => item.tag)}
      />

      <section className="reportMetricsGrid">
        <article className="coachMetricCard"><span>训练次数</span><strong>{report.total_submissions}</strong></article>
        <article className="coachMetricCard"><span>平均分</span><strong>{report.average_score}</strong></article>
        <article className="coachMetricCard"><span>最高分</span><strong>{report.best_score}</strong></article>
        <article className="coachMetricCard"><span>最新成绩</span><strong>{report.latest_score}/15 · {report.latest_level}</strong></article>
      </section>

      <section className="reportSection">
        <div className="coachHeader"><div><p className="eyebrow">Trend</p><h2>成绩趋势图</h2></div></div>
        <ScoreTrendChart scores={report.score_trend} />
      </section>

      <section className="reportSection reportTwoCols">
        <article className="studentInsightCard">
          <span>下一阶段训练计划</span>
          <ul className="detailList">{report.next_stage_plan.map((item) => <li key={item}>{item}</li>)}</ul>
        </article>
        <article className="studentInsightCard">
          <span>最近训练建议</span>
          <ul className="detailList">{report.recent_training_suggestions.map((item) => <li key={item}>{item}</li>)}</ul>
        </article>
      </section>
    </main>
  )
}
