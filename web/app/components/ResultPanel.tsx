'use client'

import { EmptyResultState } from './EmptyResultState'
import { GradeResponse } from './types'

type Props = {
  result: GradeResponse | null
}

export function ResultPanel({ result }: Props) {
  return (
    <div className="panel resultPanel premiumPanel">
      {!result ? (
        <EmptyResultState />
      ) : (
        <>
          <div className="scoreHeader premiumScoreHeader">
            <div>
              <p className="eyebrow">批改结果 · {result.engine === 'ai' ? 'GPT-5.4' : '规则兜底'}</p>
              <h2>{result.level} 级</h2>
              <p className="resultMetaLine">本次输出包含结构建议、句子优化与润色参考。</p>
            </div>
            <div className="scoreBubble">{result.score}/15</div>
          </div>

          <div className="resultGrid">
            <div className="resultBlock featureBlock">
              <h3>优点</h3>
              <ul>
                {result.strengths.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="resultBlock featureBlock">
              <h3>待提升</h3>
              <ul>
                {result.improvements.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="resultBlock">
            <h3>句子优化建议</h3>
            <div className="suggestions premiumSuggestions">
              {result.sentence_suggestions.map((item, idx) => (
                <article className="suggestionCard premiumSuggestionCard" key={`${item.original}-${idx}`}>
                  <p><strong>原句：</strong>{item.original}</p>
                  <p><strong>优化：</strong>{item.improved}</p>
                  <p><strong>原因：</strong>{item.reason}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="resultBlock">
            <h3>润色参考</h3>
            <div className="essayPreview premiumEssayPreview">{result.polished_essay}</div>
          </div>
        </>
      )}
    </div>
  )
}
