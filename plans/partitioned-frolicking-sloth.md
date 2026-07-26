# AskDao 小程序 MVP 差距优化方案

## Context

对照 PRD / 研发框架 / 上线准备三份文档做完差距分析后，规则与流程内核完成度已很高，缺口集中在「验证与上线」：埋点只打 console 不上报、无小程序卡片分享与回流识别、getUserProfile 已废弃、缺隐私清理入口、一批死代码、主包图片体积偏大（约 1.1MB / 上限 2MB）。

**用户已确认的边界**：
- 首页保持现状，不做「今日问道」每日仪式模块
- 范围 = 除首页仪式外的全部：埋点上报、分享回流、隐私与审核准备、死代码删除、图片压缩
- 做 onShareAppMessage + onShareTimeline
- 死代码直接删除
- 小程序码本轮只做码位预留，发布后用静态太阳码替换（不接后端）

## 任务与改动

### F. 死代码删除（最先做）

删除以下已核实零引用的路径：

- `miniprogram/components/` 下 6 个空壳组件（ambient-background、daily-ritual、question-type-picker、result-panel、ritual-button、share-poster）及空目录
- `miniprogram/application/result-service.ts`
- `miniprogram/services/poster.ts`
- `miniprogram/assets/images/liuren-hand.png`
- `miniprogram/pages/question/`（未注册、无入口，PRD 明确 MVP 0.1 不做问题类型选择）
- `miniprogram/design/copywriting.ts`（仅被 pages/question 引用）、`miniprogram/design/tokens.ts`（零引用）及空目录

测试影响已核实：`navigation-flow.test.mjs` 中 question 页与 liuren-hand 相关断言全部是 `doesNotMatch` 否定断言，删除后自动通过。新增防回归用例（可放 `tests/devtools-config.test.mjs`）：断言上述路径不存在、4 个页面 json 无 `usingComponents`。

### G. 图片压缩（独立）

用 pngquant 有损压缩，**不换 WebP**（result-card-bg 走 canvas drawImage，Android WebP 兼容不稳）：

```bash
cd miniprogram/assets/images
pngquant --quality=65-85 --speed 1 -f -o page-bg.png page-bg.png
pngquant --quality=65-85 --speed 1 -f -o result-card-bg.png result-card-bg.png
pngquant --quality=70-90 --speed 1 -f -o bagua-taiji.png bagua-taiji.png
```

目标：page-bg ≤150KB、result-card-bg ≤180KB、bagua-taiji ≤80KB。文件名不变，无引用改动。新增体积预算测试断言（防回弹）。压缩后在开发者工具重新生成结果卡目检渐变有无色带，有色带则对该图提高 quality。

### H. types/index.d.ts 补全

按全仓 wx.* 调用清单补声明：`removeStorageSync`、`showModal`、`createCanvasContext`（含 CanvasContextLike）、`canvasToTempFilePath`、`saveImageToPhotosAlbum`、`showShareImageMenu`、`reportAnalytics`、`getEnterOptionsSync?`。不引官方类型包、不加 getUserProfile 声明、`strict:false` 不变。

### D. 去 getUserProfile（昵称水印移除）

- `pages/result/index.ts`：删 `RESULT_CARD_WATERMARK_KEY`、`getStoredWatermarkName`、`getResultCardWatermarkName`，两个保存/分享方法去掉 watermark 参数
- `services/result-card-image.core.js`：删 `normalizeWatermarkName`，`buildResultCardImageModel(record)` 改单参；`watermarkName` 换成固定署名 `signature: '问道人 起念'`
- 测试：`tests/result-card-image.test.mjs:46` 的 `watermarkName '清和'` 断言改为 signature 断言；`navigation-flow.test.mjs` 补 `doesNotMatch(resultSource, /getUserProfile/)` 防回归

删除后小程序零用户信息收集，公众平台隐私指引无需声明用户信息，降低审核风险。

### C. 结果卡小程序码预留（依赖 D，同一绘制函数）

- core：`RESULT_CARD_CODE_SLOT = { x: 277, y: 468, size: 56 }`（375x560 逻辑坐标，右下角）；model 加 `miniProgramCodeUrl`（本轮恒 `''`）
- 绘制层：码位恒画占位（细描边圆 + 「问道」印记风格小字，不要像可扫码）；`miniProgramCodeUrl` 非空时 drawImage 真实码图
- README 补「发布后替换静态太阳码」步骤（后台下载太阳码 → 压缩 ≤30KB → 放 assets/images/mp-code.png → 改 core 默认值 → 重新提审）
- 测试：model 含 `miniProgramCodeUrl: ''`；码位坐标在画布内；仍不读取 `thought_note`（隐私断言沿用）

### A. 埋点真实上报

- 新建 `services/analytics.core.js`（纯逻辑）：
  - `buildAnalyticsPayload(event, properties)`：附 `client_time`、不改入参
  - `buildShareReopenProperties(options, scene)`：`source==='share'` 时返回 `{ template_id, share_scene }`（scene 1007/1008/1044→session、1154→timeline、其他→unknown），否则返回 null
- 改 `services/analytics.ts`：`track()` 签名与事件名不变，内部优先 `wx.reportAnalytics`（后台未配置时微信端静默忽略），异常/不可用降级 `console.info`；事件联合类型新增 `'clear_history'`。所有现有 track() 调用点零改动
- 改 `pages/home/index.ts` onLoad：现有 page_view 之后，用 `wx.getEnterOptionsSync?.().scene`（try/catch 兜底）+ options 调 `buildShareReopenProperties`，非 null 则 `track('reopen_from_share', props)`
- 新增 `tests/analytics.test.mjs`：payload 构造、回流属性判定（share+1007→session、1154→timeline、direct→null）、源码断言 analytics.ts 含 reportAnalytics 且保留降级、home 含 reopen_from_share

注意：`wx.reportAnalytics` 需公众平台「统计-自定义分析」配置事件后才入库，未配置静默忽略属预期。

### B. 分享卡片 onShareAppMessage / onShareTimeline（依赖 A、C）

- `pages/result/index.ts`：
  - 卡片图 tempFilePath 缓存在 `this.cardImagePath`（页面实例字段），保存/分享图片先查缓存
  - `onShareAppMessage()`：`track('share_click', { channel: 'session', ... })`，返回 `{ title: '小六壬断课 · {symbol} · {grade}', path: buildSharePath(templateId), imageUrl: this.cardImagePath || '/assets/images/result-card-bg.png' }`
  - `onShareTimeline()`：query 加 `share_scene=timeline`，channel `'timeline'`
  - 现有 showShareImageMenu 的 share_click 补 `channel: 'image_menu'`
  - wxml 新增 `<button open-type="share">转发断课</button>` 显性入口（保留现有两按钮）
- `services/wx-share.ts`：新增 `buildShareTimelineQuery(templateId)`，与 home 回流参数协议对齐
- 测试：`navigation-flow.test.mjs:104` 的 `doesNotMatch(open-type="share")` 反转为 `match`；断言 result 源码含 onShareAppMessage/onShareTimeline/三个 channel

### E. 隐私与记录管理（依赖 A 的 clear_history 事件名）

- `services/storage.core.js` 加纯函数（保持 core/adapter 对称），`services/storage.ts` 加 `clearHistoryRecords()`（`wx.removeStorageSync(HISTORY_KEY)`）
- `pages/history/`：列表底部加「清除全部记录」按钮 → `wx.showModal` 确认（confirmColor 朱红）→ 清除 + `track('clear_history', { count })` + toast。不清 `askdao_latest_result`（职责单一）
- 产出隐私保护指引文案要点（供公众平台后台填写，不写代码页）：相册仅写入用途说明、不收集任何个人信息声明、本地记录仅存本机可一键清空、lunar-javascript 无数据外发
- 测试：history 用例断言 clear-all 按钮/showModal/clear_history/removeStorageSync

## 实施顺序

F（删死代码）→ G（图片压缩）→ H（types）→ D（去 getUserProfile）→ C（码位预留）→ A（埋点）→ B（分享）→ E（隐私清理）

依赖说明：D→C→B 同改 `pages/result/index.ts` 与 `result-card-image.core.js`，必须串行；A 先于 B/E（事件名与 track）；F 最先做以缩小后续测试断言搜索面。

## 验证

- `npm test`（`node --test "miniprogram/tests/*.test.mjs"`）全绿，预计用例 45 → 约 52
- 微信开发者工具人工清单：
  1. 编译无 TS 报错，4 页正常打开
  2. 带 `?source=share&template_id=A01` 编译模式启动首页 → Console 出现 reopen_from_share 降级日志
  3. 保存卡片 → 无昵称授权弹窗，卡片为固定署名 + 码位占位圆
  4. 「转发断课」与胶囊菜单转发 → 标题/图片/path 参数正确；朋友圈入口出现且 query 带 share_scene=timeline
  5. showShareImageMenu 图片分享回归正常
  6. 历史页清除全部 → showModal 确认/取消两路径；单条滑删回归
  7. 预览包体积符合预算（3 图合计 ≤410KB）
  8. 真机 Android + iOS 各回归第 3、4、5 项（canvas 与分享路径是真机差异高发区）
