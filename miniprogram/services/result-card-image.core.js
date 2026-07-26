export const RESULT_CARD_BACKGROUND_IMAGE = '/assets/images/result-card-bg.png'

// 小程序码码位（375x560 逻辑坐标，右下角）。
// 发布后替换为静态太阳码：见 miniprogram/README.md「结果卡小程序码」。
export const RESULT_CARD_CODE_SLOT = { x: 277, y: 468, size: 56 }

// 保存卡背景色调，与结果页卡面（pages/result/index.wxss 的 .tone-* .card-front）保持一致
export const RESULT_CARD_TONE_STYLES = {
  大安: {
    glow: 'rgba(243, 219, 154, 0.28)',
    gradientFrom: 'rgba(65, 100, 80, 0.94)',
    gradientTo: 'rgba(29, 42, 35, 0.96)',
    border: 'rgba(209, 221, 176, 0.46)',
  },
  留连: {
    glow: 'rgba(227, 191, 119, 0.22)',
    gradientFrom: 'rgba(102, 93, 78, 0.94)',
    gradientTo: 'rgba(42, 41, 39, 0.96)',
    border: 'rgba(216, 174, 103, 0.38)',
  },
  速喜: {
    glow: 'rgba(255, 229, 157, 0.3)',
    gradientFrom: 'rgba(151, 74, 54, 0.94)',
    gradientTo: 'rgba(81, 38, 31, 0.96)',
    border: 'rgba(243, 219, 154, 0.46)',
  },
  赤口: {
    glow: 'rgba(213, 88, 70, 0.26)',
    gradientFrom: 'rgba(103, 40, 38, 0.94)',
    gradientTo: 'rgba(40, 24, 24, 0.96)',
    border: 'rgba(214, 99, 82, 0.44)',
  },
  小吉: {
    glow: 'rgba(243, 219, 154, 0.24)',
    gradientFrom: 'rgba(62, 111, 99, 0.94)',
    gradientTo: 'rgba(28, 49, 46, 0.96)',
    border: 'rgba(174, 217, 199, 0.42)',
  },
  空亡: {
    glow: 'rgba(214, 167, 92, 0.18)',
    gradientFrom: 'rgba(59, 65, 70, 0.94)',
    gradientTo: 'rgba(17, 20, 22, 0.96)',
    border: 'rgba(196, 201, 202, 0.3)',
  },
}

export function getResultCardToneStyle(symbol) {
  return RESULT_CARD_TONE_STYLES[symbol] || RESULT_CARD_TONE_STYLES['空亡']
}

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

export function buildResultCardImageModel(record) {
  const symbol = record?.rule_result?.symbol || ''

  return {
    brand: '问道',
    methodName: '小六壬',
    backgroundImagePath: RESULT_CARD_BACKGROUND_IMAGE,
    signature: '问道人 起念',
    miniProgramCodeUrl: record?.mini_program_code_url || '',
    toneStyle: getResultCardToneStyle(symbol),
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
