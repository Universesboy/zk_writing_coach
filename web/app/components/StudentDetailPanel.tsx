'use client'

import { deriveErrorTags } from './errorTags'
import { HistoryItem } from './types'

type Props = {
  selectedStudent: string
  history: HistoryItem[]
}

export function StudentDetailPanel({ selectedStudent, history }: Props) {
  const latest = history[0]
  const avgScore = history.length
    ? (history.reduce((sum, item) => sum + item.score, 0) / history.length).toFixed(1)
    : '--'

  const tagCounts = history.reduce<Record<string, number>>((acc, item) => {
    deriveErrorTags(item).forEach((tag) => {
      acc[tag] = (acc[tag] || 0) + 1
    })
    return acc
  }, {})

  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  return (
    <section className="coachSection studentDetailSection">
      <div className="coachHeader">
        <div>
          <p className="eyebrow">Student Detail</p>
          <h2>{selectedStudent || '未选择学生'}</h2>
        </div>
        <p className="coachDescription">查看单个学生的近期表现、训练次数、高频问题标签与训练建议。</p>
      </div>

      {!selectedStudent ? (
        <div className="emptyState compact">
          <p>在上方学生管理视图中选择一位学生，即可查看详情。</p>
        </div>
      ) : (
        <div className="studentDetailGrid">
          <article className="coachMetricCard">
            <span>训练次数</span>
            <strong>{history.length}</strong>
            <p>该学生累计已保存的作文记录</p>
          </article>

          <article className="coachMetricCard">
            <span>平均分</span>
            <strong>{avgScore}</strong>
            <p>用于观察阶段性写作表现</p>
          </article>

          <article className="coachMetricCard wideCoachCard">
            <span>最近一次作文</span>
            <strong>{latest?.score ?? '--'}/15 · {latest?.level ?? '--'}</strong>
            <p>{latest?.prompt || '暂无最近记录'}</p>
          </article>

          <article className="studentInsightCard">
            <span>高频错误标签</span>
            <div className="tagCloud">
              {topTags.length > 0 ? topTags.map(([tag, count]) => (
                <div className="errorTag" key={tag}>{tag} · {count}</div>
              )) : <div className="errorTag">暂无标签</div>}
            </div>
          </article>

          <article className="studentInsightCard">
            <span>训练建议</span>
            <ul className="detailList">
              {(latest?.training_suggestions || []).map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </article>

          <article className="studentInsightCard">
            <span>代表性润色参考</span>
            <div className="detailBox detailEssay">{latest?.polished_essay || '暂无润色参考内容'}</div>
          </article>
        </div>
      )}
    </section>
  )
}
