type Props = {
  studentName: string
  averageScore: number
  bestScore: number
  topTags: string[]
}

export function ParentSummaryCard({ studentName, averageScore, bestScore, topTags }: Props) {
  return (
    <section className="reportSection parentReadableSection">
      <div className="coachHeader">
        <div>
          <p className="eyebrow">Parent Summary</p>
          <h2>家长可读版总结</h2>
        </div>
      </div>
      <div className="parentSummaryBox">
        <p>
          {studentName} 当前阶段的英语写作整体表现正在逐步稳定，平均分为 <strong>{averageScore}</strong> 分，最好成绩达到 <strong>{bestScore}</strong> 分。
        </p>
        <p>
          目前最需要重点关注的方向主要是：<strong>{topTags.length ? topTags.join('、') : '表达准确性'}</strong>。
        </p>
        <p>
          建议家长重点关注孩子是否按计划完成每周训练，不需要一次追求“写得很难”，先把“写准确、写完整、写通顺”打稳，进步会更明显。
        </p>
      </div>
    </section>
  )
}
