import test from 'node:test'
import assert from 'node:assert/strict'

import {
  calculateXiaoLiuren,
  getChineseHour,
  mapRemainderToSymbol,
} from '../domain/rules/xiao-liuren.core.js'

test('maps 0 remainder to 空亡 and 1 remainder to 大安', () => {
  assert.equal(mapRemainderToSymbol(0), '空亡')
  assert.equal(mapRemainderToSymbol(1), '大安')
})

test('maps 07:00 to 辰时 with hour index 5', () => {
  assert.deepEqual(getChineseHour(7), {
    branch: '辰',
    index: 5,
    range: '07:00-08:59',
  })
})

test('calculates 农历七月二十一日辰时 as 大安 / 顺', () => {
  const result = calculateXiaoLiuren({
    lunarMonth: 7,
    lunarDay: 21,
    hourIndex: 5,
    hourBranch: '辰',
    createdAt: '2026-07-21T07:00:00+08:00',
  })

  assert.deepEqual(result, {
    method: 'xiao_liuren',
    rule_version: 'xiao_liuren_v1',
    input_snapshot: {
      lunar_month: 7,
      lunar_day: 21,
      hour_branch: '辰',
      hour_index: 5,
    },
    calculation: {
      formula: '(7 + 21 + 5 - 2) % 6',
      result: 1,
    },
    symbol: '大安',
    grade: '顺',
    created_at: '2026-07-21T07:00:00+08:00',
  })
})
