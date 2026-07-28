# 验课闭环 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让写过「此念」的问道记录在三日后回到用户面前接受应验标记，把一次性的问卦交易变成一个跨天的开放回路。

**Architecture:** 纯本地实现，零后端。在 history record 上新增 `verification` 字段（状态 + 时间戳），由一个新的 `domain/verification` 纯逻辑模块判定「哪条记录该验了」。首页 `onShow` 扫描并浮出待验卡片，标记结果写回 `askdao_history_records`（若命中最新记录则同步 `askdao_latest_result`）。问道录展示状态标签与累计应验率，并可导出一张验课分享卡。

**Tech Stack:** WeChat Mini Program (glass-easel)、TypeScript 5、`node:test`、`wx.createCanvasContext` 离屏绘制。无新增运行时依赖。

## Global Constraints

- 所有可测逻辑必须放在 `.core.js` ES module 中，**禁止出现 `wx.*`**；`.ts` 同名文件只做类型包装与 `wx` 注入。需要存储时把 `wx` 作为参数传入。
- 测试用 `node:test`，命令 `npm test`；单文件 `node --test miniprogram/tests/<name>.test.mjs`。
- 类型检查固定 TypeScript 5：`npx --yes -p typescript@5 tsc --noEmit -p miniprogram/tsconfig.json`。TS 6 会拒绝本项目 tsconfig。
- **不得新增任何运行时 npm 依赖**（`packNpmManually: false`，无 `miniprogram_npm`，`devtools-config.test.mjs` 有断言）。
- `pages/home/index.wxss` 与 `pages/history/index.wxss` 必须保留 `@media (prefers-color-scheme: dark)` 块，且块内需包含 `#141614` 与 `#0c0e0c`（`theme-mode.test.mjs` 契约）。新增样式必须同时写浅色与深色两套。
- 免责声明文案固定为 `仅供传统文化体验与自我参考。`，不得扩写。
- 分享相关代码**不得引用 `thought_note`**（`navigation-flow.test.mjs` 已断言 `wx-share.ts` 中不出现该字段）。
- 禁止引入签到、连续天数、积分、徽章、打卡类机制。
- 时间一律按东八区民用日历计算，偏移量 `8 * 60 * 60 * 1000`。
- commit 格式 `<type>: <description>`，类型取 `feat|fix|refactor|docs|test|chore|perf|ci`。

## 数据契约

新增写入 history record 的字段（旧记录无此字段，视为 `pending`）：

```js
record.verification = {
  status: 'fulfilled' | 'unfulfilled' | 'deferred' | 'unclear',
  updated_at: '2026-07-28T09:12:00.000Z',
}
```

状态机：

```
无 verification 字段 (pending)
      │  满 3 个东八区日历日
      ▼
  首次追问 ──┬── 应验 → fulfilled  (终态)
             ├── 未应验 → unfulfilled (终态)
             └── 尚未分晓 → deferred
                       │  自 created_at 起满 7 日
                       ▼
                  二次追问 ──┬── 应验 → fulfilled  (终态)
                             ├── 未应验 → unfulfilled (终态)
                             └── 尚未分晓 → unclear (终态，不再追问)
```

只有 `thought_note` 非空的记录才会进入待验队列。应验率分母为 `fulfilled + unfulfilled`（`unclear` 不计入）。

## File Structure

| 文件 | 职责 |
|---|---|
| `miniprogram/domain/verification/verification.core.js` | 新建。待验判定、状态补丁构造、延后决议、统计汇总、状态文案表。纯函数。 |
| `miniprogram/domain/verification/verification.ts` | 新建。类型包装层。 |
| `miniprogram/services/verification-card-image.core.js` | 新建。验课卡数据模型与文本排布，纯函数。 |
| `miniprogram/tests/verification.test.mjs` | 新建。域逻辑单测。 |
| `miniprogram/tests/verification-flow.test.mjs` | 新建。UI 源码契约测试（本仓库既有风格）。 |
| `miniprogram/pages/home/index.{ts,wxml,wxss}` | 修改。待验浮层与三态标记。 |
| `miniprogram/pages/history/index.{ts,wxml,wxss}` | 修改。状态标签、统计头、验课卡 canvas 与保存。 |
| `miniprogram/services/analytics.ts` | 修改。新增三个事件名。 |

## 超出本版范围（不要在本计划内实现）

- **`askdao_history_records` 的 20 条上限**（`services/storage.ts:12`）会让旧记录连同其验证结果一起被挤掉，与「历史即资产」的目标冲突。单条记录约 500B，微信给 10MB，提到 100 条是安全的。**这是一个需要产品确认的独立决策，本计划不改动它。**
- 订阅消息（需后端）。
- `is_favorite` 收藏 UI。

---

### Task 1: 验证状态域模块

**Files:**
- Create: `miniprogram/domain/verification/verification.core.js`
- Create: `miniprogram/domain/verification/verification.ts`
- Test: `miniprogram/tests/verification.test.mjs`

**Interfaces:**
- Consumes: 无（本任务是叶子模块）
- Produces:
  - `isVerificationDue(record, now?: Date): boolean`
  - `getDueVerificationRecord(records, now?: Date): record | null`
  - `buildVerificationPatch(status, now?: Date): { verification: { status, updated_at } }`
  - `resolveDeferAction(record): 'deferred' | 'unclear'`
  - `summarizeVerifications(records): { fulfilled, unfulfilled, unclear, deferred, settled, total, rate }`
  - `getVerificationLabel(record): string`
  - 常量 `VERIFICATION_FIRST_WINDOW_DAYS = 3`、`VERIFICATION_SECOND_WINDOW_DAYS = 7`、`VERIFICATION_LABELS`

- [ ] **Step 1: 写失败测试**

创建 `miniprogram/tests/verification.test.mjs`：

```js
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
```

- [ ] **Step 2: 跑测试确认失败**

```bash
node --test miniprogram/tests/verification.test.mjs
```

预期：`ERR_MODULE_NOT_FOUND`，找不到 `../domain/verification/verification.core.js`。

- [ ] **Step 3: 实现 core 模块**

创建 `miniprogram/domain/verification/verification.core.js`：

```js
const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

export const VERIFICATION_FIRST_WINDOW_DAYS = 3
export const VERIFICATION_SECOND_WINDOW_DAYS = 7

const TERMINAL_STATUSES = ['fulfilled', 'unfulfilled', 'unclear']
const ALL_STATUSES = ['fulfilled', 'unfulfilled', 'deferred', 'unclear']

export const VERIFICATION_LABELS = {
  fulfilled: '应验',
  unfulfilled: '未应验',
  unclear: '存疑',
  deferred: '待验',
}

// 东八区民用日历的「第几天」。用日历日差而非 72 小时，
// 是为了让「三日前」与用户对日期的直觉一致。
function getShanghaiDayNumber(date) {
  const instant = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(instant.getTime())) {
    throw new Error(`Invalid date: ${date}`)
  }

  return Math.floor((instant.getTime() + SHANGHAI_OFFSET_MS) / DAY_MS)
}

export function getRecordVerificationStatus(record) {
  const status = record?.verification?.status
  return ALL_STATUSES.includes(status) ? status : ''
}

export function isVerificationTerminal(status) {
  return TERMINAL_STATUSES.includes(status)
}

export function getVerificationWindowDays(record) {
  return getRecordVerificationStatus(record) === 'deferred'
    ? VERIFICATION_SECOND_WINDOW_DAYS
    : VERIFICATION_FIRST_WINDOW_DAYS
}

export function isVerificationDue(record, now = new Date()) {
  const note = `${record?.thought_note || ''}`.trim()
  if (!note) {
    return false
  }

  if (isVerificationTerminal(getRecordVerificationStatus(record))) {
    return false
  }

  const createdAt = record?.rule_result?.created_at || record?.created_at
  if (!createdAt) {
    return false
  }

  try {
    const elapsedDays = getShanghaiDayNumber(now) - getShanghaiDayNumber(createdAt)
    return elapsedDays >= getVerificationWindowDays(record)
  } catch (error) {
    // 记录时间损坏时不追问，避免脏数据反复弹窗
    return false
  }
}

export function getDueVerificationRecord(records, now = new Date()) {
  if (!Array.isArray(records)) {
    return null
  }

  const due = records.filter((record) => isVerificationDue(record, now))
  if (!due.length) {
    return null
  }

  // history 按新到旧存储，最旧的一条排在末尾，先验它
  return due[due.length - 1]
}

export function buildVerificationPatch(status, now = new Date()) {
  if (!ALL_STATUSES.includes(status)) {
    throw new Error(`Invalid verification status: ${status}`)
  }

  const instant = now instanceof Date ? now : new Date(now)
  if (Number.isNaN(instant.getTime())) {
    throw new Error(`Invalid date: ${now}`)
  }

  return {
    verification: {
      status,
      updated_at: instant.toISOString(),
    },
  }
}

// 第一次「尚未分晓」推迟到七日后；第二次落为存疑，不再追问。
export function resolveDeferAction(record) {
  return getRecordVerificationStatus(record) === 'deferred' ? 'unclear' : 'deferred'
}

export function summarizeVerifications(records) {
  const list = Array.isArray(records) ? records : []
  const counts = { fulfilled: 0, unfulfilled: 0, unclear: 0, deferred: 0 }

  for (const record of list) {
    const status = getRecordVerificationStatus(record)
    if (status) {
      counts[status] += 1
    }
  }

  const settled = counts.fulfilled + counts.unfulfilled

  return {
    ...counts,
    settled,
    total: list.length,
    rate: settled ? Math.round((counts.fulfilled / settled) * 100) : 0,
  }
}

export function getVerificationLabel(record) {
  return VERIFICATION_LABELS[getRecordVerificationStatus(record)] || ''
}
```

- [ ] **Step 4: 跑测试确认通过**

```bash
node --test miniprogram/tests/verification.test.mjs
```

预期：13 个测试全部 PASS。

- [ ] **Step 5: 加类型包装层**

创建 `miniprogram/domain/verification/verification.ts`：

```ts
import {
  buildVerificationPatch as buildVerificationPatchCore,
  getDueVerificationRecord as getDueVerificationRecordCore,
  getVerificationLabel as getVerificationLabelCore,
  resolveDeferAction as resolveDeferActionCore,
  summarizeVerifications as summarizeVerificationsCore,
  VERIFICATION_FIRST_WINDOW_DAYS,
  VERIFICATION_LABELS,
  VERIFICATION_SECOND_WINDOW_DAYS,
} from './verification.core'

export { VERIFICATION_FIRST_WINDOW_DAYS, VERIFICATION_LABELS, VERIFICATION_SECOND_WINDOW_DAYS }

export type VerificationStatus = 'fulfilled' | 'unfulfilled' | 'deferred' | 'unclear'

export interface VerificationState {
  status: VerificationStatus
  updated_at: string
}

export interface VerificationSummary {
  fulfilled: number
  unfulfilled: number
  unclear: number
  deferred: number
  settled: number
  total: number
  rate: number
}

export function getDueVerificationRecord<T>(records: T[], now: Date = new Date()): T | null {
  return getDueVerificationRecordCore(records, now) as T | null
}

export function buildVerificationPatch(
  status: VerificationStatus,
  now: Date = new Date(),
): { verification: VerificationState } {
  return buildVerificationPatchCore(status, now) as { verification: VerificationState }
}

export function resolveDeferAction(record: unknown): VerificationStatus {
  return resolveDeferActionCore(record) as VerificationStatus
}

export function summarizeVerifications(records: unknown[]): VerificationSummary {
  return summarizeVerificationsCore(records) as VerificationSummary
}

export function getVerificationLabel(record: unknown): string {
  return getVerificationLabelCore(record)
}
```

- [ ] **Step 6: 类型检查并提交**

```bash
npx --yes -p typescript@5 tsc --noEmit -p miniprogram/tsconfig.json
npm test
git add miniprogram/domain/verification miniprogram/tests/verification.test.mjs
git commit -m "feat: add verification state domain module"
```

预期：tsc 无输出；`npm test` 全绿（原 88 + 新 13 = 101）。

---

### Task 2: 首页待验浮层与三态标记

**Files:**
- Modify: `miniprogram/services/analytics.ts:3-18`
- Modify: `miniprogram/pages/home/index.ts`
- Modify: `miniprogram/pages/home/index.wxml:4-11`（`date-header` 之后插入）
- Modify: `miniprogram/pages/home/index.wxss`
- Test: `miniprogram/tests/verification-flow.test.mjs`

**Interfaces:**
- Consumes: Task 1 的 `getDueVerificationRecord`、`buildVerificationPatch`、`resolveDeferAction`（从 `../../domain/verification/verification` 导入）；既有 `getHistoryRecords`、`updateHistoryRecord`、`formatHistoryCreatedAt`（`../../services/storage`）
- Produces: 首页 data 字段 `dueRecord`、`dueRecordTimeText`；方法 `refreshDueVerification`、`handleVerify`、`syncLatestResult`

- [ ] **Step 1: 写失败的源码契约测试**

创建 `miniprogram/tests/verification-flow.test.mjs`：

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const readText = (path) => readFile(new URL(path, import.meta.url), 'utf8')

test('首页在有待验记录时浮出验课卡并给出三个出口', async () => {
  const homeMarkup = await readText('../pages/home/index.wxml')
  const homeStyles = await readText('../pages/home/index.wxss')

  assert.match(homeMarkup, /class="verify-panel"/)
  assert.match(homeMarkup, /wx:if="\{\{dueRecord\}\}"/)
  assert.match(homeMarkup, /验课/)
  assert.match(homeMarkup, /\{\{dueRecordTimeText\}\}/)
  assert.match(homeMarkup, /\{\{dueRecord\.thought_note\}\}/)
  assert.match(homeMarkup, /\{\{dueRecord\.rule_result\.symbol\}\}/)
  assert.match(homeMarkup, /data-action="fulfilled"/)
  assert.match(homeMarkup, /data-action="unfulfilled"/)
  assert.match(homeMarkup, /data-action="defer"/)
  assert.match(homeMarkup, />应验</)
  assert.match(homeMarkup, />未应验</)
  assert.match(homeMarkup, />尚未分晓</)
  assert.match(homeMarkup, /bindtap="handleVerify"/)

  assert.match(homeStyles, /\.verify-panel/)
  assert.match(homeStyles, /\.verify-action/)
})

test('首页标记验证后写回历史并同步最新记录副本', async () => {
  const homeSource = await readText('../pages/home/index.ts')

  assert.match(homeSource, /getDueVerificationRecord/)
  assert.match(homeSource, /buildVerificationPatch/)
  assert.match(homeSource, /resolveDeferAction/)
  assert.match(homeSource, /updateHistoryRecord/)
  assert.match(homeSource, /syncLatestResult/)
  assert.match(homeSource, /askdao_latest_result/)
  assert.match(homeSource, /refreshDueVerification/)
  assert.match(homeSource, /track\('view_verification_prompt'/)
  assert.match(homeSource, /track\('mark_verification'/)
})

test('验证事件已登记到分析事件表', async () => {
  const analyticsSource = await readText('../services/analytics.ts')

  assert.match(analyticsSource, /'view_verification_prompt'/)
  assert.match(analyticsSource, /'mark_verification'/)
  assert.match(analyticsSource, /'save_verification_card'/)
})

test('验课闭环不引入签到打卡类机制', async () => {
  for (const path of ['../pages/home/index.wxml', '../pages/home/index.ts']) {
    const source = await readText(path)

    assert.doesNotMatch(source, /连续|签到|积分|徽章|打卡/)
  }
})
```

- [ ] **Step 2: 跑测试确认失败**

```bash
node --test miniprogram/tests/verification-flow.test.mjs
```

预期：4 个测试全部 FAIL，第一个报 `class="verify-panel"` 不匹配。

- [ ] **Step 3: 扩展分析事件表**

修改 `miniprogram/services/analytics.ts`，在 `AnalyticsEvent` 联合类型中 `'save_thought_note'` 之后加入三行：

```ts
  | 'save_thought_note'
  | 'view_verification_prompt'
  | 'mark_verification'
  | 'save_verification_card'
  | 'share_click'
```

- [ ] **Step 4: 实现首页逻辑**

修改 `miniprogram/pages/home/index.ts`。在文件顶部现有 import 之后追加：

```ts
import { getHistoryRecords, formatHistoryCreatedAt, updateHistoryRecord } from '../../services/storage'
import {
  buildVerificationPatch,
  getDueVerificationRecord,
  resolveDeferAction,
} from '../../domain/verification/verification'
```

在 `Page({ data: { ... } })` 的 data 中加入两个字段：

```ts
    dueRecord: null,
    dueRecordTimeText: '',
```

在 `Page` 内新增四个方法（放在 `handleOpenHistory` 之前）：

```ts
  refreshDueVerification() {
    const dueRecord = getDueVerificationRecord(getHistoryRecords())
    if (!dueRecord) {
      this.setData({ dueRecord: null, dueRecordTimeText: '' })
      return
    }

    this.setData({
      dueRecord,
      dueRecordTimeText: formatHistoryCreatedAt(
        dueRecord.rule_result?.created_at || dueRecord.created_at || '',
      ),
    })
    track('view_verification_prompt', {
      status: dueRecord.verification?.status || 'pending',
    })
  },

  handleVerify(event) {
    const action = event.currentTarget?.dataset?.action
    const record = this.data.dueRecord
    if (!action || !record) {
      return
    }

    const status = action === 'defer' ? resolveDeferAction(record) : action
    const patch = buildVerificationPatch(status)
    updateHistoryRecord(record.id, patch)
    this.syncLatestResult(record.id, patch)

    track('mark_verification', {
      status,
      symbol: record.rule_result?.symbol,
      grade: record.rule_result?.grade,
    })
    wx.showToast({ title: status === 'fulfilled' ? '已记应验' : '已记下', icon: 'none' })

    // 清空后立刻重扫，把积压的下一条接上
    this.setData({ dueRecord: null, dueRecordTimeText: '' })
    this.refreshDueVerification()
  },

  // history 与 askdao_latest_result 是两份副本，命中最新记录时必须一起更新，
  // 否则结果页读到的仍是未验证的旧对象。
  syncLatestResult(recordId, patch) {
    const latest = wx.getStorageSync('askdao_latest_result')
    if (!latest || latest.id !== recordId) {
      return
    }

    wx.setStorageSync('askdao_latest_result', { ...latest, ...patch })
  },
```

在既有的 `onShow()` 方法体末尾追加一行：

```ts
    this.refreshDueVerification()
```

- [ ] **Step 5: 实现首页标记**

修改 `miniprogram/pages/home/index.wxml`，在 `date-header` 块结束后、`hero` 块开始前插入：

```html
  <view class="verify-panel" wx:if="{{dueRecord}}">
    <view class="panel-caption">
      <view class="caption-line"></view>
      <view class="caption-text">验课</view>
      <view class="caption-line"></view>
    </view>
    <view class="verify-time">{{dueRecordTimeText}}，你曾问过一事</view>
    <view class="verify-note">此念：{{dueRecord.thought_note}}</view>
    <view class="verify-symbol">
      当时得 {{dueRecord.rule_result.symbol}} · {{dueRecord.rule_result.grade}}
    </view>
    <view class="verify-actions">
      <view class="verify-action" data-action="fulfilled" bindtap="handleVerify">应验</view>
      <view class="verify-action" data-action="unfulfilled" bindtap="handleVerify">未应验</view>
      <view class="verify-action muted" data-action="defer" bindtap="handleVerify">尚未分晓</view>
    </view>
  </view>
```

- [ ] **Step 6: 实现首页样式（浅色 + 深色）**

修改 `miniprogram/pages/home/index.wxss`。在 `.almanac-panel` 相关规则之后、`@media (prefers-color-scheme: dark)` 块**之前**追加浅色样式：

```css
.verify-panel {
  margin: 0 0 32rpx;
  padding: 32rpx 28rpx;
  border: 1rpx solid rgba(122, 96, 54, 0.28);
  border-radius: 16rpx;
  background: rgba(255, 251, 240, 0.72);
}

.verify-time {
  margin-top: 8rpx;
  color: #6b5636;
  font-size: 26rpx;
}

.verify-note {
  margin-top: 12rpx;
  color: #2f2a20;
  font-size: 30rpx;
  line-height: 1.6;
}

.verify-symbol {
  margin-top: 12rpx;
  color: #7a6036;
  font-size: 26rpx;
}

.verify-actions {
  display: flex;
  gap: 16rpx;
  margin-top: 28rpx;
}

.verify-action {
  flex: 1;
  padding: 18rpx 0;
  color: #4a3d24;
  border: 1rpx solid rgba(122, 96, 54, 0.36);
  border-radius: 999rpx;
  font-size: 26rpx;
  text-align: center;
}

.verify-action.muted {
  color: #8a7a5e;
  border-color: rgba(122, 96, 54, 0.2);
}
```

在既有的 `@media (prefers-color-scheme: dark)` 块**内部**追加深色覆盖：

```css
  .verify-panel {
    border-color: rgba(214, 199, 160, 0.2);
    background: rgba(20, 22, 20, 0.62);
  }

  .verify-time,
  .verify-symbol {
    color: rgba(232, 222, 198, 0.62);
  }

  .verify-note {
    color: #f2e9d4;
  }

  .verify-action {
    color: #e8dec6;
    border-color: rgba(214, 199, 160, 0.3);
  }

  .verify-action.muted {
    color: rgba(232, 222, 198, 0.55);
    border-color: rgba(214, 199, 160, 0.16);
  }
```

- [ ] **Step 7: 跑测试确认通过**

```bash
node --test miniprogram/tests/verification-flow.test.mjs
npm test
npx --yes -p typescript@5 tsc --noEmit -p miniprogram/tsconfig.json
```

预期：`verification-flow` 4 个 PASS；`npm test` 全绿（105）；tsc 无输出。若 `theme-mode.test.mjs` 报错，说明深色块被误改，检查块内仍含 `#141614` 与 `#0c0e0c`。

- [ ] **Step 8: 提交**

```bash
git add miniprogram/pages/home miniprogram/services/analytics.ts miniprogram/tests/verification-flow.test.mjs
git commit -m "feat: prompt due records for verification on home"
```

---

### Task 3: 问道录展示验证状态与累计应验率

**Files:**
- Modify: `miniprogram/pages/history/index.ts:12-18`（`buildDisplayRecords`）与 `refreshRecords`
- Modify: `miniprogram/pages/history/index.wxml:4`（标题下方）与卡片内部
- Modify: `miniprogram/pages/history/index.wxss`
- Test: `miniprogram/tests/verification-flow.test.mjs`（追加）

**Interfaces:**
- Consumes: Task 1 的 `getVerificationLabel`、`summarizeVerifications`
- Produces: history data 字段 `summary: VerificationSummary`；每条 display record 上的 `verificationText: string`

- [ ] **Step 1: 追加失败测试**

在 `miniprogram/tests/verification-flow.test.mjs` 末尾追加：

```js
test('问道录展示每条记录的验证状态与累计应验率', async () => {
  const historyMarkup = await readText('../pages/history/index.wxml')
  const historySource = await readText('../pages/history/index.ts')
  const historyStyles = await readText('../pages/history/index.wxss')

  assert.match(historyMarkup, /verify-summary/)
  assert.match(historyMarkup, /\{\{summary\.settled\}\}/)
  assert.match(historyMarkup, /\{\{summary\.fulfilled\}\}/)
  assert.match(historyMarkup, /\{\{summary\.rate\}\}%/)
  assert.match(historyMarkup, /应验率/)
  assert.match(historyMarkup, /\{\{item\.verificationText\}\}/)
  assert.match(historyMarkup, /wx:if="\{\{item\.verificationText\}\}"/)

  assert.match(historySource, /getVerificationLabel/)
  assert.match(historySource, /summarizeVerifications/)
  assert.match(historySource, /verificationText/)

  assert.match(historyStyles, /\.verify-summary/)
  assert.match(historyStyles, /\.verify-tag/)
})
```

- [ ] **Step 2: 跑测试确认失败**

```bash
node --test miniprogram/tests/verification-flow.test.mjs
```

预期：新测试 FAIL，报 `verify-summary` 不匹配。

- [ ] **Step 3: 实现 history 逻辑**

修改 `miniprogram/pages/history/index.ts`。在 import 区追加：

```ts
import { getVerificationLabel, summarizeVerifications } from '../../domain/verification/verification'
```

把 `buildDisplayRecords` 改为：

```ts
function buildDisplayRecords(records) {
  return records.map((record) => ({
    ...record,
    createdAtText: formatHistoryCreatedAt(record?.rule_result?.created_at || record?.created_at || ''),
    verificationText: getVerificationLabel(record),
  }))
}
```

在 `data` 中加入：

```ts
    summary: { fulfilled: 0, unfulfilled: 0, unclear: 0, deferred: 0, settled: 0, total: 0, rate: 0 },
```

把 `refreshRecords` 中的 `this.setData({...})` 改为同时写入 summary：

```ts
  refreshRecords() {
    const rawRecords = getHistoryRecords()
    const records = buildDisplayRecords(rawRecords)
    this.setData({
      records,
      summary: summarizeVerifications(rawRecords),
      openedRecordId: '',
      touchStartX: 0,
      touchRecordId: '',
    })
    track('view_history', { count: records.length })
  },
```

同时把 `handleDeleteRecord` 中的 `setData` 改为一并刷新 summary。将该方法内的：

```ts
    const records = buildDisplayRecords(deleteHistoryRecord(recordId))
    this.setData({
      records,
      openedRecordId: '',
      touchStartX: 0,
      touchRecordId: '',
    })
```

替换为：

```ts
    const rawRecords = deleteHistoryRecord(recordId)
    this.setData({
      records: buildDisplayRecords(rawRecords),
      summary: summarizeVerifications(rawRecords),
      openedRecordId: '',
      touchStartX: 0,
      touchRecordId: '',
    })
```

并在 `handleClearAllRecords` 成功回调的 `setData` 中补上：

```ts
          summary: { fulfilled: 0, unfulfilled: 0, unclear: 0, deferred: 0, settled: 0, total: 0, rate: 0 },
```

- [ ] **Step 4: 实现 history 标记**

修改 `miniprogram/pages/history/index.wxml`。在 `<view class="title">最近问道</view>` 之后插入：

```html
  <view class="verify-summary" wx:if="{{summary.settled}}">
    已验 {{summary.settled}} · 应验 {{summary.fulfilled}} · 应验率 {{summary.rate}}%
  </view>
```

在 `history-card` 内部，把这一行：

```html
        <view class="line">{{item.rule_result.symbol}} · {{item.rule_result.grade}}</view>
```

替换为：

```html
        <view class="line">
          <text>{{item.rule_result.symbol}} · {{item.rule_result.grade}}</text>
          <text class="verify-tag" wx:if="{{item.verificationText}}">{{item.verificationText}}</text>
        </view>
```

- [ ] **Step 5: 实现 history 样式（浅色 + 深色）**

修改 `miniprogram/pages/history/index.wxss`，在 `@media (prefers-color-scheme: dark)` 块之前追加：

```css
.verify-summary {
  margin: -12rpx 0 28rpx;
  color: #7a6036;
  font-size: 26rpx;
}

.verify-tag {
  margin-left: 16rpx;
  padding: 4rpx 16rpx;
  color: #6b5636;
  border: 1rpx solid rgba(122, 96, 54, 0.32);
  border-radius: 999rpx;
  font-size: 22rpx;
}
```

在既有 `@media (prefers-color-scheme: dark)` 块内部追加：

```css
  .verify-summary {
    color: rgba(232, 222, 198, 0.6);
  }

  .verify-tag {
    color: rgba(232, 222, 198, 0.72);
    border-color: rgba(214, 199, 160, 0.28);
  }
```

- [ ] **Step 6: 跑测试并提交**

```bash
npm test
npx --yes -p typescript@5 tsc --noEmit -p miniprogram/tsconfig.json
git add miniprogram/pages/history miniprogram/tests/verification-flow.test.mjs
git commit -m "feat: show verification status and rate in history"
```

预期：`npm test` 全绿（106）；tsc 无输出。

---

### Task 4: 验课卡数据模型

**Files:**
- Create: `miniprogram/services/verification-card-image.core.js`
- Test: `miniprogram/tests/verification-card-image.test.mjs`

**Interfaces:**
- Consumes: Task 1 的 `summarizeVerifications`（从 `../domain/verification/verification.core.js` 导入）
- Produces:
  - `buildVerificationCardModel(records): model | null`
  - `formatVerificationRange(records): string`
  - 常量 `VERIFICATION_CARD_WIDTH = 375`、`VERIFICATION_CARD_HEIGHT = 560`、`VERIFICATION_CARD_TONE`、`VERIFICATION_CARD_CODE_SLOT`
  - model 形状：`{ brand, title, rateText, rateCaption, statLines, rangeText, disclaimer, summary }`

- [ ] **Step 1: 写失败测试**

创建 `miniprogram/tests/verification-card-image.test.mjs`：

```js
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
```

- [ ] **Step 2: 跑测试确认失败**

```bash
node --test miniprogram/tests/verification-card-image.test.mjs
```

预期：`ERR_MODULE_NOT_FOUND`。

- [ ] **Step 3: 实现卡片数据模型**

创建 `miniprogram/services/verification-card-image.core.js`：

```js
import { summarizeVerifications } from '../domain/verification/verification.core.js'

export const VERIFICATION_CARD_WIDTH = 375
export const VERIFICATION_CARD_HEIGHT = 560
export const VERIFICATION_CARD_BACKGROUND_IMAGE = '/assets/images/result-card-bg.png'

// 与结果卡码位一致，发布后替换真实太阳码：见 miniprogram/README.md
export const VERIFICATION_CARD_CODE_SLOT = { x: 265, y: 438, size: 56 }

// 验课卡不绑定单一宫位，用一套中性的墨绿色调
export const VERIFICATION_CARD_TONE = {
  glow: 'rgba(243, 219, 154, 0.24)',
  gradientFrom: 'rgba(58, 72, 66, 0.94)',
  gradientTo: 'rgba(22, 28, 26, 0.96)',
  border: 'rgba(209, 221, 176, 0.42)',
}

const SETTLED_STATUSES = ['fulfilled', 'unfulfilled']

function pad(value) {
  return `${value}`.padStart(2, '0')
}

function formatCardDate(createdAt = '') {
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const beijingDate = new Date(date.getTime() + 8 * 60 * 60 * 1000)
  return [
    beijingDate.getUTCFullYear(),
    pad(beijingDate.getUTCMonth() + 1),
    pad(beijingDate.getUTCDate()),
  ].join('.')
}

export function formatVerificationRange(records) {
  const list = Array.isArray(records) ? records : []
  const settled = list.filter((record) => SETTLED_STATUSES.includes(record?.verification?.status))
  if (!settled.length) {
    return ''
  }

  // history 按新到旧存储：首元素最晚，末元素最早
  const latest = formatCardDate(settled[0]?.rule_result?.created_at || settled[0]?.created_at || '')
  const earliest = formatCardDate(
    settled[settled.length - 1]?.rule_result?.created_at || settled[settled.length - 1]?.created_at || '',
  )

  if (!earliest || !latest || earliest === latest) {
    return latest || earliest
  }

  return `${earliest} — ${latest}`
}

export function buildVerificationCardModel(records) {
  const summary = summarizeVerifications(records)
  if (!summary.settled) {
    return null
  }

  return {
    brand: '问道',
    title: '验课',
    rateText: `${summary.rate}%`,
    rateCaption: '应验率',
    statLines: [
      `已验 ${summary.settled} 课`,
      `应验 ${summary.fulfilled} · 未应验 ${summary.unfulfilled}`,
    ],
    rangeText: formatVerificationRange(records),
    disclaimer: '仅供传统文化体验与自我参考。',
    summary,
  }
}
```

- [ ] **Step 4: 跑测试确认通过**

```bash
node --test miniprogram/tests/verification-card-image.test.mjs
```

预期：6 个 PASS。注意 `2/3 = 66.67 → Math.round → 67`。

- [ ] **Step 5: 提交**

```bash
npm test
git add miniprogram/services/verification-card-image.core.js miniprogram/tests/verification-card-image.test.mjs
git commit -m "feat: add verification card image model"
```

---

### Task 5: 验课卡绘制与保存

**Files:**
- Modify: `miniprogram/pages/history/index.ts`
- Modify: `miniprogram/pages/history/index.wxml`
- Modify: `miniprogram/pages/history/index.wxss`
- Test: `miniprogram/tests/verification-flow.test.mjs`（追加）

**Interfaces:**
- Consumes: Task 4 的 `buildVerificationCardModel`、`VERIFICATION_CARD_TONE`、`VERIFICATION_CARD_CODE_SLOT`、`VERIFICATION_CARD_WIDTH`、`VERIFICATION_CARD_HEIGHT`、`VERIFICATION_CARD_BACKGROUND_IMAGE`
- Produces: 无（终端功能）

- [ ] **Step 1: 追加失败测试**

在 `miniprogram/tests/verification-flow.test.mjs` 末尾追加：

```js
test('问道录可导出验课卡并保存到相册', async () => {
  const historyMarkup = await readText('../pages/history/index.wxml')
  const historySource = await readText('../pages/history/index.ts')
  const historyStyles = await readText('../pages/history/index.wxss')

  assert.match(historyMarkup, /verificationCardCanvas/)
  assert.match(historyMarkup, /verify-card-button/)
  assert.match(historyMarkup, /保存验课卡/)
  assert.match(historyMarkup, /bindtap="handleSaveVerificationCard"/)
  assert.match(historyMarkup, /wx:if="\{\{summary\.settled\}\}"/)

  assert.match(historySource, /buildVerificationCardModel/)
  assert.match(historySource, /wx\.createCanvasContext/)
  assert.match(historySource, /wx\.canvasToTempFilePath/)
  assert.match(historySource, /wx\.saveImageToPhotosAlbum/)
  assert.match(historySource, /track\('save_verification_card'/)
  assert.match(historySource, /isBuildingCard/)

  assert.match(historyStyles, /\.verification-card-canvas\s*{[\s\S]*position: fixed;/)
  assert.match(historyStyles, /\.verify-card-button/)
})

test('验课卡不写入任何此念原文', async () => {
  const cardSource = await readText('../services/verification-card-image.core.js')
  const historySource = await readText('../pages/history/index.ts')

  assert.doesNotMatch(cardSource, /thought_note/)
  assert.doesNotMatch(historySource, /drawVerificationCard[\s\S]*thought_note/)
})
```

- [ ] **Step 2: 跑测试确认失败**

```bash
node --test miniprogram/tests/verification-flow.test.mjs
```

预期：新增两个测试 FAIL，第一个报 `verificationCardCanvas` 不匹配。

- [ ] **Step 3: 实现绘制与保存**

修改 `miniprogram/pages/history/index.ts`。在 import 区追加（底色走渐变绘制，与结果卡一致，因此**不导入** `VERIFICATION_CARD_BACKGROUND_IMAGE`）：

```ts
import {
  buildVerificationCardModel,
  VERIFICATION_CARD_CODE_SLOT,
  VERIFICATION_CARD_HEIGHT,
  VERIFICATION_CARD_TONE,
  VERIFICATION_CARD_WIDTH,
} from '../../services/verification-card-image.core'
```

在文件顶部常量区（`SWIPE_CLOSE_THRESHOLD` 之后）追加：

```ts
const VERIFICATION_CARD_CANVAS_ID = 'verificationCardCanvas'
```

在 `data` 中加入：

```ts
    isBuildingCard: false,
```

在 `Page` 内新增三个方法（放在 `handleClearAllRecords` 之前）：

```ts
  drawVerificationCard(ctx, model) {
    const background = ctx.createLinearGradient(0, 0, 0, VERIFICATION_CARD_HEIGHT)
    background.addColorStop(0, VERIFICATION_CARD_TONE.gradientFrom)
    background.addColorStop(1, VERIFICATION_CARD_TONE.gradientTo)
    ctx.setFillStyle(background)
    ctx.fillRect(0, 0, VERIFICATION_CARD_WIDTH, VERIFICATION_CARD_HEIGHT)

    const glow = ctx.createCircularGradient(
      VERIFICATION_CARD_WIDTH / 2,
      VERIFICATION_CARD_HEIGHT * 0.4,
      VERIFICATION_CARD_WIDTH * 0.55,
    )
    glow.addColorStop(0, VERIFICATION_CARD_TONE.glow)
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.setFillStyle(glow)
    ctx.fillRect(0, 0, VERIFICATION_CARD_WIDTH, VERIFICATION_CARD_HEIGHT)

    ctx.setStrokeStyle(VERIFICATION_CARD_TONE.border)
    ctx.setLineWidth(1)
    ctx.strokeRect(28, 34, VERIFICATION_CARD_WIDTH - 56, VERIFICATION_CARD_HEIGHT - 68)
    ctx.setStrokeStyle('rgba(255, 246, 216, 0.14)')
    ctx.strokeRect(38, 44, VERIFICATION_CARD_WIDTH - 76, VERIFICATION_CARD_HEIGHT - 88)

    ctx.setFillStyle('rgba(255, 246, 216, 0.92)')
    ctx.setFontSize(20)
    ctx.fillText(model.brand, 48, 72)

    ctx.setFillStyle('rgba(255, 246, 216, 0.66)')
    ctx.setFontSize(15)
    ctx.fillText(model.title, 48, 106)

    ctx.setTextAlign('center')
    ctx.setFillStyle('#fff6d8')
    ctx.setFontSize(96)
    ctx.fillText(model.rateText, VERIFICATION_CARD_WIDTH / 2, 268)

    ctx.setFillStyle('rgba(255, 246, 216, 0.66)')
    ctx.setFontSize(16)
    ctx.fillText(model.rateCaption, VERIFICATION_CARD_WIDTH / 2, 302)

    ctx.setFillStyle('rgba(255, 246, 216, 0.85)')
    ctx.setFontSize(16)
    model.statLines.forEach((line, index) => {
      ctx.fillText(line, VERIFICATION_CARD_WIDTH / 2, 356 + index * 30)
    })

    ctx.setFillStyle('rgba(255, 246, 216, 0.5)')
    ctx.setFontSize(13)
    ctx.fillText(model.rangeText, VERIFICATION_CARD_WIDTH / 2, 424)

    ctx.setFillStyle('rgba(255, 246, 216, 0.4)')
    ctx.setFontSize(11)
    ctx.fillText(model.disclaimer, VERIFICATION_CARD_WIDTH / 2, 548)
    ctx.setTextAlign('left')

    ctx.setStrokeStyle('rgba(255, 246, 216, 0.32)')
    ctx.setLineWidth(1)
    ctx.strokeRect(
      VERIFICATION_CARD_CODE_SLOT.x,
      VERIFICATION_CARD_CODE_SLOT.y,
      VERIFICATION_CARD_CODE_SLOT.size,
      VERIFICATION_CARD_CODE_SLOT.size,
    )
    ctx.setFillStyle('rgba(255, 246, 216, 0.5)')
    ctx.setFontSize(13)
    ctx.fillText('问', VERIFICATION_CARD_CODE_SLOT.x + 21, VERIFICATION_CARD_CODE_SLOT.y + 24)
    ctx.fillText('道', VERIFICATION_CARD_CODE_SLOT.x + 21, VERIFICATION_CARD_CODE_SLOT.y + 42)
  },

  buildVerificationCardImage() {
    const model = buildVerificationCardModel(getHistoryRecords())
    if (!model) {
      return Promise.reject(new Error('No settled verification'))
    }

    const ctx = wx.createCanvasContext(VERIFICATION_CARD_CANVAS_ID, this)
    this.drawVerificationCard(ctx, model)

    return new Promise((resolve, reject) => {
      ctx.draw(false, () => {
        wx.canvasToTempFilePath(
          {
            canvasId: VERIFICATION_CARD_CANVAS_ID,
            width: VERIFICATION_CARD_WIDTH,
            height: VERIFICATION_CARD_HEIGHT,
            destWidth: VERIFICATION_CARD_WIDTH * 2,
            destHeight: VERIFICATION_CARD_HEIGHT * 2,
            fileType: 'jpg',
            quality: 0.92,
            success: (res) => resolve(res.tempFilePath),
            fail: reject,
          },
          this,
        )
      })
    })
  },

  async handleSaveVerificationCard() {
    if (this.data.isBuildingCard || !this.data.summary.settled) {
      return
    }

    this.setData({ isBuildingCard: true })

    try {
      const imagePath = await this.buildVerificationCardImage()
      wx.saveImageToPhotosAlbum({
        filePath: imagePath,
        success: () => {
          track('save_verification_card', {
            settled: this.data.summary.settled,
            rate: this.data.summary.rate,
          })
          wx.showToast({ title: '已保存到相册', icon: 'success' })
        },
        fail: () => {
          wx.showToast({ title: '保存失败', icon: 'none' })
        },
        complete: () => {
          this.setData({ isBuildingCard: false })
        },
      })
    } catch (error) {
      console.error('Build verification card failed:', error)
      this.setData({ isBuildingCard: false })
      wx.showToast({ title: '生成失败', icon: 'none' })
    }
  },
```

- [ ] **Step 4: 实现标记与画布**

修改 `miniprogram/pages/history/index.wxml`。在 `clear-all-button` 之前插入按钮：

```html
  <view
    class="verify-card-button"
    wx:if="{{summary.settled}}"
    bindtap="handleSaveVerificationCard"
  >保存验课卡</view>
```

在文件最后一行 `</view>` 之前插入离屏画布：

```html
  <canvas class="verification-card-canvas" canvas-id="verificationCardCanvas"></canvas>
```

- [ ] **Step 5: 实现样式**

修改 `miniprogram/pages/history/index.wxss`，在 `@media (prefers-color-scheme: dark)` 块之前追加：

```css
.verification-card-canvas {
  position: fixed;
  top: -9999px;
  left: -9999px;
  width: 375px;
  height: 560px;
}

.verify-card-button {
  margin: 32rpx auto 16rpx;
  padding: 20rpx 0;
  width: 320rpx;
  color: #4a3d24;
  border: 1rpx solid rgba(122, 96, 54, 0.36);
  border-radius: 999rpx;
  font-size: 27rpx;
  text-align: center;
}
```

在既有 `@media (prefers-color-scheme: dark)` 块内部追加：

```css
  .verify-card-button {
    color: #e8dec6;
    border-color: rgba(214, 199, 160, 0.3);
  }
```

- [ ] **Step 6: 跑全量测试与类型检查**

```bash
npm test
npx --yes -p typescript@5 tsc --noEmit -p miniprogram/tsconfig.json
```

预期：全绿（88 原有 + 13 + 4 + 1 + 6 + 2 = 114）；tsc 无输出。若 tsc 报 `createCircularGradient` 或 `createLinearGradient` 缺失，检查 `miniprogram/types/index.d.ts` 的 `CanvasContextLike`——这两个方法已声明，无需改动。

- [ ] **Step 7: DevTools 真机自测**

在微信开发者工具中打开仓库根目录，验证：

1. 清空 storage，起一课并写「此念」。
2. 用 DevTools 的 Storage 面板把该记录的 `rule_result.created_at` 改成 4 天前的 ISO 时间。
3. 回到首页 → 应浮出验课卡，显示此念原文与当时宫位。
4. 点「尚未分晓」→ 卡片消失；把 created_at 再改成 8 天前 → 重新进首页应再次浮出。
5. 点「应验」→ 进问道录，该条应显示「应验」标签，顶部显示应验率。
6. 点「保存验课卡」→ 相册中应得到一张 750×1120 的卡片。
7. 切换系统深浅色，确认首页验课卡与问道录标签两套配色都可读。

- [ ] **Step 8: 提交**

```bash
git add miniprogram/pages/history miniprogram/tests/verification-flow.test.mjs
git commit -m "feat: export verification rate card from history"
```

---

## 完成标准

- `npm test` 全绿，总数从 88 升至 114。
- `npx --yes -p typescript@5 tsc --noEmit -p miniprogram/tsconfig.json` 无输出。
- 无新增运行时依赖，无新增图片资源（复用 `result-card-bg.png` 的色调方案，`assets.test.mjs` 体积预算不受影响）。
- 旧记录（无 `verification` 字段、无 `thought_note`）不会触发任何弹窗。
