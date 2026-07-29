import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getRecordPeriodKey,
  resolveDivinationAttempt,
} from '../application/divination-flow.core.js'

function buildState(overrides = {}) {
  const latestRecord = {
    id: 'record-1',
    period_key: '2026-07-27/5',
    rule_result: {
      created_at: '2026-07-27T00:10:00.000Z',
      input_snapshot: { lunar_month: 6, lunar_day: 14, hour_index: 5 },
    },
  }

  return {
    periodKey: '2026-07-27/5',
    latestRecord,
    dailyUsage: { date: '2026-07-27', count: 1, remaining: 2, limit: 3 },
    ...overrides,
  }
}

test('every divination proceeds as its own record, repeat is only a display flag', () => {
  const attempt = resolveDivinationAttempt(buildState())

  assert.equal(attempt.outcome, 'proceed')
  assert.equal(attempt.isRepeat, true)
})

test('a different period proceeds without the repeat flag', () => {
  const attempt = resolveDivinationAttempt(buildState({ periodKey: '2026-07-27/6' }))

  assert.equal(attempt.outcome, 'proceed')
  assert.equal(attempt.isRepeat, false)
})

test('a full daily limit blocks every divination, including repeats', () => {
  const state = buildState({
    dailyUsage: { date: '2026-07-27', count: 3, remaining: 0, limit: 3 },
  })
  const attempt = resolveDivinationAttempt(state)

  assert.equal(attempt.outcome, 'limit')
  assert.equal(attempt.isRepeat, false)
})

test('missing or empty period key never flags a repeat', () => {
  assert.equal(resolveDivinationAttempt(buildState({ periodKey: '' })).isRepeat, false)
  assert.equal(resolveDivinationAttempt(buildState({ latestRecord: null })).isRepeat, false)
})

test('legacy records derive a period key from created time and hour index', () => {
  const record = buildState().latestRecord
  delete record.period_key

  assert.equal(getRecordPeriodKey(record), '2026-07-27/5')
})
