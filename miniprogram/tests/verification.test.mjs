import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildVerificationPatch,
  getDueVerificationRecord,
  getVerificationLabel,
  isVerificationDue,
  resolveDeferAction,
  summarizeVerifications,
} from '../domain/verification/verification.core.js'

// 2026-07-20T16:00:00Z 即东八区 2026-07-21 00:00
const CREATED_AT = '2026-07-20T16:00:00.000Z'
const at = (iso) => new Date(iso)

const createRecord = (overrides = {}) => ({
  id: 'r1',
  thought_note: '下周是否适合推进合同',
  created_at: CREATED_AT,
  rule_result: { symbol: '大安', grade: '顺', created_at: CREATED_AT },
  ...overrides,
})

test('写有此念且满三个东八区日历日的记录进入待验', () => {
  // 东八区 07-21 → 07-24，相差 3 日
  assert.equal(isVerificationDue(createRecord(), at('2026-07-23T16:00:00.000Z')), true)
})

test('不满三日的记录不进入待验', () => {
  assert.equal(isVerificationDue(createRecord(), at('2026-07-22T16:00:00.000Z')), false)
})

// 其余用例都锚在上海午夜整点、相差整日，偏移常数会被差值抵消，
// 因此即便把 SHANGHAI_OFFSET_MS 改成 0 也照样全绿。这条不对齐日界：
// 上海 07-20 23:00 起课，07-23 01:00 查看 —— 真实仅 50 小时，
// 却已跨三个上海日界。按日历日应待验，按滚动 72 小时则不应。
test('按上海日历日计数，不足七十二小时也可能已满三日', () => {
  const createdAt = '2026-07-20T15:00:00.000Z'
  const record = createRecord({
    created_at: createdAt,
    rule_result: { symbol: '大安', grade: '顺', created_at: createdAt },
  })

  assert.equal(isVerificationDue(record, at('2026-07-22T17:00:00.000Z')), true)
})

test('没有写此念的记录永不进入待验', () => {
  const record = createRecord({ thought_note: '   ' })

  assert.equal(isVerificationDue(record, at('2026-08-30T16:00:00.000Z')), false)
})

test('已给出结论的记录不再追问', () => {
  for (const status of ['fulfilled', 'unfulfilled', 'unclear']) {
    const record = createRecord({ verification: { status, updated_at: CREATED_AT } })

    assert.equal(isVerificationDue(record, at('2026-08-30T16:00:00.000Z')), false)
  }
})

test('延后的记录要满七日才再次追问', () => {
  const record = createRecord({ verification: { status: 'deferred', updated_at: CREATED_AT } })

  assert.equal(isVerificationDue(record, at('2026-07-25T16:00:00.000Z')), false)
  assert.equal(isVerificationDue(record, at('2026-07-27T16:00:00.000Z')), true)
})

test('待验队列取最旧的一条，history 按新到旧存储', () => {
  const records = [
    createRecord({ id: 'newer', created_at: '2026-07-22T16:00:00.000Z', rule_result: { symbol: '速喜', grade: '顺', created_at: '2026-07-22T16:00:00.000Z' } }),
    createRecord({ id: 'older' }),
  ]

  assert.equal(getDueVerificationRecord(records, at('2026-07-26T16:00:00.000Z')).id, 'older')
})

test('没有待验记录时返回 null', () => {
  assert.equal(getDueVerificationRecord([createRecord()], at('2026-07-21T16:00:00.000Z')), null)
  assert.equal(getDueVerificationRecord([], at('2026-07-26T16:00:00.000Z')), null)
})

test('验证补丁写入状态与时间戳', () => {
  assert.deepEqual(buildVerificationPatch('fulfilled', at('2026-07-24T02:30:00.000Z')), {
    verification: {
      status: 'fulfilled',
      updated_at: '2026-07-24T02:30:00.000Z',
    },
  })
})

test('验证补丁拒绝非法状态', () => {
  assert.throws(() => buildVerificationPatch('maybe', at(CREATED_AT)), /Invalid verification status/)
})

test('首次尚未分晓转为延后，二次不再追问', () => {
  assert.equal(resolveDeferAction(createRecord()), 'deferred')
  assert.equal(
    resolveDeferAction(createRecord({ verification: { status: 'deferred', updated_at: CREATED_AT } })),
    'unclear',
  )
})

test('应验率以有结论的记录为分母，存疑不计入', () => {
  const records = [
    createRecord({ verification: { status: 'fulfilled', updated_at: CREATED_AT } }),
    createRecord({ verification: { status: 'fulfilled', updated_at: CREATED_AT } }),
    createRecord({ verification: { status: 'fulfilled', updated_at: CREATED_AT } }),
    createRecord({ verification: { status: 'unfulfilled', updated_at: CREATED_AT } }),
    createRecord({ verification: { status: 'unclear', updated_at: CREATED_AT } }),
    createRecord(),
  ]

  assert.deepEqual(summarizeVerifications(records), {
    fulfilled: 3,
    unfulfilled: 1,
    unclear: 1,
    deferred: 0,
    settled: 4,
    total: 6,
    rate: 75,
  })
})

test('无结论时应验率为零而不是除零', () => {
  assert.equal(summarizeVerifications([createRecord()]).rate, 0)
  assert.equal(summarizeVerifications([]).rate, 0)
})

test('状态文案覆盖四态，未验证记录无文案', () => {
  assert.equal(getVerificationLabel(createRecord({ verification: { status: 'fulfilled', updated_at: CREATED_AT } })), '应验')
  assert.equal(getVerificationLabel(createRecord({ verification: { status: 'unfulfilled', updated_at: CREATED_AT } })), '未应验')
  assert.equal(getVerificationLabel(createRecord({ verification: { status: 'unclear', updated_at: CREATED_AT } })), '存疑')
  assert.equal(getVerificationLabel(createRecord({ verification: { status: 'deferred', updated_at: CREATED_AT } })), '待验')
  assert.equal(getVerificationLabel(createRecord()), '')
})
