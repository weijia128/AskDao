export const DAILY_DIVINATION_LIMIT = 3

const DAILY_USAGE_KEY = 'askdao_daily_divination_usage'

export function getDailyDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function getDailyDivinationUsage(storage, date = new Date()) {
  const dateKey = getDailyDateKey(date)
  const usage = storage.getStorageSync(DAILY_USAGE_KEY) || {}
  const count = usage.date === dateKey ? usage.count || 0 : 0
  const remaining = Math.max(DAILY_DIVINATION_LIMIT - count, 0)

  return {
    date: dateKey,
    count,
    remaining,
    limit: DAILY_DIVINATION_LIMIT,
  }
}

export function canStartDailyDivination(storage, date = new Date()) {
  return getDailyDivinationUsage(storage, date).remaining > 0
}

export function recordDailyDivination(storage, date = new Date()) {
  const usage = getDailyDivinationUsage(storage, date)
  const nextUsage = {
    date: usage.date,
    count: Math.min(usage.count + 1, DAILY_DIVINATION_LIMIT),
  }

  storage.setStorageSync(DAILY_USAGE_KEY, nextUsage)

  return {
    ...nextUsage,
    remaining: Math.max(DAILY_DIVINATION_LIMIT - nextUsage.count, 0),
    limit: DAILY_DIVINATION_LIMIT,
  }
}
