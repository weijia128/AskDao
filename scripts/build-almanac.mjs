import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { Solar } from 'lunar-javascript'

const VERSION = 1
const LUNAR_START_YEAR = 2020
const LUNAR_END_YEAR = 2035
const ALMANAC_START_YEAR = 2025
const ALMANAC_END_YEAR = 2028
const ACTIVITY_LIMIT = 8
const LEAP_MONTH_FLAG = 512
const EMPTY_ACTIVITY_SLOT = 255
const TABLE_SIZE_BUDGET_BYTES = 250 * 1024

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outputArgIndex = process.argv.indexOf('--output-dir')
const outputDir = outputArgIndex >= 0
  ? path.resolve(process.argv[outputArgIndex + 1])
  : path.join(rootDir, 'miniprogram/domain/calendar')

if (outputArgIndex >= 0 && !process.argv[outputArgIndex + 1]) {
  throw new Error('--output-dir requires a path')
}

function pad(value) {
  return `${value}`.padStart(2, '0')
}

function formatDateKey(year, month, day) {
  return `${year}-${pad(month)}-${pad(day)}`
}

function getDaysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function forEachDate(startYear, endYear, callback) {
  for (let year = startYear; year <= endYear; year += 1) {
    for (let month = 1; month <= 12; month += 1) {
      const daysInMonth = getDaysInMonth(year, month)
      for (let day = 1; day <= daysInMonth; day += 1) {
        callback(year, month, day)
      }
    }
  }
}

function createDictionaryStore(names) {
  const values = Object.fromEntries(names.map((name) => [name, []]))
  const indexes = Object.fromEntries(names.map((name) => [name, new Map()]))

  return {
    values,
    intern(name, value) {
      const existing = indexes[name].get(value)
      if (existing !== undefined) {
        return existing
      }

      const index = values[name].length
      values[name].push(value)
      indexes[name].set(value, index)
      return index
    },
  }
}

function buildLunarDays(generatedAt) {
  const days = []

  forEachDate(LUNAR_START_YEAR, LUNAR_END_YEAR, (year, month, day) => {
    const lunar = Solar.fromYmd(year, month, day).getLunar()
    const rawMonth = lunar.getMonth()
    const packed = (rawMonth < 0 ? LEAP_MONTH_FLAG : 0)
      + Math.abs(rawMonth) * 32
      + lunar.getDay()
    days.push(packed)
  })

  return {
    version: VERSION,
    generatedAt,
    startDate: formatDateKey(LUNAR_START_YEAR, 1, 1),
    endDate: formatDateKey(LUNAR_END_YEAR, 12, 31),
    encoding: 'packed-lunar-v1',
    days,
  }
}

function buildAlmanac(generatedAt) {
  const dictionaries = createDictionaryStore(['ganzhi', 'zodiac', 'chong', 'sha', 'activity'])
  const days = []
  const activitySlots = []

  function packScalars(values) {
    const radixes = [60, 60, 5, 60, 4]
    return values.slice(1).reduce(
      (packed, value, index) => packed * radixes[index] + value,
      values[0],
    )
  }

  forEachDate(ALMANAC_START_YEAR, ALMANAC_END_YEAR, (year, month, day) => {
    const lunar = Solar.fromYmd(year, month, day).getLunar()
    const scalars = [
      dictionaries.intern('ganzhi', lunar.getYearInGanZhi()),
      dictionaries.intern('ganzhi', lunar.getMonthInGanZhi()),
      dictionaries.intern('ganzhi', lunar.getDayInGanZhi()),
      dictionaries.intern('zodiac', lunar.getYearShengXiao()),
      dictionaries.intern('chong', lunar.getChongDesc()),
      dictionaries.intern('sha', lunar.getSha()),
    ]
    const yi = lunar.getDayYi()
      .slice(0, ACTIVITY_LIMIT)
      .map((item) => dictionaries.intern('activity', item))
    const ji = lunar.getDayJi()
      .slice(0, ACTIVITY_LIMIT)
      .map((item) => dictionaries.intern('activity', item))

    days.push(packScalars(scalars))
    for (const items of [yi, ji]) {
      for (let index = 0; index < ACTIVITY_LIMIT; index += 1) {
        activitySlots.push(items[index] ?? 255)
      }
    }
  })

  const dictionaryLimits = { ganzhi: 60, zodiac: 5, chong: 60, sha: 4, activity: EMPTY_ACTIVITY_SLOT }
  for (const [name, limit] of Object.entries(dictionaryLimits)) {
    if (dictionaries.values[name].length > limit) {
      throw new Error(`${name} dictionary exceeds its ${limit}-entry encoding limit`)
    }
  }

  return {
    version: VERSION,
    generatedAt,
    startDate: formatDateKey(ALMANAC_START_YEAR, 1, 1),
    endDate: formatDateKey(ALMANAC_END_YEAR, 12, 31),
    activityLimit: ACTIVITY_LIMIT,
    encoding: 'packed-almanac-v1',
    dictionaries: dictionaries.values,
    days,
    activitySlots: Buffer.from(activitySlots).toString('base64'),
  }
}

// 输出 .js 数据模块而非 .json：小程序运行时无法按 .json 后缀解析 require，
// 会错误地查找 lunar-days.json.js。export default 与仓内 ESM 风格一致。
async function writeDataModule(filename, value) {
  const content = `export default ${JSON.stringify(value)}\n`
  await writeFile(path.join(outputDir, filename), content, 'utf8')
  return Buffer.byteLength(content)
}

const generatedAt = new Date().toISOString()
const lunarDays = buildLunarDays(generatedAt)
const almanac = buildAlmanac(generatedAt)

await mkdir(outputDir, { recursive: true })
const lunarBytes = await writeDataModule('lunar-days.data.js', lunarDays)
const almanacBytes = await writeDataModule('almanac.data.js', almanac)
const totalBytes = lunarBytes + almanacBytes

if (totalBytes > TABLE_SIZE_BUDGET_BYTES) {
  throw new Error(`Generated calendar tables exceed ${TABLE_SIZE_BUDGET_BYTES} bytes: ${totalBytes}`)
}

console.log(JSON.stringify({
  outputDir,
  lunarBytes,
  almanacBytes,
  totalBytes,
}, null, 2))
