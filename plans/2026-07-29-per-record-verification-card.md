# 单条验课卡 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让「问道记录」里每一条已应验的记录都能单独导出一张验课卡，卡面与该课当初的结果卡背面一致，额外盖一枚朱砂验课印和应验日期。

**Architecture:** 新增纯逻辑模块 `services/verification-record-card.core.js`，复用 `result-card-image.core.js` 已导出的 model builder 与常量来保证「与结果卡一致」；绘制函数只接收 `ctx`，不碰 `wx.*`，因此可用 stub ctx 做单元测试。`pages/history/index.ts` 只负责接线（创建 canvas context、导出临时文件、存相册）。不改动 `pages/result/index.ts`。

**Tech Stack:** WeChat Mini Program（旧版 `wx.createCanvasContext` API）、ES modules、`node:test` + `node:assert/strict`，无运行时 npm 依赖。

## Global Constraints

- 所有可测逻辑放在 `.core.js` ES module，**绝不在 `.core.js` 里调用 `wx.*`**；`.ts` 页面负责注入 WeChat API。
- **此念笔记（`thought_note`）绝不进入分享/导出路径。** 新模块源码中不得出现字符串 `thought_note`（有测试守着）。
- 小程序**零运行时 npm 依赖**，不得引入任何新的 package。
- 不修改 `miniprogram/pages/result/` 下任何文件。
- 卡片画布尺寸固定 `375 × 560`，与结果卡、汇总验课卡一致。
- 导出图片参数与现有卡片保持一致：`destWidth/destHeight` 为逻辑尺寸的 2 倍，`fileType: 'jpg'`，`quality: 0.92`。
- 测试是对源码文本的契约：改 UI 文案、class 名、CSS 数值必须同步改断言。
- 全量测试命令（仓库根目录执行）：`npm test`
- 单文件测试命令（仓库根目录执行）：`node --test miniprogram/tests/<name>.test.mjs`
- 类型检查（仓库根目录执行）：`npx --yes -p typescript@5 tsc --noEmit -p miniprogram/tsconfig.json`（必须 pin `@5`）
- 提交信息格式：`<type>: <description>`，type ∈ feat/fix/refactor/docs/test/chore/perf/ci。

---

## File Structure

| 文件 | 责任 |
|---|---|
| `miniprogram/services/verification-record-card.core.js`（新建，~150 行） | 单条验课卡的资格判定、日期格式化、model 构造、canvas 绘制。纯函数，无 `wx.*`。 |
| `miniprogram/tests/verification-record-card.test.mjs`（新建） | 上述模块的单元测试，含 stub ctx 绘制断言。 |
| `miniprogram/pages/history/index.ts`（修改，323 → ~400 行） | 接线：`canExportCard` 展示字段、`saveRecordCard` 导出流程、应验后追问弹窗。 |
| `miniprogram/pages/history/index.wxml`（修改） | 左滑「存卡」按钮；底部汇总按钮改名。 |
| `miniprogram/pages/history/index.wxss`（修改） | `.card-action` 样式 + 双按钮行位移 + 深色模式。 |
| `miniprogram/tests/navigation-flow.test.mjs`（修改） | 补双按钮位移断言。 |
| `miniprogram/tests/verification-flow.test.mjs`（修改） | 新增单条导出契约断言、扩展隐私断言、改汇总按钮文案断言。 |

**已知取舍：** 背景/chrome/背面的绘制代码会成为第三份拷贝（结果页、汇总验课卡、单条验课卡）。已通过 import `result-card-image.core.js` 的常量与 model builder 把重复压缩到「仅 ctx 调用序列」。这是 spec 中用户明确接受的取舍，本计划不做跨文件重构。

---

## Task 1: 验课卡资格判定与应验日期格式化

**Files:**
- Create: `miniprogram/services/verification-record-card.core.js`
- Create: `miniprogram/tests/verification-record-card.test.mjs`

**Interfaces:**
- Consumes: `getRecordVerificationStatus(record)` from `miniprogram/domain/verification/verification.core.js`，对无效/缺失状态返回 `''`。
- Produces:
  - `canExportVerificationCard(record) → boolean`
  - `formatVerifiedAtText(record) → string`（形如 `'07.29 应验'`，无法解析时为 `''`）
  - `VERIFICATION_RECORD_CARD_WIDTH = 375`、`VERIFICATION_RECORD_CARD_HEIGHT = 560`

- [ ] **Step 1: 写失败的测试**

创建 `miniprogram/tests/verification-record-card.test.mjs`：

```js
import test from 'node:test'
import assert from 'node:assert/strict'

import {
  canExportVerificationCard,
  formatVerifiedAtText,
  VERIFICATION_RECORD_CARD_HEIGHT,
  VERIFICATION_RECORD_CARD_WIDTH,
} from '../services/verification-record-card.core.js'

const CREATED_AT = '2026-07-26T06:30:00.000Z'

const makeRecord = (status, updatedAt) => ({
  id: 'r1',
  thought_note: '此事可否推进',
  created_at: CREATED_AT,
  question_type: 'general',
  rule_result: {
    symbol: '大安',
    grade: '上吉',
    created_at: CREATED_AT,
    input_snapshot: {
      lunar_month: 6,
      lunar_day: 12,
      is_leap_month: false,
      hour_branch: '未',
    },
  },
  interpretation: {
    oracleText: '心安则事顺，静待其成',
    actionHint: '今日宜守，不宜强求',
    disclaimer: '仅供传统文化体验与自我参考。',
  },
  verification: status ? { status, updated_at: updatedAt } : undefined,
})

test('单条验课卡沿用结果卡的画布尺寸', () => {
  assert.equal(VERIFICATION_RECORD_CARD_WIDTH, 375)
  assert.equal(VERIFICATION_RECORD_CARD_HEIGHT, 560)
})

test('只有应验的记录能导出单条验课卡', () => {
  assert.equal(canExportVerificationCard(makeRecord('fulfilled', '2026-07-29T02:00:00.000Z')), true)
  assert.equal(canExportVerificationCard(makeRecord('unfulfilled', '2026-07-29T02:00:00.000Z')), false)
  assert.equal(canExportVerificationCard(makeRecord('deferred', '2026-07-29T02:00:00.000Z')), false)
  assert.equal(canExportVerificationCard(makeRecord('unclear', '2026-07-29T02:00:00.000Z')), false)
  assert.equal(canExportVerificationCard(makeRecord('')), false)
  assert.equal(canExportVerificationCard(null), false)
})

test('应验日期按东八区民用日历跨日', () => {
  // UTC 7/28 16:00 在东八区已是 7 月 29 日
  assert.equal(formatVerifiedAtText(makeRecord('fulfilled', '2026-07-28T16:00:00.000Z')), '07.29 应验')
  assert.equal(formatVerifiedAtText(makeRecord('fulfilled', '2026-07-28T15:59:00.000Z')), '07.28 应验')
})

test('应验时间缺失或损坏时不写日期', () => {
  assert.equal(formatVerifiedAtText(makeRecord('fulfilled', 'not-a-date')), '')
  assert.equal(formatVerifiedAtText(makeRecord('fulfilled', undefined)), '')
})
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `node --test miniprogram/tests/verification-record-card.test.mjs`
Expected: FAIL —— `Cannot find module .../services/verification-record-card.core.js`

- [ ] **Step 3: 写最小实现**

创建 `miniprogram/services/verification-record-card.core.js`：

```js
import { getRecordVerificationStatus } from '../domain/verification/verification.core.js'

export const VERIFICATION_RECORD_CARD_WIDTH = 375
export const VERIFICATION_RECORD_CARD_HEIGHT = 560

const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000

function pad(value) {
  return `${value}`.padStart(2, '0')
}

// 只有「应验」值得单独成卡：未应验／存疑／待验都不给导出入口
export function canExportVerificationCard(record) {
  return getRecordVerificationStatus(record) === 'fulfilled'
}

export function formatVerifiedAtText(record) {
  const updatedAt = record?.verification?.updated_at
  if (!updatedAt) {
    return ''
  }

  const instant = new Date(updatedAt)
  if (Number.isNaN(instant.getTime())) {
    return ''
  }

  const shanghai = new Date(instant.getTime() + SHANGHAI_OFFSET_MS)
  return `${pad(shanghai.getUTCMonth() + 1)}.${pad(shanghai.getUTCDate())} 应验`
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `node --test miniprogram/tests/verification-record-card.test.mjs`
Expected: PASS，4 个 test 全绿

- [ ] **Step 5: 提交**

```bash
git add miniprogram/services/verification-record-card.core.js miniprogram/tests/verification-record-card.test.mjs
git commit -m "feat: add per-record verification card eligibility"
```

---

## Task 2: 单条验课卡 model

**Files:**
- Modify: `miniprogram/services/verification-record-card.core.js`
- Modify: `miniprogram/tests/verification-record-card.test.mjs`

**Interfaces:**
- Consumes: `canExportVerificationCard` / `formatVerifiedAtText`（Task 1）；`buildResultCardImageModel(record)` from `miniprogram/services/result-card-image.core.js`，返回含 `toneStyle` / `symbol` / `symbolChars` / `grade` / `oracleText` / `actionHint` / `disclaimer` / `createdAtText` / `lunarTimeText` / `brand` / `methodName` / `miniProgramCodeUrl` 的对象。
- Produces: `buildVerificationRecordCardModel(record) → object | null`，在 `buildResultCardImageModel` 的结果上追加 `stampText: '验'` 与 `verifiedAtText`。

- [ ] **Step 1: 写失败的测试**

在 `miniprogram/tests/verification-record-card.test.mjs` 顶部 import 块追加：

```js
import { buildResultCardImageModel } from '../services/result-card-image.core.js'
```

并把 `verification-record-card.core.js` 的 import 扩为：

```js
import {
  buildVerificationRecordCardModel,
  canExportVerificationCard,
  formatVerifiedAtText,
  VERIFICATION_RECORD_CARD_HEIGHT,
  VERIFICATION_RECORD_CARD_WIDTH,
} from '../services/verification-record-card.core.js'
```

在文件末尾追加：

```js
test('单条验课卡的色调与内容与该课结果卡完全一致', () => {
  const record = makeRecord('fulfilled', '2026-07-28T16:00:00.000Z')
  const model = buildVerificationRecordCardModel(record)
  const resultModel = buildResultCardImageModel(record)

  assert.deepEqual(model.toneStyle, resultModel.toneStyle)
  assert.equal(model.symbol, resultModel.symbol)
  assert.deepEqual(model.symbolChars, resultModel.symbolChars)
  assert.equal(model.grade, resultModel.grade)
  assert.equal(model.oracleText, resultModel.oracleText)
  assert.equal(model.actionHint, resultModel.actionHint)
  assert.equal(model.createdAtText, resultModel.createdAtText)
  assert.equal(model.lunarTimeText, resultModel.lunarTimeText)
  assert.equal(model.disclaimer, resultModel.disclaimer)
})

test('单条验课卡在结果卡之上追加验课印与应验日期', () => {
  const model = buildVerificationRecordCardModel(makeRecord('fulfilled', '2026-07-28T16:00:00.000Z'))

  assert.equal(model.stampText, '验')
  assert.equal(model.verifiedAtText, '07.29 应验')
})

test('非应验的记录不产出单条验课卡 model', () => {
  assert.equal(buildVerificationRecordCardModel(makeRecord('unfulfilled', '2026-07-28T16:00:00.000Z')), null)
  assert.equal(buildVerificationRecordCardModel(makeRecord('deferred', '2026-07-28T16:00:00.000Z')), null)
  assert.equal(buildVerificationRecordCardModel(null), null)
})
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `node --test miniprogram/tests/verification-record-card.test.mjs`
Expected: FAIL —— `buildVerificationRecordCardModel is not a function`

- [ ] **Step 3: 写最小实现**

在 `miniprogram/services/verification-record-card.core.js` 顶部把 import 改为：

```js
import { getRecordVerificationStatus } from '../domain/verification/verification.core.js'
import { buildResultCardImageModel } from './result-card-image.core.js'
```

在文件末尾追加：

```js
// 直接摊开结果卡 model，卡面色调与内容天然与当初那张结果卡一致
export function buildVerificationRecordCardModel(record) {
  if (!canExportVerificationCard(record)) {
    return null
  }

  return {
    ...buildResultCardImageModel(record),
    stampText: '验',
    verifiedAtText: formatVerifiedAtText(record),
  }
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `node --test miniprogram/tests/verification-record-card.test.mjs`
Expected: PASS，7 个 test 全绿

- [ ] **Step 5: 提交**

```bash
git add miniprogram/services/verification-record-card.core.js miniprogram/tests/verification-record-card.test.mjs
git commit -m "feat: build per-record verification card model"
```

---

## Task 3: 单条验课卡绘制

**Files:**
- Modify: `miniprogram/services/verification-record-card.core.js`
- Modify: `miniprogram/tests/verification-record-card.test.mjs`

**Interfaces:**
- Consumes: `buildVerificationRecordCardModel`（Task 2）；`getVerticalSymbolLayout(symbolChars, options)`、`wrapPosterText(text, maxLength)`、`RESULT_CARD_CODE_SLOT`（`{ x: 265, y: 438, size: 56 }`）from `miniprogram/services/result-card-image.core.js`。
- Produces: `drawVerificationRecordCard(ctx, model) → void`；`VERIFICATION_STAMP = { x: 252, y: 196, size: 64, rotation: number }`。

绘制坐标全部沿用 `pages/result/index.ts` 背面版式，只新增两处：朱砂印在 `(252, 196)` 64×64 的留白区（档位大字止于 y≈194 且靠左，签语始于 y=276），应验日期在 `(48, 444)`（行动提示止于 y≈404，起念时间在 y=470）。

- [ ] **Step 1: 写失败的测试**

把 `verification-record-card.core.js` 的 import 扩为包含 `drawVerificationRecordCard` 与 `VERIFICATION_STAMP`：

```js
import {
  buildVerificationRecordCardModel,
  canExportVerificationCard,
  drawVerificationRecordCard,
  formatVerifiedAtText,
  VERIFICATION_RECORD_CARD_HEIGHT,
  VERIFICATION_RECORD_CARD_WIDTH,
  VERIFICATION_STAMP,
} from '../services/verification-record-card.core.js'
```

在文件末尾追加 stub ctx 与绘制测试：

```js
// 旧版 wx.createCanvasContext 的最小替身：只记录文字与形状，不做真实渲染
function createStubContext() {
  const calls = { texts: [], strokeRects: [], ops: [] }
  const gradient = { addColorStop() {} }

  return {
    calls,
    createLinearGradient: () => gradient,
    createCircularGradient: () => gradient,
    setFillStyle() {},
    setStrokeStyle() {},
    setLineWidth() {},
    setFontSize() {},
    setTextAlign() {},
    translate() {},
    rotate() {},
    drawImage() {},
    fillRect() {},
    save() { calls.ops.push('save') },
    restore() { calls.ops.push('restore') },
    strokeRect(x, y, width, height) { calls.strokeRects.push({ x, y, width, height }) },
    fillText(text, x, y) { calls.texts.push({ text, x, y }) },
  }
}

test('绘制单条验课卡时保留结果卡背面内容', () => {
  const model = buildVerificationRecordCardModel(makeRecord('fulfilled', '2026-07-28T16:00:00.000Z'))
  const ctx = createStubContext()

  drawVerificationRecordCard(ctx, model)

  const texts = ctx.calls.texts.map((item) => item.text)
  assert.ok(texts.includes('一念六壬'), '缺少品牌行')
  assert.ok(texts.includes('上吉'), '缺少档位')
  assert.ok(texts.includes('心安则事顺，静待其成'), '缺少签语')
  assert.ok(texts.includes('今日宜守，不宜强求'), '缺少行动提示')
  assert.ok(texts.includes('仅供传统文化体验与自我参考。'), '缺少免责声明')
})

test('绘制单条验课卡时盖上验课印与应验日期', () => {
  const model = buildVerificationRecordCardModel(makeRecord('fulfilled', '2026-07-28T16:00:00.000Z'))
  const ctx = createStubContext()

  drawVerificationRecordCard(ctx, model)

  const texts = ctx.calls.texts.map((item) => item.text)
  assert.ok(texts.includes('验'), '缺少验课印')

  const verifiedAt = ctx.calls.texts.find((item) => item.text === '07.29 应验')
  assert.ok(verifiedAt, '缺少应验日期')
  assert.equal(verifiedAt.x, 48)
  assert.equal(verifiedAt.y, 444)
})

test('验课印的旋转被 save/restore 包住，不污染后续绘制', () => {
  const model = buildVerificationRecordCardModel(makeRecord('fulfilled', '2026-07-28T16:00:00.000Z'))
  const ctx = createStubContext()

  drawVerificationRecordCard(ctx, model)

  assert.deepEqual(ctx.calls.ops, ['save', 'restore'])
})

test('验课印落在背面留白区，不压住签语与码位', () => {
  assert.equal(VERIFICATION_STAMP.x, 252)
  assert.equal(VERIFICATION_STAMP.y, 196)
  assert.equal(VERIFICATION_STAMP.size, 64)
  // 印底 260 < 签语首行 276；印右 316 < 码位左边 265+56=321 不重叠靠上
  assert.ok(VERIFICATION_STAMP.y + VERIFICATION_STAMP.size < 276)
})
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `node --test miniprogram/tests/verification-record-card.test.mjs`
Expected: FAIL —— `drawVerificationRecordCard is not a function`

- [ ] **Step 3: 写最小实现**

把 `miniprogram/services/verification-record-card.core.js` 的 import 改为：

```js
import { getRecordVerificationStatus } from '../domain/verification/verification.core.js'
import {
  buildResultCardImageModel,
  getVerticalSymbolLayout,
  RESULT_CARD_CODE_SLOT,
  wrapPosterText,
} from './result-card-image.core.js'
```

在文件末尾追加（背景／chrome／背面三段与 `pages/result/index.ts` 的 `drawCardBackground` / `drawCardChrome` / `drawBackFace` 逐像素一致）：

```js
export const VERIFICATION_STAMP = {
  x: 252,
  y: 196,
  size: 64,
  rotation: (-8 * Math.PI) / 180,
}

const STAMP_COLOR = 'rgba(196, 62, 44, 0.82)'

function drawCardBackground(ctx, toneStyle) {
  const background = ctx.createLinearGradient(
    0,
    0,
    VERIFICATION_RECORD_CARD_WIDTH * 0.6,
    VERIFICATION_RECORD_CARD_HEIGHT * 0.85,
  )
  background.addColorStop(0, toneStyle.gradientFrom)
  background.addColorStop(1, toneStyle.gradientTo)
  ctx.setFillStyle(background)
  ctx.fillRect(0, 0, VERIFICATION_RECORD_CARD_WIDTH, VERIFICATION_RECORD_CARD_HEIGHT)

  const glow = ctx.createCircularGradient(
    VERIFICATION_RECORD_CARD_WIDTH / 2,
    VERIFICATION_RECORD_CARD_HEIGHT * 0.43,
    VERIFICATION_RECORD_CARD_WIDTH * 0.55,
  )
  glow.addColorStop(0, toneStyle.glow)
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.setFillStyle(glow)
  ctx.fillRect(0, 0, VERIFICATION_RECORD_CARD_WIDTH, VERIFICATION_RECORD_CARD_HEIGHT)

  ctx.setStrokeStyle(toneStyle.border)
  ctx.setLineWidth(1)
  ctx.strokeRect(28, 34, VERIFICATION_RECORD_CARD_WIDTH - 56, VERIFICATION_RECORD_CARD_HEIGHT - 68)

  ctx.setStrokeStyle('rgba(255, 246, 216, 0.14)')
  ctx.strokeRect(38, 44, VERIFICATION_RECORD_CARD_WIDTH - 76, VERIFICATION_RECORD_CARD_HEIGHT - 88)
}

function drawCardChrome(ctx, model) {
  ctx.setFillStyle('rgba(255, 246, 216, 0.92)')
  ctx.setFontSize(20)
  ctx.fillText(model.brand, 48, 72)

  ctx.setFillStyle('rgba(255, 246, 216, 0.66)')
  ctx.setFontSize(15)
  ctx.fillText(`${model.methodName} · ${model.symbol}`, 48, 106)

  ctx.setStrokeStyle('rgba(214, 99, 82, 0.8)')
  ctx.strokeRect(286, 56, 42, 42)
  ctx.setFillStyle('rgba(224, 122, 102, 0.95)')
  ctx.setFontSize(14)
  ctx.fillText('问', 293, 74)
  ctx.fillText('道', 293, 94)

  if (model.miniProgramCodeUrl) {
    ctx.drawImage(
      model.miniProgramCodeUrl,
      RESULT_CARD_CODE_SLOT.x,
      RESULT_CARD_CODE_SLOT.y,
      RESULT_CARD_CODE_SLOT.size,
      RESULT_CARD_CODE_SLOT.size,
    )
  } else {
    ctx.setStrokeStyle('rgba(255, 246, 216, 0.32)')
    ctx.setLineWidth(1)
    ctx.strokeRect(
      RESULT_CARD_CODE_SLOT.x,
      RESULT_CARD_CODE_SLOT.y,
      RESULT_CARD_CODE_SLOT.size,
      RESULT_CARD_CODE_SLOT.size,
    )
    ctx.setFillStyle('rgba(255, 246, 216, 0.5)')
    ctx.setFontSize(13)
    ctx.fillText('问', RESULT_CARD_CODE_SLOT.x + 21, RESULT_CARD_CODE_SLOT.y + 24)
    ctx.fillText('道', RESULT_CARD_CODE_SLOT.x + 21, RESULT_CARD_CODE_SLOT.y + 42)
  }

  ctx.setFillStyle('rgba(255, 246, 216, 0.4)')
  ctx.setFontSize(11)
  ctx.setTextAlign('center')
  ctx.fillText(model.disclaimer, VERIFICATION_RECORD_CARD_WIDTH / 2, 548)
  ctx.setTextAlign('left')
}

function drawBackFace(ctx, model) {
  ctx.setFillStyle('#fff6d8')
  ctx.setFontSize(76)
  ctx.fillText(model.grade, 48, 194)

  ctx.setFillStyle('rgba(243, 219, 154, 0.92)')
  ctx.setFontSize(30)
  getVerticalSymbolLayout(model.symbolChars, {
    centerY: 184,
    fontSize: 30,
    gap: 18,
  }).forEach((item) => {
    ctx.fillText(item.char, 136, item.y)
  })

  ctx.setFillStyle('rgba(255, 246, 216, 0.85)')
  ctx.setFontSize(15)
  wrapPosterText(model.oracleText, 16).slice(0, 3).forEach((line, index) => {
    ctx.fillText(line, 48, 276 + index * 26)
  })

  ctx.setFillStyle('rgba(255, 246, 216, 0.62)')
  ctx.setFontSize(14)
  wrapPosterText(model.actionHint, 18).slice(0, 3).forEach((line, index) => {
    ctx.fillText(line, 48, 356 + index * 24)
  })

  ctx.setFillStyle('rgba(255, 246, 216, 0.55)')
  ctx.setFontSize(13)
  ctx.fillText(model.createdAtText, 48, 470)

  ctx.setFillStyle('rgba(255, 246, 216, 0.6)')
  ctx.setFontSize(14)
  ctx.fillText(model.lunarTimeText, 48, 496)
}

function drawVerifiedStamp(ctx, model) {
  const { x, y, size, rotation } = VERIFICATION_STAMP

  // 旋转必须被 save/restore 包住，否则会污染其后所有绘制
  ctx.save()
  ctx.translate(x + size / 2, y + size / 2)
  ctx.rotate(rotation)
  ctx.setStrokeStyle(STAMP_COLOR)
  ctx.setLineWidth(2)
  ctx.strokeRect(-size / 2, -size / 2, size, size)
  ctx.setFillStyle(STAMP_COLOR)
  ctx.setFontSize(38)
  ctx.setTextAlign('center')
  ctx.fillText(model.stampText, 0, 14)
  ctx.setTextAlign('left')
  ctx.restore()

  ctx.setFillStyle('rgba(196, 62, 44, 0.78)')
  ctx.setFontSize(13)
  ctx.fillText(model.verifiedAtText, 48, 444)
}

export function drawVerificationRecordCard(ctx, model) {
  drawCardBackground(ctx, model.toneStyle)
  drawCardChrome(ctx, model)
  drawBackFace(ctx, model)
  drawVerifiedStamp(ctx, model)
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `node --test miniprogram/tests/verification-record-card.test.mjs`
Expected: PASS，11 个 test 全绿

- [ ] **Step 5: 跑全量测试确认无回归**

Run: `npm test`
Expected: 全绿（本任务未改动任何既有文件）

- [ ] **Step 6: 提交**

```bash
git add miniprogram/services/verification-record-card.core.js miniprogram/tests/verification-record-card.test.mjs
git commit -m "feat: draw per-record verification card with seal"
```

---

## Task 4: 左滑「存卡」入口

**Files:**
- Modify: `miniprogram/pages/history/index.wxml`
- Modify: `miniprogram/pages/history/index.wxss:33-35`（`.history-swipe-row.open .history-card-track`）与 `:141-145`（深色模式 `.delete-action`）
- Modify: `miniprogram/pages/history/index.ts:36-42`（`buildDisplayRecords`）、`:26`（常量区）、`:1-21`（import 区）
- Test: `miniprogram/tests/verification-flow.test.mjs`、`miniprogram/tests/navigation-flow.test.mjs`

**Interfaces:**
- Consumes: `canExportVerificationCard`、`buildVerificationRecordCardModel`、`drawVerificationRecordCard`、`VERIFICATION_RECORD_CARD_WIDTH`、`VERIFICATION_RECORD_CARD_HEIGHT`（Task 1–3）；页面已有的 `getHistoryRecords()`、`track()`、`VERIFICATION_CARD_CANVAS_ID = 'verificationCardCanvas'`、`this.data.isBuildingCard`。
- Produces: 页面方法 `saveRecordCard(recordId)`（Task 5 会复用）、`handleSaveRecordCard(event)`、`buildRecordCardImage(record)`；展示字段 `canExportCard`。

- [ ] **Step 1: 写失败的测试**

在 `miniprogram/tests/verification-flow.test.mjs` 末尾追加：

```js
test('应验的记录可从问道录单独导出验课卡', async () => {
  const historyMarkup = await readText('../pages/history/index.wxml')
  const historySource = await readText('../pages/history/index.ts')
  const historyStyles = await readText('../pages/history/index.wxss')

  assert.match(historyMarkup, /class="card-action"/)
  assert.match(historyMarkup, /wx:if="\{\{item\.canExportCard\}\}"/)
  assert.match(historyMarkup, /catchtap="handleSaveRecordCard"/)
  assert.match(historyMarkup, /存卡/)

  assert.match(historySource, /canExportVerificationCard/)
  assert.match(historySource, /buildVerificationRecordCardModel/)
  assert.match(historySource, /drawVerificationRecordCard/)
  assert.match(historySource, /track\('save_verification_record_card'/)
  assert.match(historySource, /此课尚未应验/)

  assert.match(historyStyles, /\.card-action/)
})
```

把 `miniprogram/tests/verification-flow.test.mjs` 中 `test('验课卡不写入任何此念原文', ...)` 整体替换为：

```js
test('验课卡不写入任何此念原文', async () => {
  const cardSource = await readText('../services/verification-card-image.core.js')
  const recordCardSource = await readText('../services/verification-record-card.core.js')
  const historySource = await readText('../pages/history/index.ts')

  assert.doesNotMatch(cardSource, /thought_note/)
  assert.doesNotMatch(recordCardSource, /thought_note/)
  assert.doesNotMatch(historySource, /drawVerificationCard[\s\S]*thought_note/)
})
```

在 `miniprogram/tests/navigation-flow.test.mjs:104` 的 `assert.match(historyStyles, /translateX\(-154rpx\)/)` 之后插入一行：

```js
  assert.match(
    historyStyles,
    /\.history-swipe-row\.open\.has-card-action\s+\.history-card-track\s*\{[\s\S]*?translateX\(-308rpx\)/,
  )
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `node --test miniprogram/tests/verification-flow.test.mjs miniprogram/tests/navigation-flow.test.mjs`
Expected: FAIL —— 新断言全部 miss（`card-action` / `-308rpx` / `verification-record-card.core.js` 读不到也会抛 ENOENT，若 Task 1–3 已完成则只是断言 miss）

- [ ] **Step 3: 改 WXML**

`miniprogram/pages/history/index.wxml` 的 `wx:for` 外层 `<view>` 的 class 改为带 `has-card-action`：

```html
  <view
    wx:for="{{records}}"
    wx:key="id"
    class="history-swipe-row {{openedRecordId == item.id ? 'open' : ''}} {{item.canExportCard ? 'has-card-action' : ''}}"
    data-id="{{item.id}}"
    bindtouchstart="handleTouchStart"
    bindtouchend="handleTouchEnd"
  >
    <view
      class="card-action"
      wx:if="{{item.canExportCard}}"
      data-id="{{item.id}}"
      catchtap="handleSaveRecordCard"
    >存卡</view>
    <view class="delete-action" data-id="{{item.id}}" catchtap="handleDeleteRecord">删除</view>
```

（其余行不动。）

- [ ] **Step 4: 改 WXSS**

在 `miniprogram/pages/history/index.wxss` 的 `.history-swipe-row.open .history-card-track { ... }` 规则之后插入：

```css
/* 应验行左滑露出两个按钮，位移随之加倍 */
.history-swipe-row.open.has-card-action .history-card-track {
  transform: translateX(-308rpx);
}

.card-action {
  position: absolute;
  top: 0;
  right: 154rpx;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 154rpx;
  color: rgba(122, 96, 54, 0.9);
  background: rgba(122, 96, 54, 0.08);
  border-left: 1rpx solid rgba(122, 96, 54, 0.2);
  font-size: 28rpx;
  font-weight: 600;
  z-index: 1;
}
```

在深色模式块内、`.delete-action { ... }` 规则之后插入：

```css
  .card-action {
    color: rgba(232, 222, 198, 0.78);
    background: rgba(15, 17, 15, 0.42);
    border-left-color: rgba(216, 174, 103, 0.16);
  }
```

- [ ] **Step 5: 改页面控制器**

`miniprogram/pages/history/index.ts` 的 import 区追加：

```ts
import {
  buildVerificationRecordCardModel,
  canExportVerificationCard,
  drawVerificationRecordCard,
  VERIFICATION_RECORD_CARD_HEIGHT,
  VERIFICATION_RECORD_CARD_WIDTH,
} from '../../services/verification-record-card.core'
```

`buildDisplayRecords` 改为：

```ts
function buildDisplayRecords(records) {
  return records.map((record) => ({
    ...record,
    createdAtText: formatHistoryCreatedAt(record?.rule_result?.created_at || record?.created_at || ''),
    verificationText: getVerificationLabel(record),
    canExportCard: canExportVerificationCard(record),
  }))
}
```

在 `handleClearAllRecords` 之前插入三个方法：

```ts
  buildRecordCardImage(record) {
    const model = buildVerificationRecordCardModel(record)
    if (!model) {
      return Promise.reject(new Error('Record is not fulfilled'))
    }

    const ctx = wx.createCanvasContext(VERIFICATION_CARD_CANVAS_ID, this)
    drawVerificationRecordCard(ctx, model)

    return new Promise((resolve, reject) => {
      ctx.draw(false, () => {
        wx.canvasToTempFilePath(
          {
            canvasId: VERIFICATION_CARD_CANVAS_ID,
            width: VERIFICATION_RECORD_CARD_WIDTH,
            height: VERIFICATION_RECORD_CARD_HEIGHT,
            destWidth: VERIFICATION_RECORD_CARD_WIDTH * 2,
            destHeight: VERIFICATION_RECORD_CARD_HEIGHT * 2,
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

  async saveRecordCard(recordId) {
    if (!recordId || this.data.isBuildingCard) {
      return
    }

    const record = getHistoryRecords().find((item) => item.id === recordId)
    if (!record || !canExportVerificationCard(record)) {
      wx.showToast({ title: '此课尚未应验', icon: 'none' })
      return
    }

    this.setData({ isBuildingCard: true, openedRecordId: '' })

    try {
      const imagePath = await this.buildRecordCardImage(record)
      wx.saveImageToPhotosAlbum({
        filePath: imagePath,
        success: () => {
          track('save_verification_record_card', { symbol: record?.rule_result?.symbol })
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
      console.error('Build verification record card failed:', error)
      this.setData({ isBuildingCard: false })
      wx.showToast({ title: '生成失败', icon: 'none' })
    }
  },

  handleSaveRecordCard(event) {
    this.saveRecordCard(event.currentTarget?.dataset?.id)
  },
```

- [ ] **Step 6: 运行测试，确认通过**

Run: `npm test`
Expected: 全绿

- [ ] **Step 7: 类型检查**

Run: `npx --yes -p typescript@5 tsc --noEmit -p miniprogram/tsconfig.json`
Expected: 无输出（无错误）。`miniprogram/tsconfig.json` 已开 `allowJs: true` 且 `strict: false`，`.core.js` 直接被解析，**不需要**为新模块补任何 `declare module`（`types/index.d.ts` 里也没有任何 `.core` 声明，新模块与既有模块一致）。

- [ ] **Step 8: 在 WeChat DevTools 里人工验一次**

打开仓库根目录 → 问道录 → 找一条应验记录 → 左滑 → 点「存卡」→ 确认相册里的图：宫位、签语、免责声明与结果卡一致，右上有朱砂「验」印，左下有「MM.DD 应验」，印章没有压住任何文字。

- [ ] **Step 9: 提交**

```bash
git add miniprogram/pages/history/ miniprogram/tests/verification-flow.test.mjs miniprogram/tests/navigation-flow.test.mjs
git commit -m "feat: export verification card per history record"
```

---

## Task 5: 标记应验后即时追问存卡

**Files:**
- Modify: `miniprogram/pages/history/index.ts:133-145`（`applyVerification`）
- Test: `miniprogram/tests/verification-flow.test.mjs`

**Interfaces:**
- Consumes: `saveRecordCard(recordId)`（Task 4）。
- Produces: 页面方法 `promptSaveRecordCard(recordId)`。

- [ ] **Step 1: 写失败的测试**

在 `miniprogram/tests/verification-flow.test.mjs` 末尾追加：

```js
test('标记应验后立刻追问是否存卡', async () => {
  const historySource = await readText('../pages/history/index.ts')

  assert.match(historySource, /promptSaveRecordCard/)
  assert.match(historySource, /已记下应验/)
  assert.match(historySource, /要存一张验课卡吗？/)
  assert.match(historySource, /confirmText: '存卡'/)
  assert.match(historySource, /cancelText: '不了'/)
  // 只有应验才追问，未应验／尚未分晓仍走原来的轻提示
  assert.match(historySource, /if \(status === 'fulfilled'\)/)
})
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `node --test miniprogram/tests/verification-flow.test.mjs`
Expected: FAIL —— `promptSaveRecordCard` 等断言 miss

- [ ] **Step 3: 写实现**

把 `miniprogram/pages/history/index.ts` 的 `applyVerification` 整体替换为：

```ts
  applyVerification(recordId, status) {
    const patch = buildVerificationPatch(status)
    const rawRecords = updateHistoryRecord(recordId, patch)
    syncLatestResultRecord(recordId, patch)

    this.setData({
      records: buildDisplayRecords(rawRecords),
      summary: summarizeVerifications(rawRecords),
      openedRecordId: '',
    })
    track('mark_verification', { status, source: 'history' })

    // 应验的那一刻分享欲最强，就地追问；其余状态维持轻提示
    if (status === 'fulfilled') {
      this.promptSaveRecordCard(recordId)
      return
    }

    wx.showToast({ title: '已更新', icon: 'none' })
  },

  promptSaveRecordCard(recordId) {
    wx.showModal({
      title: '已记下应验',
      content: '要存一张验课卡吗？',
      cancelText: '不了',
      confirmText: '存卡',
      success: (res) => {
        if (res.confirm) {
          this.saveRecordCard(recordId)
        }
      },
      fail: () => {},
    })
  },
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `npm test`
Expected: 全绿

- [ ] **Step 5: 在 WeChat DevTools 里人工验一次**

问道录 → 点一条有此念的记录 → 选「应验」→ 确认弹出「已记下应验／要存一张验课卡吗？」→ 点「存卡」直接落相册；点「不了」不再打扰。再选一条标「未应验」，确认仍是原来的「已更新」轻提示。

- [ ] **Step 6: 提交**

```bash
git add miniprogram/pages/history/index.ts miniprogram/tests/verification-flow.test.mjs
git commit -m "feat: prompt saving verification card right after marking fulfilled"
```

---

## Task 6: 汇总卡改名「保存应验总览」

单条卡拿走了「验课卡」这个词，底部汇总按钮需改名消歧义。

**Files:**
- Modify: `miniprogram/pages/history/index.wxml:30-34`
- Test: `miniprogram/tests/verification-flow.test.mjs:136`

**Interfaces:**
- Consumes: 无新增。
- Produces: 无新增。仅文案变更，`handleSaveVerificationCard`、`verify-card-button`、`track('save_verification_card')` 全部保持原名。

- [ ] **Step 1: 改测试断言**

把 `miniprogram/tests/verification-flow.test.mjs` 中 `test('问道录可导出验课卡并保存到相册', ...)` 内的这一行：

```js
  assert.match(historyMarkup, /保存验课卡/)
```

替换为：

```js
  assert.match(historyMarkup, /保存应验总览/)
  // 「验课卡」这个词已让给单条卡，汇总按钮不得再叫这个名字
  assert.doesNotMatch(historyMarkup, /保存验课卡/)
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `node --test miniprogram/tests/verification-flow.test.mjs`
Expected: FAIL —— `保存应验总览` 未出现在 wxml 中

- [ ] **Step 3: 改文案**

`miniprogram/pages/history/index.wxml`：

```html
  <view
    class="verify-card-button"
    wx:if="{{summary.settled}}"
    bindtap="handleSaveVerificationCard"
  >保存应验总览</view>
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `npm test`
Expected: 全绿

- [ ] **Step 5: 提交**

```bash
git add miniprogram/pages/history/index.wxml miniprogram/tests/verification-flow.test.mjs
git commit -m "refactor: rename aggregate card button to 保存应验总览"
```

---

## 收尾校验

- [ ] `npm test` 全绿
- [ ] `npx --yes -p typescript@5 tsc --noEmit -p miniprogram/tsconfig.json` 无错误
- [ ] `grep -rn "thought_note" miniprogram/services/verification-record-card.core.js` 无输出
- [ ] WeChat DevTools 中两条路径（标记后追问 / 左滑存卡）都能落图，且导出的图与结果卡同色同版式
