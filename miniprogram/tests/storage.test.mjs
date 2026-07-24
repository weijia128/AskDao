import test from 'node:test'
import assert from 'node:assert/strict'

import {
  applyHistoryRecordPatch,
  formatHistoryCreatedAt,
  removeHistoryRecord,
} from '../services/storage.core.js'

test('history record patch updates the matching record without moving it', () => {
  const records = [
    { id: 'newer', thought_note: '', grade: '平' },
    { id: 'older', thought_note: '', grade: '顺' },
  ]

  const nextRecords = applyHistoryRecordPatch(records, 'older', {
    thought_note: '下周是否适合推进合同',
  })

  assert.deepEqual(nextRecords, [
    { id: 'newer', thought_note: '', grade: '平' },
    { id: 'older', thought_note: '下周是否适合推进合同', grade: '顺' },
  ])
  assert.deepEqual(records[1], { id: 'older', thought_note: '', grade: '顺' })
})

test('history record patch leaves records unchanged when id is missing', () => {
  const records = [{ id: 'only', thought_note: '', grade: '顺' }]

  assert.deepEqual(applyHistoryRecordPatch(records, 'missing', { thought_note: '不会写入' }), records)
})

test('history created time formats as Beijing local year month day and minute', () => {
  assert.equal(formatHistoryCreatedAt('2026-07-23T23:06:00.000Z'), '2026年7月24日 07:06')
})

test('history created time falls back to record created_at text when invalid', () => {
  assert.equal(formatHistoryCreatedAt('2026-07-24 07:06'), '2026-07-24 07:06')
})

test('history record removal deletes the matching record without mutating source', () => {
  const records = [
    { id: 'newer', grade: '平' },
    { id: 'older', grade: '顺' },
  ]

  const nextRecords = removeHistoryRecord(records, 'older')

  assert.deepEqual(nextRecords, [{ id: 'newer', grade: '平' }])
  assert.deepEqual(records, [
    { id: 'newer', grade: '平' },
    { id: 'older', grade: '顺' },
  ])
})
