import test from 'node:test'
import assert from 'node:assert/strict'

import {
  DAILY_DIVINATION_LIMIT,
  canStartDailyDivination,
  getDailyDivinationUsage,
  recordDailyDivination,
} from '../services/daily-limit.core.js'

function createStorage(initial = undefined) {
  let value = initial

  return {
    getStorageSync() {
      return value
    },
    setStorageSync(_key, nextValue) {
      value = nextValue
    },
  }
}

test('daily divination limit starts with three remaining attempts', () => {
  const storage = createStorage()
  const usage = getDailyDivinationUsage(storage, new Date(2026, 6, 24, 8))

  assert.equal(DAILY_DIVINATION_LIMIT, 3)
  assert.equal(usage.count, 0)
  assert.equal(usage.remaining, 3)
  assert.equal(canStartDailyDivination(storage, new Date(2026, 6, 24, 8)), true)
})

test('daily divination limit blocks the fourth question on the same day', () => {
  const storage = createStorage()
  const now = new Date(2026, 6, 24, 8)

  recordDailyDivination(storage, now)
  recordDailyDivination(storage, now)
  const thirdUsage = recordDailyDivination(storage, now)

  assert.equal(thirdUsage.count, 3)
  assert.equal(thirdUsage.remaining, 0)
  assert.equal(canStartDailyDivination(storage, now), false)
})

test('daily divination limit resets on a new local day', () => {
  const storage = createStorage({ date: '2026-07-24', count: 3 })
  const usage = getDailyDivinationUsage(storage, new Date(2026, 6, 25, 8))

  assert.equal(usage.count, 0)
  assert.equal(usage.remaining, 3)
})
