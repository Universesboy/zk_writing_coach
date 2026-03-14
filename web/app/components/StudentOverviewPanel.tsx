'use client'

import Link from 'next/link'

type StudentSummary = {
  name: string
  count: number
  latestScore: number | null
  avgScore: number | null
}

type Props = {
  students: StudentSummary[]
  selectedStudent: string
  onSelectStudent: (name: string) => void
}

export function StudentOverviewPanel({ students, selectedStudent, onSelectStudent }: Props) {
  return (
    <section className="coachSection">
      <div className="coachHeader">
        <div>
          <p className="eyebrow">Coach Mode</p>
          <h2>学生管理视图</h2>
        </div>
        <p className="coachDescription">按学生快速切换，查看每位学生的训练频次与最近状态，也可直接进入学生报告页。</p>
      </div>

      <div className="studentGrid">
        <button
          className={`studentCard ${selectedStudent === '' ? 'studentCardActive' : ''}`}
          onClick={() => onSelectStudent('')}
        >
          <span>全部学生</span>
          <strong>{students.length}</strong>
          <p>查看所有学生的批改记录</p>
        </button>

        {students.map((student) => (
          <div
            key={student.name}
            className={`studentCard studentCardShell ${selectedStudent === student.name ? 'studentCardActive' : ''}`}
          >
            <button className="studentCardButton" onClick={() => onSelectStudent(student.name)}>
              <span>{student.name}</span>
              <strong>{student.latestScore ?? '--'}/15</strong>
              <p>{student.count} 次批改 · 平均 {student.avgScore ?? '--'} 分</p>
            </button>
            <Link className="studentReportLink" href={`/students/${encodeURIComponent(student.name)}`}>
              查看报告
            </Link>
          </div>
        ))}
      </div>
    </section>
  )
}
