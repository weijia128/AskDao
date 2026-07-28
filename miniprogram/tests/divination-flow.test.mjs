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
    historyRecords: [latestRecord],
    dailyUsage: { date: '2026-07-27', count: 3, remaining: 0, limit: 3 },
    ...overrides,
  }
}

test('repeat wins before a full daily limit and leaves stored state unchanged', () => {
  const state = buildState()
  const before = structuredClone(state)
  const attempt = resolveDivinationAttempt(state)

  assert.equal(attempt.outcome, 'repeat')
  assert.equal(attempt.record, state.latestRecord)
  assert.deepEqual(state, before)
  assert.equal(state.historyRecords.length, 1)
  assert.equal(state.dailyUsage.count, 3)
  assert.equal(state.latestRecord.id, 'record-1')
})

test('a full daily limit blocks a different period', () => {
  const state = buildState({ periodKey: '2026-07-27/6' })
  const attempt = resolveDivinationAttempt(state)

  assert.equal(attempt.outcome, 'limit')
})

test('an available different period proceeds and consumes one attempt after success', () => {
  const state = buildState({
    periodKey: '2026-07-27/6',
    dailyUsage: { date: '2026-07-27', count: 1, remaining: 2, limit: 3 },
  })
  const attempt = resolveDivinationAttempt(state)

  assert.equal(attempt.outcome, 'proceed')
})

test('legacy records derive a period key from created time and hour index', () => {
  const record = buildState().latestRecord
  delete record.period_key

  assert.equal(getRecordPeriodKey(record), '2026-07-27/5')
})
