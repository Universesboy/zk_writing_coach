type Props = {
  message: string
  tone?: 'success' | 'error' | 'info'
}

export function Toast({ message, tone = 'info' }: Props) {
  return <div className={`toast toast-${tone}`}>{message}</div>
}
