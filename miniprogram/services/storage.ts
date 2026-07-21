const HISTORY_KEY = 'askdao_history_records'

export function getHistoryRecords<T>(): T[] {
  return wx.getStorageSync(HISTORY_KEY) || []
}

export function saveHistoryRecord<T>(record: T): void {
  const records = getHistoryRecords<T>()
  wx.setStorageSync(HISTORY_KEY, [record, ...records].slice(0, 20))
}
