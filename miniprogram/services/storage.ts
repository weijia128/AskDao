import { applyHistoryRecordPatch, formatHistoryCreatedAt, removeHistoryRecord } from './storage.core'

const HISTORY_KEY = 'askdao_history_records'

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

export { formatHistoryCreatedAt }
