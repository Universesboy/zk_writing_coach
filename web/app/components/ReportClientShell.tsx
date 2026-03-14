'use client'

import { useMemo, useState } from 'react'
import { CoachNoteEditor } from './CoachNoteEditor'
import { CoachNoteCard } from './CoachNoteCard'
import { ParentSummaryCard } from './ParentSummaryCard'
import { ReportActions } from './ReportActions'
import { ScoreTrendChart } from './ScoreTrendChart'

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
export type StudentReport = {
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

export function ReportClientShell({ report, apiBase }: { report: StudentReport; apiBase: string }) {
  const [view, setView] = useState<'parent' | 'coach'>('parent')

  const topTags = useMemo(() => report.top_error_tags.map((item) => item.tag), [report.top_error_tags])

  return (
    <main className="reportPage">
      <ReportActions />

      <section className="reportViewTabs noPrint">
        <button className={view === 'parent' ? 'tabBtn tabBtnActive' : 'tabBtn'} onClick={() => setView('parent')}>
          家长版
        </button>
        <button className={view === 'coach' ? 'tabBtn tabBtnActive' : 'tabBtn'} onClick={() => setView('coach')}>
          教练版
        </button>
      </section>

      <section className="reportHero">
        <p className="eyebrow">Student Report</p>
        <h1>{report.student_name} 阶段训练报告</h1>
        <p className="subtitle">{report.stage_summary}</p>
      </section>

      {view === 'parent' ? (
        <>
          <ParentSummaryCard
            studentName={report.student_name}
            averageScore={report.average_score}
            bestScore={report.best_score}
            topTags={topTags}
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
        </>
      ) : (
        <>
          <section className="reportMetricsGrid">
            <article className="coachMetricCard"><span>训练次数</span><strong>{report.total_submissions}</strong></article>
            <article className="coachMetricCard"><span>平均分</span><strong>{report.average_score}</strong></article>
            <article className="coachMetricCard"><span>最高分</span><strong>{report.best_score}</strong></article>
            <article className="coachMetricCard"><span>最新成绩</span><strong>{report.latest_score}/15 · {report.latest_level}</strong></article>
          </section>

          <section className="reportSection">
            <div className="coachHeader"><div><p className="eyebrow">Focus</p><h2>高频问题标签</h2></div></div>
            <div className="tagCloud">{report.top_error_tags.map((item) => <div className="errorTag" key={item.tag}>{item.tag} · {item.count}</div>)}</div>
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

          <CoachNoteEditor studentName={report.student_name} apiBase={apiBase} initialNote={report.coach_note || ''} />
        </>
      )}

      <section className="reportSection">
        <div className="coachHeader"><div><p className="eyebrow">Recent Records</p><h2>最近作文样本</h2></div></div>
        <div className="historyList">
          {report.recent_records.map((item) => (
            <article key={item.submission_id} className="historyCard premiumHistoryCard">
              <div className="historyCardTop">
                <strong>{item.prompt}</strong>
                <span>{item.score}/15 · {item.level}</span>
              </div>
              <p className="historyEssay">{item.essay}</p>
              <p className="historyEngine">标签：{item.error_tags.join('、')}</p>
            </article>
          ))}
        </div>
      </section>

      <div className="printOnly">
        <CoachNoteCard note={report.coach_note || '暂无教练备注。'} />
      </div>
    </main>
  )
}
