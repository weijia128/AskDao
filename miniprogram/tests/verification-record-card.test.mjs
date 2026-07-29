import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import { buildResultCardImageModel } from '../services/result-card-image.core.js'
import {
  buildVerificationRecordCardModel,
  canExportVerificationCard,
  drawVerificationRecordCard,
  formatVerifiedAtText,
} from '../services/verification-record-card.core.js'

function buildRecord(overrides = {}) {
  return {
    id: 'record-1',
    rule_result: {
      symbol: '速喜',
      grade: '吉',
      created_at: '2026-07-24T08:30:00+08:00',
      input_snapshot: {
        lunar_month: 7,
        lunar_day: 21,
        hour_branch: '辰',
      },
    },
    interpretation: {
      oracleText: '喜信将至，宜速不宜迟。',
      actionHint: '抓住眼前这个机会。',
      disclaimer: '仅供传统文化体验与自我参考。',
    },
    thought_note: '那件只能自己知道的事',
    verification: {
      status: 'fulfilled',
      updated_at: '2026-07-29T02:00:00.000Z',
    },
    ...overrides,
  }
}

function createStubContext() {
  const calls = { fillText: [], strokeRect: [] }
  const gradient = { addColorStop: () => {} }

  return {
    calls,
    createLinearGradient: () => gradient,
    createCircularGradient: () => gradient,
    setFillStyle: () => {},
    setStrokeStyle: () => {},
    setLineWidth: () => {},
    setFontSize: () => {},
    setTextAlign: () => {},
    fillRect: () => {},
    strokeRect: (...args) => calls.strokeRect.push(args),
    fillText: (text, x, y) => calls.fillText.push({ text, x, y }),
    drawImage: () => {},
    save: () => {},
    restore: () => {},
    translate: () => {},
    rotate: () => {},
  }
}

test('仅应验记录可导出验课卡', () => {
  assert.equal(canExportVerificationCard(buildRecord()), true)

  for (const status of ['unfulfilled', 'deferred', 'unclear']) {
    assert.equal(canExportVerificationCard(buildRecord({
      verification: { status, updated_at: '2026-07-29T02:00:00.000Z' },
    })), false, `status ${status} 不可导出`)
  }

  assert.equal(canExportVerificationCard(buildRecord({ verification: undefined })), false)
  assert.equal(canExportVerificationCard(null), false)
})

test('非应验记录构建卡片 model 返回 null', () => {
  for (const status of ['unfulfilled', 'deferred', 'unclear']) {
    assert.equal(buildVerificationRecordCardModel(buildRecord({
      verification: { status, updated_at: '2026-07-29T02:00:00.000Z' },
    })), null, `status ${status} 应返回 null`)
  }

  assert.equal(buildVerificationRecordCardModel(buildRecord({ verification: undefined })), null)
  assert.equal(buildVerificationRecordCardModel(null), null)
})

test('应验时间按东八区格式化，UTC 16:00 属于次日', () => {
  assert.equal(
    formatVerifiedAtText(buildRecord({
      verification: { status: 'fulfilled', updated_at: '2026-07-28T16:00:00.000Z' },
    })),
    '07.29 应验',
  )
  assert.equal(
    formatVerifiedAtText(buildRecord({
      verification: { status: 'fulfilled', updated_at: '2026-07-28T15:59:59.000Z' },
    })),
    '07.28 应验',
  )
  assert.equal(
    formatVerifiedAtText(buildRecord({
      verification: { status: 'fulfilled', updated_at: 'not-a-date' },
    })),
    '',
  )
})

test('验课卡 model 与结果卡 model 同色调，并带应验日期', () => {
  const record = buildRecord()
  const resultModel = buildResultCardImageModel(record)
  const model = buildVerificationRecordCardModel(record)

  assert.equal(model.toneStyle, resultModel.toneStyle)
  assert.equal(model.symbol, resultModel.symbol)
  assert.equal(model.grade, resultModel.grade)
  assert.equal(model.oracleText, resultModel.oracleText)
  assert.equal(model.verifiedAtText, '07.29 应验')
})

test('验课卡绘制简洁正面：宫位大字 + 农历时辰 + 应验日期', () => {
  const model = buildVerificationRecordCardModel(buildRecord())
  const ctx = createStubContext()

  drawVerificationRecordCard(ctx, model)

  const texts = ctx.calls.fillText.map((call) => call.text)
  assert.ok(texts.includes('07.29 应验'), '应绘制应验日期')
  assert.ok(texts.includes('速'), '应绘制正面宫位大字')
  assert.ok(texts.includes('喜'), '应绘制正面宫位大字')
  assert.ok(texts.includes('农历七月廿一 · 辰时'), '应绘制农历时辰')
  assert.ok(texts.includes('仅供传统文化体验与自我参考。'), '应保留免责声明')

  // 简洁卡面：无验课印、无品牌行、无方法行、无问道印、无码位、无线框
  assert.ok(!texts.includes('验'), '不绘制验课印')
  assert.equal(ctx.calls.strokeRect.length, 0, '卡面无任何描边框')
  assert.ok(!texts.includes('一念六壬'), '不绘制品牌行')
  assert.ok(!texts.some((text) => `${text}`.includes('小六壬')), '不绘制方法行')
  assert.ok(!texts.includes('问'), '不绘制问道印与码位占位')
  assert.ok(!texts.includes('道'), '不绘制问道印与码位占位')
  assert.ok(!texts.includes('喜信将至，宜速不宜迟。'), '正面不绘制签语')
  assert.ok(!texts.includes('吉'), '正面不绘制档位')
})

test('单条验课卡源码不引用此念', async () => {
  const cardSource = await readFile(
    new URL('../services/verification-record-card.core.js', import.meta.url),
    'utf8',
  )

  assert.doesNotMatch(cardSource, /thought_note/)
})
