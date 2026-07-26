const SYMBOLS = ['空亡', '大安', '留连', '速喜', '赤口', '小吉']

// 起课动画的数数顺序：从大安起数，第 i 步展示 XIAO_LIUREN_COUNT_SEQUENCE[i % 6]，
// 数完 countPath 全部步数后，末位恰好落在结果宫位上。
export const XIAO_LIUREN_COUNT_SEQUENCE = ['大安', '留连', '速喜', '赤口', '小吉', '空亡']

const GRADES_BY_SYMBOL = {
  大安: '顺',
  留连: '平',
  速喜: '顺',
  赤口: '阻',
  小吉: '顺',
  空亡: '阻',
}

const CHINESE_HOURS = [
  { branch: '子', index: 1, range: '23:00-00:59', start: 23, end: 0 },
  { branch: '丑', index: 2, range: '01:00-02:59', start: 1, end: 2 },
  { branch: '寅', index: 3, range: '03:00-04:59', start: 3, end: 4 },
  { branch: '卯', index: 4, range: '05:00-06:59', start: 5, end: 6 },
  { branch: '辰', index: 5, range: '07:00-08:59', start: 7, end: 8 },
  { branch: '巳', index: 6, range: '09:00-10:59', start: 9, end: 10 },
  { branch: '午', index: 7, range: '11:00-12:59', start: 11, end: 12 },
  { branch: '未', index: 8, range: '13:00-14:59', start: 13, end: 14 },
  { branch: '申', index: 9, range: '15:00-16:59', start: 15, end: 16 },
  { branch: '酉', index: 10, range: '17:00-18:59', start: 17, end: 18 },
  { branch: '戌', index: 11, range: '19:00-20:59', start: 19, end: 20 },
  { branch: '亥', index: 12, range: '21:00-22:59', start: 21, end: 22 },
]

export function mapRemainderToSymbol(remainder) {
  if (!Number.isInteger(remainder) || remainder < 0 || remainder > 5) {
    throw new Error(`Invalid xiao liuren remainder: ${remainder}`)
  }

  return SYMBOLS[remainder]
}

export function mapSymbolToGrade(symbol) {
  const grade = GRADES_BY_SYMBOL[symbol]
  if (!grade) {
    throw new Error(`Invalid xiao liuren symbol: ${symbol}`)
  }

  return grade
}

export function getChineseHour(hour) {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    throw new Error(`Invalid hour: ${hour}`)
  }

  const match = CHINESE_HOURS.find((item) => {
    if (item.branch === '子') {
      return hour === 23 || hour === 0
    }

    return hour >= item.start && hour <= item.end
  })

  return {
    branch: match.branch,
    index: match.index,
    range: match.range,
  }
}

export function buildXiaoLiurenCountPath(input) {
  const { lunarMonth, lunarDay, hourIndex } = input

  for (const [key, value] of Object.entries({ lunarMonth, lunarDay, hourIndex })) {
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error(`Invalid ${key}: ${value}`)
    }
  }

  const totalSteps = lunarMonth + lunarDay + hourIndex - 2
  return Array.from({ length: totalSteps }, (_, index) => index % 6)
}

export function calculateXiaoLiuren(input) {
  const { lunarMonth, lunarDay, hourIndex, hourBranch, createdAt } = input

  for (const [key, value] of Object.entries({ lunarMonth, lunarDay, hourIndex })) {
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error(`Invalid ${key}: ${value}`)
    }
  }

  const result = (lunarMonth + lunarDay + hourIndex - 2) % 6
  const symbol = mapRemainderToSymbol(result)
  const grade = mapSymbolToGrade(symbol)

  return {
    method: 'xiao_liuren',
    rule_version: 'xiao_liuren_v1',
    input_snapshot: {
      lunar_month: lunarMonth,
      lunar_day: lunarDay,
      hour_branch: hourBranch,
      hour_index: hourIndex,
    },
    calculation: {
      formula: `(${lunarMonth} + ${lunarDay} + ${hourIndex} - 2) % 6`,
      result,
    },
    symbol,
    grade,
    created_at: createdAt,
  }
}
