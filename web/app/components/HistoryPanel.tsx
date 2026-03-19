'use client'

import { LoadingSkeleton } from './LoadingSkeleton'
import { HistoryItem } from './types'

type Props = {
  history: HistoryItem[]
  historyLoading: boolean
  selectedStudent: string
  studentOptions: string[]
  onStudentFilterChange: (value: string) => void
  onRefresh: () => void
  onLoad: (item: HistoryItem) => void
  onViewDetail: (item: HistoryItem) => void
  onDelete?: (id: string) => void
}

export function HistoryPanel({
  history,
  historyLoading,
  selectedStudent,
  studentOptions,
  onStudentFilterChange,
  onRefresh,
  onLoad,
  onViewDetail,
  onDelete,
}: Props) {
  return (
    <div className="panel historyPanel premiumPanel">
      <div className="historyHeader">
        <div>
          <p className="eyebrow">History</p>
          <h2>最近批改</h2>
        </div>
        <button className="secondaryBtn" onClick={onRefresh} disabled={historyLoading}>
          {historyLoading ? '刷新中...' : '刷新'}
        </button>
      </div>

      <div className="historyFilterBar">
        <label className="field inlineField">
          <span>按学生筛选</span>
          <select value={selectedStudent} onChange={(e) => onStudentFilterChange(e.target.value)}>
            <option value="">全部学生</option>
            {studentOptions.map((student) => (
              <option key={student} value={student}>
                {student}
              </option>
            ))}
          </select>
        </label>
      </div>

      {historyLoading ? (
        <LoadingSkeleton />
      ) : history.length === 0 ? (
        <div className="emptyState compact">
          <p>{selectedStudent ? '这个学生还没有历史记录。' : '还没有历史记录，先提交一篇作文试试。'}</p>
        </div>
      ) : (
        <div className="historyList">
          {history.map((item) => (
            <article key={item.submission_id} className="historyCard premiumHistoryCard">
              <div className="historyCardTop">
                <strong>{item.student_name || '未命名学生'}</strong>
                <span>{item.score}/15 · {item.level}</span>
              </div>
              <p className="historyPrompt">{item.prompt}</p>
              <p className="historyEssay">{item.essay}</p>
              <p className="historyEngine">来源：{item.engine === 'ai' ? 'GPT-5.4' : '规则兜底'}</p>
              <div className="historyActions">
                <button className="linkBtn" onClick={() => onViewDetail(item)}>
                  查看详情
                </button>
                <button className="linkBtn" onClick={() => onLoad(item)}>
                  载入编辑器
                </button>

                <button className="linkBtn" style={{ color: 'var(--danger)' }} onClick={(e) => { e.stopPropagation(); onDelete?.(item.submission_id); }}>
                  删除
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
