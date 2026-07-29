# 单条验课卡设计（2026-07-29）

## 背景

问道记录页现有的「保存验课卡」导出的是**汇总卡**：应验率、已验课数、日期区间，不绑定任何一条记录（`pages/history/index.ts` 的 `drawVerificationCard`）。

用户的真实分享时机不是起课当场，而是**事后应验的那一刻**。那时想发的是「我那天问的这一课，后来真应验了」——需要的是一张绑定单条记录、且与当初结果卡同一张脸的卡片。

## 目标

为 `verification.status === 'fulfilled'` 的记录提供单条验课卡导出，视觉上与该课的结果卡**正面**一致（宫位大字竖排 + 农历时辰），额外标注应验日期。

> 2026-07-29 修订：卡面由背面改为正面；未记此念的记录也可标记验课并存卡；存卡前先出预览浮层，预览中再决定是否保存；后再次修订为简洁正面（无 chrome、无验课印），预览图放大至 620×926rpx。

## 非目标

- 不改动 `pages/result/index.ts` 的绘制代码
- 不把此念笔记放上卡面（违反「此念绝不进分享路径」约束）
- 不为未应验／存疑／待验状态提供导出

## 关键约束

**此念不上卡。** 此念是本地私有数据，`wx-share.ts` 有测试守着不得引用。未记此念的记录同样允许标记验课与存卡——验课状态与此念解耦，首页主动追问仍只针对记了此念的课（`isVerificationDue` 不变）。

## 架构

### 新模块 `services/verification-record-card.core.js`

纯逻辑 + 纯 ctx 绘制，不含任何 `wx.*`，可用 stub ctx 测试。

复用 `result-card-image.core.js` 已导出的能力，保证「与结果卡一致」不靠人工同步：

```js
import {
  buildResultCardImageModel,
  getVerticalSymbolLayout,
  wrapPosterText,
  RESULT_CARD_CODE_SLOT,
} from './result-card-image.core.js'
```

导出接口：

| 函数 | 输入 | 输出 |
|---|---|---|
| `canExportVerificationCard(record)` | 单条记录 | `boolean`，仅 `verification.status === 'fulfilled'` 为真 |
| `formatVerifiedAtText(record)` | 单条记录 | `'07.29 应验'`，东八区，取 `verification.updated_at`；时间无效时返回 `''` |
| `buildVerificationRecordCardModel(record)` | 单条记录 | 结果卡背面 model 加 `verifiedAtText`；不可导出时返回 `null` |
| `drawVerificationRecordCard(ctx, model)` | ctx + model | 无返回，按序绘制背景 → 简洁正面 |

卡的色调取该课自身宫位色（经 `buildResultCardImageModel` 的 `toneStyle`），因此与当初那张结果卡同色。

### 版式

**简洁正面**（2026-07-29 二次修订）：不画 chrome（无品牌行、无方法行、无问道印、无码位、无双线框），与 App 结果卡正面同一气质：

- 六象色调渐变 + 中部径向光晕
- 宫位大字竖排居中（centerY 268 / 104px）
- **应验日期**：底部居中 `(187, 452)`，暖金 15px
- **农历时辰**：底部居中 `(187, 488)`，与结果卡正面同款
- **免责声明**：底部居中 `(187, 548)`，11px

画布尺寸 375×560，与结果卡、汇总验课卡一致。预览浮层中图片按 620×926rpx 展示。

### 页面接线（`pages/history/`）

**标记瞬间**：`applyVerification` 中 `status === 'fulfilled'` 时直接走预览流程出验课卡（toast「已记下应验」），存不存由预览卡片上的按钮决定，不用 `wx.showModal` 打断。

**事后重找**：应验行左滑露出「存卡｜删除」两个按钮。

- 「存卡」`wx:if="{{item.verification.status == 'fulfilled'}}"`，用 `catchtap` 避免触发行的 `handleEditVerification`
- 双按钮行位移加倍：行加 `has-card-action` 类，`translateX` 由 `-154rpx` 改为 `-308rpx`；非应验行保持 `-154rpx`
- 复用现有 `verificationCardCanvas` 画布节点与 `isBuildingCard` 标志，不新增 canvas

**先预览再保存**：两个入口都不直接写相册。`saveRecordCard` 只负责出图并打开预览浮层（`showCardPreview` / `previewCardPath`），浮层中「保存到相册」（`handleConfirmSaveRecordCard`）才调 `wx.saveImageToPhotosAlbum`，「取消」（`handleCancelRecordCardPreview`）直接关闭。

**汇总卡改名**：底部按钮文案 `保存验课卡` → `保存应验总览`，把「验课卡」这个词让给单条卡，避免同名歧义。汇总卡功能与实现不变。

## 数据流

```
history 记录 (verification.status === 'fulfilled')
  → buildVerificationRecordCardModel(record)          [core, 纯]
  → wx.createCanvasContext('verificationCardCanvas')  [page]
  → drawVerificationRecordCard(ctx, model)            [core, 纯]
  → ctx.draw → wx.canvasToTempFilePath                [page]
  → 预览浮层 <image src="{{previewCardPath}}">          [page]
  → 确认后 wx.saveImageToPhotosAlbum                   [page]
  → track('save_verification_record_card', { symbol })
```

## 错误处理

- 记录不可导出（非应验／记录不存在）→ `canExportVerificationCard` 为假，页面 toast「此课尚未应验」并直接返回，不进 canvas
- `canvasToTempFilePath` 失败 → toast「生成失败」，重置 `isBuildingCard`
- 相册保存失败（含用户拒绝授权）→ toast「保存失败」，关闭预览
- 导出进行中或预览已打开时重复点击 → `isBuildingCard` / `showCardPreview` 拦截

## 测试

新增 `tests/verification-record-card.test.mjs`：

- 仅 `fulfilled` 可导出，其余四种状态（`unfulfilled` / `deferred` / `unclear` / 无状态）返回 `null`
- `formatVerifiedAtText` 按东八区跨日正确（UTC 16:00 属次日）
- model 的 `toneStyle` 与同宫位结果卡 model 相等 —— 钉死「与结果卡一致」
- `drawVerificationRecordCard` 用 stub ctx 断言：绘制正面宫位大字与农历时辰、写入印文与应验日期、不绘制签语与档位

需同步更新的既有断言：

- `tests/navigation-flow.test.mjs` —— `translateX(-154rpx)` 断言扩为两种位移
- `tests/verification-flow.test.mjs` —— 底部按钮文案改为 `保存应验总览`；单条入口断言改为预览流程；移除「此课未记此念，不入验课」闸门断言（未记此念也可验课存卡）

## 已知取舍

单条验课卡改为简洁正面后不再绘制 chrome（品牌行、问道印、码位），与结果页的绘制重复仅剩「渐变背景 + 竖排宫位」一小段 ctx 调用序列，数据（色调、竖排布局、model builder）仍是单一来源（import 自 `result-card-image.core.js`）。
