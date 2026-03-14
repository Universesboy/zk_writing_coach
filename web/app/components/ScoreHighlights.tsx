import { GradeResponse } from './types'

type Props = {
  result: GradeResponse | null
}

export function ScoreHighlights({ result }: Props) {
  const engineLabel = result?.engine === 'ai' ? 'GPT-5.4' : result ? '规则兜底' : '待批改'
  const score = result?.score ?? '--'
  const level = result?.level ?? '--'

  return (
    <section className="highlightsGrid">
      <article className="highlightCard highlightCardStrong">
        <span>本次得分</span>
        <strong>{score}</strong>
        <p>/ 15 分 · 中考作文常用量表</p>
      </article>

      <article className="highlightCard">
        <span>等级</span>
        <strong>{level}</strong>
        <p>按 A / B / C / D 四档输出</p>
      </article>

      <article className="highlightCard">
        <span>来源</span>
        <strong>{engineLabel}</strong>
        <p>当前结果的批改引擎</p>
      </article>
    </section>
  )
}
