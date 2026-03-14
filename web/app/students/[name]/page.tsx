import { notFound } from 'next/navigation'
import { ReportClientShell, StudentReport } from '../../components/ReportClientShell'

const API_BASE = 'https://zk-writing-coach.onrender.com'

async function getReport(name: string): Promise<StudentReport> {
  const res = await fetch(`${API_BASE}/students/${encodeURIComponent(name)}/report`, {
    cache: 'no-store',
  })
  if (!res.ok) notFound()
  return res.json()
}

export default async function StudentReportPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params
  const report = await getReport(name)
  return <ReportClientShell report={report} apiBase={API_BASE} />
}
