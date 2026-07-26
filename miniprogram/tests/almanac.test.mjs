import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, stat } from 'node:fs/promises'

import { Solar } from 'lunar-javascript'
import { getDailyAlmanacFromSolar, getLunarDateFromSolar } from '../domain/calendar/almanac.core.js'

const readText = (path) => readFile(new URL(path, import.meta.url), 'utf8')

test('daily almanac returns real lunar calendar fields and auspicious lists', () => {
  const almanac = getDailyAlmanacFromSolar(Solar, new Date(2026, 6, 24, 13))

  assert.equal(almanac.source, '6tail/lunar-javascript')
  assert.equal(almanac.dateKey, '2026-07-24')
  assert.match(almanac.solarText, /2026年7月24日/)
  assert.match(almanac.weekdayText, /星期/)
  assert.match(almanac.lunarText, /农历/)
  assert.ok(almanac.yi.length > 0)
  assert.ok(almanac.ji.length > 0)
})

test('lunar date conversion uses the same real calendar source', () => {
  const lunar = getLunarDateFromSolar(Solar, new Date(2026, 6, 24, 13))

  assert.deepEqual(lunar, {
    lunarMonth: 6,
    lunarDay: 11,
  })
})

test('home page uses taiji seal entry and almanac instead of daily result card', async () => {
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
  assert.match(homeMarkup, /almanac\.lunarText/)
  assert.match(homeSource, /getDailyAlmanac/)
  assert.match(homeSource, /emptyAlmanac/)
  assert.match(homeSource, /almanac: emptyAlmanac/)
  assert.doesNotMatch(homeMarkup, /daily-card/)
  assert.doesNotMatch(homeMarkup, /快速问事/)
  assert.doesNotMatch(homeMarkup, /今日之象/)
})

test('home page bagua taiji image asset exists', async () => {
  const image = await stat(new URL('../assets/images/bagua-taiji.png', import.meta.url))

  assert.equal(image.isFile(), true)
})

test('mini program runtime imports almanac through TypeScript adapter', async () => {
  const coreSource = await readText('../domain/calendar/almanac.core.js')
  const adapterSource = await readText('../domain/calendar/almanac.ts')
  const lunarSource = await readText('../domain/calendar/lunar.ts')
  const homeSource = await readText('../pages/home/index.ts')

  assert.doesNotMatch(coreSource, /from 'lunar-javascript'/)
  assert.match(adapterSource, /from 'lunar-javascript'/)
  assert.match(lunarSource, /from '\.\/almanac'/)
  assert.match(homeSource, /from '..\/..\/domain\/calendar\/almanac'/)
})

test('functional pages except home use the shared ink landscape background image', async () => {
  const appJson = JSON.parse(await readText('../app.json'))
  const background = await stat(new URL('../assets/images/page-bg.png', import.meta.url))
  const appStyles = await readText('../app.wxss')

  assert.equal(background.isFile(), true)
  assert.match(appStyles, /page-background/)

  const inkVeilPages = new Set(['pages/home/index', 'pages/xiao-liuren/index'])
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
