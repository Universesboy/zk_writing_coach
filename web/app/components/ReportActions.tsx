'use client'

import Link from 'next/link'

export function ReportActions({ studentName }: { studentName: string }) {
  return (
    <div className="reportActionsBar noPrint">
      <div className="reportNavGroup">
        <Link href="/" className="reportNavLink">
          ← 返回首页
        </Link>
        <Link href={`/parents/${encodeURIComponent(studentName)}`} className="reportNavLink">
          家长版纯净页
        </Link>
      </div>
      <button className="secondaryBtn" onClick={() => window.print()}>
        打印 / 导出 PDF
      </button>
    </div>
  )
}
