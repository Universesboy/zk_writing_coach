import { deriveErrorTags } from './errorTags'
import { HistoryItem } from './types'

type Props = {
  history: HistoryItem[]
  selectedStudent: string
}

export function CoachDashboard({ history, selectedStudent }: Props) {
  const totalSubmissions = history.length
  const averageScore = totalSubmissions
    ? (history.reduce((sum, item) => sum + item.score, 0) / totalSubmissions).toFixed(1)
    : '--'
  const aiCount = history.filter((item) => item.engine === 'ai').length
  const latest = history[0]

  const tagCounts = history.reduce<Record<string, number>>((acc, item) => {
    deriveErrorTags(item).forEach((tag) => {
      acc[tag] = (acc[tag] || 0) + 1
    })
    return acc
  }, {})

  const topTag = Object.entries(tagCounts).sort((a, b) => b[1] - a[1])[0]

  return (
    <section className="coachSection coachDashboardSection">
      <div className="coachHeader">
        <div>
          <p className="eyebrow">Coach Dashboard</p>
          <h2>{selectedStudent || '全体学生'}工作台</h2>
        </div>
        <p className="coachDescription">把当前筛选结果聚合成教练视角的训练面板，更适合日常复盘与管理。</p>
      </div>

      <div className="coachMetricsGrid">
        <article className="coachMetricCard">
          <span>批改总数</span>
          <strong>{totalSubmissions}</strong>
          <p>当前筛选范围内的作文记录</p>
        </article>

        <article className="coachMetricCard">
          <span>平均分</span>
          <strong>{averageScore}</strong>
          <p>用于观察整体训练趋势</p>
        </article>

        <article className="coachMetricCard">
          <span>AI 批改占比</span>
          <strong>{totalSubmissions ? `${Math.round((aiCount / totalSubmissions) * 100)}%` : '--'}</strong>
          <p>真实模型与兜底模式的分布</p>
        </article>

        <article className="coachMetricCard wideCoachCard">
          <span>高频问题标签</span>
          <strong>{topTag?.[0] || '暂无'}</strong>
          <p>{topTag ? `出现 ${topTag[1]} 次，可优先针对训练。` : '还没有可展示的数据'}</p>
        </article>
      </div>
    </section>
  )
}
