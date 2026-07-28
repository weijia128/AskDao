import test from 'node:test'
import assert from 'node:assert/strict'
import { access, readFile, stat } from 'node:fs/promises'

import { Solar } from 'lunar-javascript'
import {
  getDailyAlmanacFromTables,
  getLunarDateFromTable,
} from '../domain/calendar/almanac.core.js'
import lunarTable from '../domain/calendar/lunar-days.data.js'
import almanacTable from '../domain/calendar/almanac.data.js'

const readText = (path) => readFile(new URL(path, import.meta.url), 'utf8')
const readJson = async (path) => JSON.parse(await readText(path))
const activityBytes = Uint8Array.from(Buffer.from(almanacTable.activitySlots, 'base64'))

function createLocalDate(value) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day, 12)
}

test('generated calendar tables expose fixed versioned ranges', async () => {
  assert.equal(lunarTable.version, 1)
  assert.equal(lunarTable.encoding, 'packed-lunar-v1')
  assert.equal(lunarTable.startDate, '2020-01-01')
  assert.equal(lunarTable.endDate, '2035-12-31')
  assert.equal(lunarTable.days.length, 5844)

  assert.equal(almanacTable.version, 1)
  assert.equal(almanacTable.encoding, 'packed-almanac-v1')
  assert.equal(almanacTable.startDate, '2025-01-01')
  assert.equal(almanacTable.endDate, '2028-12-31')
  assert.equal(almanacTable.activityLimit, 8)
  assert.equal(almanacTable.days.length, 1461)
  assert.equal(activityBytes.length, almanacTable.days.length * almanacTable.activityLimit * 2)
  assert.match(lunarTable.generatedAt, /^\d{4}-\d{2}-\d{2}T/)
  assert.equal(almanacTable.generatedAt, lunarTable.generatedAt)

  const lunarFile = await stat(new URL('../domain/calendar/lunar-days.data.js', import.meta.url))
  const almanacFile = await stat(new URL('../domain/calendar/almanac.data.js', import.meta.url))
  assert.ok(lunarFile.size + almanacFile.size <= 250 * 1024)
  await access(new URL('../../scripts/build-almanac.mjs', import.meta.url))
})

test('lunar table matches lunar-javascript throughout its supported range', () => {
  let index = 0
  for (let time = Date.UTC(2020, 0, 1); time <= Date.UTC(2035, 11, 31); time += 24 * 60 * 60 * 1000) {
    const utcDate = new Date(time)
    const year = utcDate.getUTCFullYear()
    const month = utcDate.getUTCMonth() + 1
    const day = utcDate.getUTCDate()
    const expected = Solar.fromYmd(year, month, day).getLunar()
    const actual = getLunarDateFromTable(lunarTable, new Date(year, month - 1, day, 12))

    assert.deepEqual(actual, {
      lunarMonth: Math.abs(expected.getMonth()),
      lunarDay: expected.getDay(),
      isLeapMonth: expected.getMonth() < 0,
    }, `lunar mismatch at table index ${index}`)
    index += 1
  }

  assert.equal(index, lunarTable.days.length)
})

test('daily almanac samples match the generator source exactly', () => {
  const samples = [
    '2025-01-01',
    '2025-07-25',
    '2025-08-22',
    '2026-02-17',
    '2026-07-24',
    '2027-01-01',
    '2027-10-01',
    '2028-02-29',
    '2028-08-15',
    '2028-12-31',
  ]

  for (const value of samples) {
    const date = createLocalDate(value)
    const [year, month, day] = value.split('-').map(Number)
    const lunar = Solar.fromYmd(year, month, day).getLunar()
    const actual = getDailyAlmanacFromTables(lunarTable, almanacTable, activityBytes, date)

    assert.equal(actual.source, '6tail/lunar-javascript-generated')
    assert.equal(actual.dateKey, value)
    assert.equal(actual.lunarText, `农历${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`)
    assert.equal(actual.ganzhiText, `${lunar.getYearInGanZhi()}年 ${lunar.getMonthInGanZhi()}月 ${lunar.getDayInGanZhi()}日`)
    assert.equal(actual.zodiacText, `生肖${lunar.getYearShengXiao()}`)
    assert.equal(actual.chongShaText, `冲${lunar.getChongDesc()} 煞${lunar.getSha()}`)
    assert.deepEqual(actual.yi, lunar.getDayYi().slice(0, 8))
    assert.deepEqual(actual.ji, lunar.getDayJi().slice(0, 8))
    assert.equal(actual.noticeText, '')
  }
})

test('lunar conversion normalizes the fixed leap-month regression date', () => {
  assert.deepEqual(getLunarDateFromTable(lunarTable, createLocalDate('2025-07-25')), {
    lunarMonth: 6,
    lunarDay: 1,
    isLeapMonth: true,
  })
})

test('almanac falls back outside its range and lunar lookup fails outside 2035', () => {
  const almanacFallback = getDailyAlmanacFromTables(
    lunarTable,
    almanacTable,
    activityBytes,
    createLocalDate('2029-01-01'),
  )
  assert.equal(almanacFallback.solarText, '2029年1月1日')
  assert.equal(almanacFallback.lunarText, '')
  assert.deepEqual(almanacFallback.yi, [])
  assert.deepEqual(almanacFallback.ji, [])
  assert.match(almanacFallback.noticeText, /请更新版本/)

  const unsupported = createLocalDate('2036-01-01')
  assert.throws(() => getLunarDateFromTable(lunarTable, unsupported), RangeError)
  assert.match(
    getDailyAlmanacFromTables(lunarTable, almanacTable, activityBytes, unsupported).noticeText,
    /请更新版本/,
  )
})

test('mini program runtime loads static JSON without lunar-javascript', async () => {
  const coreSource = await readText('../domain/calendar/almanac.core.js')
  const adapterSource = await readText('../domain/calendar/almanac.ts')
  const lunarSource = await readText('../domain/calendar/lunar.ts')
  const homeSource = await readText('../pages/home/index.ts')
  const packageJson = await readJson('../../package.json')

  assert.doesNotMatch(coreSource, /from ['"]lunar-javascript|require\(['"]lunar-javascript/)
  assert.doesNotMatch(adapterSource, /from ['"]lunar-javascript|require\(['"]lunar-javascript/)
  assert.match(adapterSource, /import lunarDaysTable from '\.\/lunar-days\.data'/)
  assert.match(adapterSource, /import almanacTable from '\.\/almanac\.data'/)
  assert.doesNotMatch(adapterSource, /from '\.\/almanac'/)
  assert.doesNotMatch(adapterSource, /require\(/)
  assert.match(adapterSource, /base64ToArrayBuffer/)
  assert.match(lunarSource, /from '\.\/almanac'/)
  assert.match(homeSource, /from '..\/..\/domain\/calendar\/almanac'/)
  assert.equal(packageJson.dependencies, undefined)
  assert.equal(packageJson.devDependencies['lunar-javascript'], '^1.7.7')
  await assert.rejects(access(new URL('../miniprogram_npm/lunar-javascript', import.meta.url)))
})

test('home page uses taiji entry and hides unavailable almanac sections', async () => {
  const homeMarkup = await readText('../pages/home/index.wxml')
  const homeSource = await readText('../pages/home/index.ts')
  const homeStyles = await readText('../pages/home/index.wxss')

  assert.match(homeMarkup, /taiji-entry/)
  assert.match(homeMarkup, /seal-ring/)
  assert.match(homeMarkup, /assets\/images\/bagua-taiji\.png/)
  assert.match(homeMarkup, /entry-button/)
  assert.match(homeMarkup, />问道<\/view>/)
  assert.doesNotMatch(homeMarkup, /开始问道/)
  assert.match(homeMarkup, /hover-class="taiji-entry-active"/)
  assert.match(homeStyles, /entry-button/)
  assert.match(homeStyles, /font-family: "Songti SC", serif/)
  assert.match(homeStyles, /font-size: 44rpx/)
  assert.match(homeStyles, /letter-spacing: 14rpx/)
  assert.match(homeStyles, /seal-ring/)
  assert.doesNotMatch(homeStyles, /background: rgba\(243, 219, 154, 0\.94\)/)
  assert.match(homeMarkup, /今日黄历/)
  assert.match(homeMarkup, /almanac\.lunarText \|\| almanac\.solarText/)
  assert.match(homeMarkup, /almanac\.noticeText/)
  assert.match(homeMarkup, /wx:if="\{\{almanac\.yi\.length\}\}"/)
  assert.match(homeSource, /getDailyAlmanac/)
  assert.match(homeSource, /noticeText: ''/)
  assert.doesNotMatch(homeMarkup, /daily-card/)
  assert.doesNotMatch(homeMarkup, /快速问事/)
  assert.doesNotMatch(homeMarkup, /今日之象/)
})

test('home page bagua taiji image asset exists', async () => {
  const image = await stat(new URL('../assets/images/bagua-taiji.png', import.meta.url))
  assert.equal(image.isFile(), true)
})

test('functional pages except home use the shared ink landscape background image', async () => {
  const appJson = await readJson('../app.json')
  const background = await stat(new URL('../assets/images/page-bg.png', import.meta.url))
  const appStyles = await readText('../app.wxss')

  assert.equal(background.isFile(), true)
  assert.match(appStyles, /page-background/)

  const inkVeilPages = new Set(['pages/home/index', 'pages/xiao-liuren/index', 'pages/history/index'])
  for (const pagePath of appJson.pages) {
    const markup = await readText(`../${pagePath}.wxml`)
    if (inkVeilPages.has(pagePath)) {
      assert.doesNotMatch(markup, /class="page-background"/)
      continue
    }
    assert.match(markup, /class="page-background"/)
    assert.match(markup, /\/assets\/images\/page-bg\.png/)
  }
})

test('home page uses a plain rice paper veil background instead of images or old gradients', async () => {
  const homeMarkup = await readText('../pages/home/index.wxml')
  const homeStyles = await readText('../pages/home/index.wxss')

  assert.match(homeMarkup, /paper-veil/)
  assert.doesNotMatch(homeMarkup, /page-bg\.png/)
  assert.doesNotMatch(homeMarkup, /ink-layer/)
  assert.doesNotMatch(homeStyles, /ink-layer/)
  assert.match(homeStyles, /paper-veil/)
  assert.match(homeStyles, /seal-ring/)
})
