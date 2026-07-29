import test from 'node:test'
import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'

import {
  RESULT_CARD_BACKGROUND_IMAGE,
  RESULT_CARD_CODE_SLOT,
  RESULT_CARD_TONE_STYLES,
  buildResultCardImageModel,
  getResultCardToneStyle,
  getVerticalSymbolLayout,
  wrapPosterText,
} from '../services/result-card-image.core.js'

test('result card image model excludes the private thought note', () => {
  const model = buildResultCardImageModel({
    rule_result: {
      symbol: '大安',
      grade: '顺',
      created_at: '2026-07-24T08:30:00+08:00',
      input_snapshot: {
        lunar_month: 7,
        lunar_day: 21,
        hour_branch: '辰',
      },
    },
    interpretation: {
      oracleText: '事可缓行，守正则安。',
      actionHint: '先稳住节奏，再推进一步。',
      disclaimer: '仅供传统文化体验与自我参考。',
    },
    thought_note: '我心里问的是一件私事',
  })

  assert.equal(model.brand, '一念六壬')
  assert.equal(model.methodName, '小六壬')
  assert.equal(model.symbol, '大安')
  assert.deepEqual(model.symbolChars, ['大', '安'])
  assert.equal(model.grade, '顺')
  assert.equal(model.oracleText, '事可缓行，守正则安。')
  assert.equal(model.actionHint, '先稳住节奏，再推进一步。')
  assert.equal(model.disclaimer, '仅供传统文化体验与自我参考。')
  assert.equal(model.createdAtText, '2026-07-24 08:30')
  assert.equal(model.lunarTimeText, '农历七月廿一 · 辰时')
  assert.equal(model.backgroundImagePath, RESULT_CARD_BACKGROUND_IMAGE)
  assert.equal(model.miniProgramCodeUrl, '')
  assert.deepEqual(Object.keys(model).filter((key) => key.includes('thought')), [])
})

test('result card image model reads a mini program code url when present', () => {
  const model = buildResultCardImageModel({
    rule_result: { symbol: '大安', grade: '顺' },
    interpretation: {},
    mini_program_code_url: '/assets/images/mp-code.png',
  })

  assert.equal(model.miniProgramCodeUrl, '/assets/images/mp-code.png')
})

test('result card code slot stays inside the canvas', () => {
  assert.ok(RESULT_CARD_CODE_SLOT.x >= 0)
  assert.ok(RESULT_CARD_CODE_SLOT.y >= 0)
  assert.ok(RESULT_CARD_CODE_SLOT.x + RESULT_CARD_CODE_SLOT.size <= 375)
  assert.ok(RESULT_CARD_CODE_SLOT.y + RESULT_CARD_CODE_SLOT.size <= 560)
})

test('result card tone styles cover all six symbols with a safe fallback', () => {
  const symbols = ['大安', '留连', '速喜', '赤口', '小吉', '空亡']

  for (const symbol of symbols) {
    const style = RESULT_CARD_TONE_STYLES[symbol]
    assert.ok(style, `missing tone style for ${symbol}`)
    assert.ok(style.glow)
    assert.ok(style.gradientFrom)
    assert.ok(style.gradientTo)
    assert.ok(style.border)
  }

  assert.equal(getResultCardToneStyle('小吉'), RESULT_CARD_TONE_STYLES['小吉'])
  assert.equal(getResultCardToneStyle('未知象'), RESULT_CARD_TONE_STYLES['空亡'])
})

test('result card image model carries the tone style matching the app card', () => {
  const model = buildResultCardImageModel({
    rule_result: { symbol: '小吉', grade: '顺' },
    interpretation: {},
  })

  assert.equal(model.toneStyle, RESULT_CARD_TONE_STYLES['小吉'])
})

test('result card drawing uses the tone gradient background', async () => {
  const resultSource = await readFile(new URL('../pages/result/index.ts', import.meta.url), 'utf8')

  assert.match(resultSource, /createLinearGradient/)
  assert.match(resultSource, /createCircularGradient/)
  assert.match(resultSource, /toneStyle\.gradientFrom/)
  assert.match(resultSource, /toneStyle\.gradientTo/)
  assert.match(resultSource, /toneStyle\.glow/)
  assert.match(resultSource, /toneStyle\.border/)
})

test('result card image model splits two-character symbols for vertical display', () => {
  const model = buildResultCardImageModel({
    rule_result: {
      symbol: '速喜',
      grade: '顺',
      input_snapshot: {
        lunar_month: 7,
        lunar_day: 21,
        hour_branch: '辰',
      },
    },
    interpretation: {},
  })

  assert.deepEqual(model.symbolChars, ['速', '喜'])
})

test('result card image labels a normalized leap lunar month', () => {
  const model = buildResultCardImageModel({
    rule_result: {
      symbol: '小吉',
      grade: '顺',
      input_snapshot: {
        lunar_month: 6,
        lunar_day: 1,
        is_leap_month: true,
        hour_branch: '辰',
      },
    },
    interpretation: {},
  })

  assert.equal(model.lunarTimeText, '农历闰六月初一 · 辰时')
})

test('result card image uses a balanced vertical symbol layout', () => {
  const layout = getVerticalSymbolLayout(['速', '喜'], {
    centerY: 184,
    fontSize: 30,
    gap: 18,
  })

  assert.deepEqual(layout, [
    { char: '速', y: 173 },
    { char: '喜', y: 221 },
  ])
})

test('result card image model formats utc created time as Beijing local time', () => {
  const model = buildResultCardImageModel({
    rule_result: {
      symbol: '大安',
      grade: '顺',
      created_at: '2026-07-24T07:06:00.000Z',
    },
    interpretation: {},
  })

  assert.equal(model.createdAtText, '2026-07-24 15:06')
})

test('poster text wrapper keeps every line within the configured length', () => {
  const lines = wrapPosterText('这件事情适合先观察局势再做决定', 7)

  assert.deepEqual(lines, ['这件事情适合先', '观察局势再做决', '定'])
})

test('result card background asset exists', async () => {
  await access(new URL(`..${RESULT_CARD_BACKGROUND_IMAGE}`, import.meta.url))
})
