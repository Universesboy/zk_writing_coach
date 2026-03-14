import { HistoryItem } from './types'

export function deriveErrorTags(item: HistoryItem): string[] {
  return item.error_tags?.length ? item.error_tags : ['表达']
}
