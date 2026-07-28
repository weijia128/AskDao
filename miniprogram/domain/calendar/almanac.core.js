const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
const LUNAR_MONTHS = ['', '正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊']
const LUNAR_DAY_ONES = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十']
const DAY_MS = 24 * 60 * 60 * 1000
const LEAP_MONTH_FLAG = 512
const EMPTY_ACTIVITY_SLOT = 255

function pad(value) {
  return `${value}`.padStart(2, '0')
}

function formatDateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function parseDateKey(dateKey) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey || '')
  if (!match) {
    return Number.NaN
  }

  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

function getTableDayIndex(table, date) {
  if (!table || table.version !== 1 || !Array.isArray(table.days)) {
    return -1
  }

  const startTime = parseDateKey(table.startDate)
  const currentTime = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  const index = Math.round((currentTime - startTime) / DAY_MS)
  return index >= 0 && index < table.days.length ? index : -1
}

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

export function formatLunarDateText(lunar = {}) {
  const rawMonth = lunar.lunarMonth
  const month = Math.abs(rawMonth)
  const monthText = LUNAR_MONTHS[month]
  const dayText = formatLunarDay(lunar.lunarDay)
  if (!monthText || !dayText) {
    return ''
  }

  const leapText = lunar.isLeapMonth || rawMonth < 0 ? '闰' : ''
  return `${leapText}${monthText}月${dayText}`
}

export function decodePackedLunar(packed) {
  if (!Number.isInteger(packed) || packed <= 0) {
    throw new Error(`Invalid packed lunar day: ${packed}`)
  }

  const value = packed & (LEAP_MONTH_FLAG - 1)
  const lunarMonth = Math.floor(value / 32)
  const lunarDay = value % 32
  if (lunarMonth < 1 || lunarMonth > 12 || lunarDay < 1 || lunarDay > 30) {
    throw new Error(`Invalid packed lunar day: ${packed}`)
  }

  return {
    lunarMonth,
    lunarDay,
    isLeapMonth: (packed & LEAP_MONTH_FLAG) !== 0,
  }
}

export function getLunarDateFromTable(table, date = new Date()) {
  const index = getTableDayIndex(table, date)
  if (index < 0) {
    throw new RangeError(`Lunar date outside supported range ${table?.startDate || ''}..${table?.endDate || ''}`)
  }

  return decodePackedLunar(table.days[index])
}

export function unpackAlmanacScalars(packed) {
  if (!Number.isInteger(packed) || packed < 0) {
    throw new Error(`Invalid packed almanac day: ${packed}`)
  }

  const values = new Array(6)
  let remaining = packed
  for (const [index, radix] of [[5, 4], [4, 60], [3, 5], [2, 60], [1, 60]]) {
    values[index] = remaining % radix
    remaining = Math.floor(remaining / radix)
  }
  values[0] = remaining
  return values
}

function readActivities(table, activityBytes, dayIndex, groupIndex) {
  const limit = table.activityLimit
  const offset = (dayIndex * 2 + groupIndex) * limit
  const names = table.dictionaries.activity
  const result = []

  for (let index = 0; index < limit; index += 1) {
    const activityIndex = activityBytes[offset + index]
    if (activityIndex === EMPTY_ACTIVITY_SLOT) {
      break
    }
    if (names[activityIndex]) {
      result.push(names[activityIndex])
    }
  }

  return result
}

function buildFallbackAlmanac(date) {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()

  return {
    source: 'askdao-static-fallback',
    dateKey: formatDateKey(date),
    solarText: `${year}年${month}月${day}日`,
    weekdayText: WEEKDAYS[date.getDay()],
    lunarText: '',
    ganzhiText: '',
    zodiacText: '',
    chongShaText: '',
    yi: [],
    ji: [],
    noticeText: '黄历数据暂未覆盖当前日期，请更新版本。',
  }
}

export function getDailyAlmanacFromTables(lunarTable, almanacTable, activityBytes, date = new Date()) {
  const dayIndex = getTableDayIndex(almanacTable, date)
  if (dayIndex < 0 || !activityBytes) {
    return buildFallbackAlmanac(date)
  }

  let lunar
  try {
    lunar = getLunarDateFromTable(lunarTable, date)
  } catch (error) {
    return buildFallbackAlmanac(date)
  }

  const [yearGanZhi, monthGanZhi, dayGanZhi, zodiac, chong, sha] = unpackAlmanacScalars(
    almanacTable.days[dayIndex],
  )
  const dictionaries = almanacTable.dictionaries
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()

  return {
    source: '6tail/lunar-javascript-generated',
    dateKey: formatDateKey(date),
    solarText: `${year}年${month}月${day}日`,
    weekdayText: WEEKDAYS[date.getDay()],
    lunarText: `农历${formatLunarDateText(lunar)}`,
    ganzhiText: `${dictionaries.ganzhi[yearGanZhi]}年 ${dictionaries.ganzhi[monthGanZhi]}月 ${dictionaries.ganzhi[dayGanZhi]}日`,
    zodiacText: `生肖${dictionaries.zodiac[zodiac]}`,
    chongShaText: `冲${dictionaries.chong[chong]} 煞${dictionaries.sha[sha]}`,
    yi: readActivities(almanacTable, activityBytes, dayIndex, 0),
    ji: readActivities(almanacTable, activityBytes, dayIndex, 1),
    noticeText: '',
  }
}
