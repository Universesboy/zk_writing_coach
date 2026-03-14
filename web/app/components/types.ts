export type Suggestion = {
  original: string
  improved: string
  reason: string
}

export type GradeResponse = {
  submission_id: string
  score: number
  level: string
  strengths: string[]
  improvements: string[]
  sentence_suggestions: Suggestion[]
  polished_essay: string
  error_tags: string[]
  training_suggestions: string[]
  created_at: string
  engine: string
}

export type HistoryItem = GradeResponse & {
  prompt: string
  essay: string
  student_name?: string | null
}
