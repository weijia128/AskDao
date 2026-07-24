export const RESULT_CARD_BACKGROUND_IMAGE = '/assets/images/result-card-bg.png'

export function wrapPosterText(text = '', maxLength = 12) {
  const chars = Array.from(`${text}`)
  const lines = []

  for (let index = 0; index < chars.length; index += maxLength) {
    lines.push(chars.slice(index, index + maxLength).join(''))
  }

  return lines
}

function pad(value) {
  return `${value}`.padStart(2, '0')
}

function formatCreatedAt(createdAt = '') {
  const date = new Date(createdAt)
  if (!Number.isNaN(date.getTime())) {
    const beijingDate = new Date(date.getTime() + 8 * 60 * 60 * 1000)
    return [
      beijingDate.getUTCFullYear(),
      pad(beijingDate.getUTCMonth() + 1),
      pad(beijingDate.getUTCDate()),
    ].join('-') + ` ${pad(beijingDate.getUTCHours())}:${pad(beijingDate.getUTCMinutes())}`
  }

  return `${createdAt}`.slice(0, 16).replace('T', ' ')
}

const LUNAR_MONTHS = ['', '正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊']
const LUNAR_DAY_ONES = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十']

function formatLunarDay(day) {
  if (!Number.isInteger(day) || day < 1 || day > 30) {
    return ''
  }

  if (day <= 10) {
    return `初${LUNAR_DAY_ONES[day]}`
  }

  if (day < 20) {
    return `十${LUNAR_DAY_ONES[day - 10]}`
  }

  if (day === 20) {
    return '二十'
  }

  if (day < 30) {
    return `廿${LUNAR_DAY_ONES[day - 20]}`
  }

  return '三十'
}

export function formatLunarTimeText(inputSnapshot = {}) {
  const lunarMonth = inputSnapshot.lunar_month
  const lunarDay = inputSnapshot.lunar_day
  const hourBranch = inputSnapshot.hour_branch
  const monthText = LUNAR_MONTHS[lunarMonth]
  const dayText = formatLunarDay(lunarDay)

  if (!monthText || !dayText || !hourBranch) {
    return ''
  }

  return `农历${monthText}月${dayText} · ${hourBranch}时`
}

function normalizeWatermarkName(watermarkName = '') {
  const name = `${watermarkName}`.trim()
  if (!name) {
    return '问道人'
  }

  return Array.from(name).slice(0, 10).join('')
}

export function splitResultSymbol(symbol = '') {
  return Array.from(`${symbol}`.trim()).filter(Boolean)
}

export function getVerticalSymbolLayout(symbolChars = [], options = {}) {
  const centerY = options.centerY || 184
  const fontSize = options.fontSize || 30
  const gap = options.gap || 18
  const step = fontSize + gap
  const blockHeight = Math.max(symbolChars.length - 1, 0) * step
  const visualBaselineOffset = fontSize * 0.43
  const startY = centerY - blockHeight / 2 + visualBaselineOffset

  return symbolChars.map((char, index) => ({
    char,
    y: Math.round(startY + index * step),
  }))
}

export function buildResultCardImageModel(record, watermarkName = '') {
  const symbol = record?.rule_result?.symbol || ''

  return {
    brand: '问道',
    methodName: '小六壬',
    backgroundImagePath: RESULT_CARD_BACKGROUND_IMAGE,
    watermarkName: normalizeWatermarkName(watermarkName),
    symbol,
    symbolChars: splitResultSymbol(symbol),
    grade: record?.rule_result?.grade || '',
    oracleText: record?.interpretation?.oracleText || '',
    actionHint: record?.interpretation?.actionHint || '',
    disclaimer: record?.interpretation?.disclaimer || '仅供传统文化体验与自我参考。',
    createdAtText: formatCreatedAt(record?.rule_result?.created_at || record?.created_at || ''),
    lunarTimeText: formatLunarTimeText(record?.rule_result?.input_snapshot),
  }
}
