type Props = {
  scores: number[]
}

export function ScoreTrendChart({ scores }: Props) {
  if (scores.length === 0) {
    return <div className="detailBox">暂无趋势数据</div>
  }

  const maxScore = 15
  const width = 100
  const height = 44
  const stepX = scores.length > 1 ? width / (scores.length - 1) : 0
  const points = scores
    .map((score, index) => {
      const x = Number((index * stepX).toFixed(2))
      const y = Number((height - (score / maxScore) * height).toFixed(2))
      return `${x},${y}`
    })
    .join(' ')

  return (
    <div className="trendChartShell">
      <svg viewBox={`0 0 ${width} ${height}`} className="trendChart" preserveAspectRatio="none">
        <polyline fill="none" stroke="currentColor" strokeWidth="2.5" points={points} />
        {scores.map((score, index) => {
          const x = Number((index * stepX).toFixed(2))
          const y = Number((height - (score / maxScore) * height).toFixed(2))
          return <circle key={`${score}-${index}`} cx={x} cy={y} r="2.8" fill="currentColor" />
        })}
      </svg>
      <div className="trendLabels">
        {scores.map((score, index) => (
          <span key={`${score}-${index}`}>{score}</span>
        ))}
      </div>
    </div>
  )
}
