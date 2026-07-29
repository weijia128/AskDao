import { applyHistoryRecordPatch, formatHistoryCreatedAt, removeHistoryRecord } from './storage.core'

const HISTORY_KEY = 'askdao_history_records'
const LATEST_RESULT_KEY = 'askdao_latest_result'

export function getHistoryRecords<T>(): T[] {
  return wx.getStorageSync(HISTORY_KEY) || []
}

export function saveHistoryRecord<T>(record: T): void {
  const records = getHistoryRecords<T>()
  wx.setStorageSync(HISTORY_KEY, [record, ...records].slice(0, 20))
}

export function updateHistoryRecord<T extends { id: string }>(recordId: string, patch: Partial<T> & Record<string, unknown>): T[] {
  const records = getHistoryRecords<T>()
  const nextRecords = applyHistoryRecordPatch(records, recordId, patch)
  wx.setStorageSync(HISTORY_KEY, nextRecords)
  return nextRecords
}

export function deleteHistoryRecord<T extends { id: string }>(recordId: string): T[] {
  const records = getHistoryRecords<T>()
  const nextRecords = removeHistoryRecord(records, recordId)
  wx.setStorageSync(HISTORY_KEY, nextRecords)
  return nextRecords
}

export function clearHistoryRecords(): void {
  wx.removeStorageSync(HISTORY_KEY)
}

// 最新一课在 askdao_latest_result 另存了一份副本。任何对历史记录的改写，
// 若命中的正是这一条，必须把补丁同样打到副本上，否则结果页会读到旧对象。
export function syncLatestResultRecord(recordId: string, patch: Record<string, unknown>): void {
  const latest = wx.getStorageSync<{ id?: string } | null>(LATEST_RESULT_KEY)
  if (!latest || latest.id !== recordId) {
    return
  }

  wx.setStorageSync(LATEST_RESULT_KEY, { ...latest, ...patch })
}

export { formatHistoryCreatedAt }
