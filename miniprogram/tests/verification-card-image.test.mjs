import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildVerificationCardModel,
  formatVerificationRange,
  VERIFICATION_CARD_HEIGHT,
  VERIFICATION_CARD_WIDTH,
} from '../services/verification-card-image.core.js'

const settled = (id, status, createdAt) => ({
  id,
  thought_note: '此事可否推进',
  created_at: createdAt,
  rule_result: { symbol: '大安', grade: '顺', created_at: createdAt },
  verification: { status, updated_at: createdAt },
})

test('验课卡沿用结果卡的画布尺寸', () => {
  assert.equal(VERIFICATION_CARD_WIDTH, 375)
  assert.equal(VERIFICATION_CARD_HEIGHT, 560)
})

test('没有任何结论时不生成验课卡', () => {
  assert.equal(buildVerificationCardModel([]), null)
  assert.equal(buildVerificationCardModel([settled('a', 'deferred', '2026-07-20T16:00:00.000Z')]), null)
})

test('验课卡汇总应验率与统计行', () => {
  const model = buildVerificationCardModel([
    settled('c', 'fulfilled', '2026-07-24T16:00:00.000Z'),
    settled('b', 'unfulfilled', '2026-07-22T16:00:00.000Z'),
    settled('a', 'fulfilled', '2026-07-20T16:00:00.000Z'),
  ])

  assert.equal(model.brand, '问道')
  assert.equal(model.title, '验课')
  assert.equal(model.rateText, '67%')
  assert.equal(model.rateCaption, '应验率')
  assert.deepEqual(model.statLines, ['已验 3 课', '应验 2 · 未应验 1'])
  assert.equal(model.disclaimer, '仅供传统文化体验与自我参考。')
  assert.equal(model.summary.settled, 3)
})

test('时间跨度按东八区从最早到最晚', () => {
  const range = formatVerificationRange([
    settled('c', 'fulfilled', '2026-07-24T16:00:00.000Z'),
    settled('a', 'fulfilled', '2026-07-20T16:00:00.000Z'),
  ])

  assert.equal(range, '2026.07.21 — 2026.07.25')
})

test('只有一条结论时时间跨度只显示一个日期', () => {
  assert.equal(
    formatVerificationRange([settled('a', 'fulfilled', '2026-07-20T16:00:00.000Z')]),
    '2026.07.21',
  )
})

test('未定论的记录不参与时间跨度', () => {
  assert.equal(
    formatVerificationRange([settled('a', 'deferred', '2026-07-20T16:00:00.000Z')]),
    '',
  )
})
