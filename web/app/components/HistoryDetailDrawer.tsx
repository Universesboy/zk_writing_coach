'use client'

import { HistoryItem } from './types'

type Props = {
  item: HistoryItem | null
  onClose: () => void
  onLoad: (item: HistoryItem) => void
}

export function HistoryDetailDrawer({ item, onClose, onLoad }: Props) {
  if (!item) return null

  return (
    <div className="detailOverlay" role="dialog" aria-modal="true" aria-label="历史记录详情">
      <div className="detailBackdrop" onClick={onClose} />
      <aside className="detailDrawer">
        <div className="detailTopBar">
          <div>
            <p className="eyebrow">Record Detail</p>
            <h2>批改详情</h2>
          </div>
          <button className="secondaryBtn" onClick={onClose}>关闭</button>
        </div>

        <div className="detailMetaGrid">
          <article className="detailMetaCard">
            <span>学生</span>
            <strong>{item.student_name || '未命名学生'}</strong>
          </article>
          <article className="detailMetaCard">
            <span>得分</span>
            <strong>{item.score}/15 · {item.level}</strong>
          </article>
          <article className="detailMetaCard">
            <span>引擎</span>
            <strong>{item.engine === 'ai' ? 'GPT-5.4' : '规则兜底'}</strong>
          </article>
        </div>

        <section className="detailSection">
          <h3>作文题目</h3>
          <div className="detailBox">{item.prompt}</div>
        </section>

        <section className="detailSection">
          <h3>原始作文</h3>
          <div className="detailBox detailEssay">{item.essay}</div>
        </section>

        <section className="detailSection">
          <h3>优点</h3>
          <ul className="detailList">
            {item.strengths.map((text) => <li key={text}>{text}</li>)}
          </ul>
        </section>

        <section className="detailSection">
          <h3>待提升</h3>
          <ul className="detailList">
            {item.improvements.map((text) => <li key={text}>{text}</li>)}
          </ul>
        </section>

        <section className="detailSection">
          <h3>句子优化</h3>
          <div className="suggestions">
            {item.sentence_suggestions.map((suggestion, idx) => (
              <article className="suggestionCard" key={`${suggestion.original}-${idx}`}>
                <p><strong>原句：</strong>{suggestion.original}</p>
                <p><strong>优化：</strong>{suggestion.improved}</p>
                <p><strong>原因：</strong>{suggestion.reason}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="detailSection">
          <h3>润色参考</h3>
          <div className="detailBox detailEssay">{item.polished_essay}</div>
        </section>

        <div className="detailActions">
          <button onClick={() => onLoad(item)}>载入到编辑器</button>
        </div>
      </aside>
    </div>
  )
}
