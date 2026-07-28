const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

export const VERIFICATION_FIRST_WINDOW_DAYS = 3
export const VERIFICATION_SECOND_WINDOW_DAYS = 7

const TERMINAL_STATUSES = ['fulfilled', 'unfulfilled', 'unclear']
const ALL_STATUSES = ['fulfilled', 'unfulfilled', 'deferred', 'unclear']

export const VERIFICATION_LABELS = {
  fulfilled: '应验',
  unfulfilled: '未应验',
  unclear: '存疑',
  deferred: '待验',
}

// 东八区民用日历的「第几天」。用日历日差而非 72 小时，
// 是为了让「三日前」与用户对日期的直觉一致。
function getShanghaiDayNumber(date) {
  const instant = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(instant.getTime())) {
    throw new Error(`Invalid date: ${date}`)
  }

  return Math.floor((instant.getTime() + SHANGHAI_OFFSET_MS) / DAY_MS)
}

export function getRecordVerificationStatus(record) {
  const status = record?.verification?.status
  return ALL_STATUSES.includes(status) ? status : ''
}

export function isVerificationTerminal(status) {
  return TERMINAL_STATUSES.includes(status)
}

export function getVerificationWindowDays(record) {
  return getRecordVerificationStatus(record) === 'deferred'
    ? VERIFICATION_SECOND_WINDOW_DAYS
    : VERIFICATION_FIRST_WINDOW_DAYS
}

export function isVerificationDue(record, now = new Date()) {
  const note = `${record?.thought_note || ''}`.trim()
  if (!note) {
    return false
  }

  if (isVerificationTerminal(getRecordVerificationStatus(record))) {
    return false
  }

  const createdAt = record?.rule_result?.created_at || record?.created_at
  if (!createdAt) {
    return false
  }

  try {
    const elapsedDays = getShanghaiDayNumber(now) - getShanghaiDayNumber(createdAt)
    return elapsedDays >= getVerificationWindowDays(record)
  } catch (error) {
    // 记录时间损坏时不追问，避免脏数据反复弹窗
    return false
  }
}

export function getDueVerificationRecord(records, now = new Date()) {
  if (!Array.isArray(records)) {
    return null
  }

  const due = records.filter((record) => isVerificationDue(record, now))
  if (!due.length) {
    return null
  }

  // history 按新到旧存储，最旧的一条排在末尾，先验它
  return due[due.length - 1]
}

export function buildVerificationPatch(status, now = new Date()) {
  if (!ALL_STATUSES.includes(status)) {
    throw new Error(`Invalid verification status: ${status}`)
  }

  const instant = now instanceof Date ? now : new Date(now)
  if (Number.isNaN(instant.getTime())) {
    throw new Error(`Invalid date: ${now}`)
  }

  return {
    verification: {
      status,
      updated_at: instant.toISOString(),
    },
  }
}

// 第一次「尚未分晓」推迟到七日后；第二次落为存疑，不再追问。
export function resolveDeferAction(record) {
  return getRecordVerificationStatus(record) === 'deferred' ? 'unclear' : 'deferred'
}

export function summarizeVerifications(records) {
  const list = Array.isArray(records) ? records : []
  const counts = { fulfilled: 0, unfulfilled: 0, unclear: 0, deferred: 0 }

  for (const record of list) {
    const status = getRecordVerificationStatus(record)
    if (status) {
      counts[status] += 1
    }
  }

  const settled = counts.fulfilled + counts.unfulfilled

  return {
    ...counts,
    settled,
    total: list.length,
    rate: settled ? Math.round((counts.fulfilled / settled) * 100) : 0,
  }
}

export function getVerificationLabel(record) {
  return VERIFICATION_LABELS[getRecordVerificationStatus(record)] || ''
}
