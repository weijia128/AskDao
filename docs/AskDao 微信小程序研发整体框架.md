---
type: architecture
title: "AskDao 微信小程序研发整体框架"
created: 2026-07-21
updated: 2026-07-21
category: mini-program
status: draft
description: "AskDao 微信小程序试水版的研发分层、模块边界、MVP 0.1 实现范围和后续大模型接入方式"
tags: [askdao, miniprogram, architecture, typescript, rules-engine, xiao-liuren]
---

# AskDao 微信小程序研发整体框架

## 1. 研发目标

MVP 0.1 目标不是做完整 App，也不是做复杂玄学平台，而是在微信生态中快速验证：

- 用户是否愿意完成一次小六壬问道。
- 用户是否愿意保存或分享结果卡片。
- 分享是否能带来新用户进入。
- 今日问道是否能带来再次打开。

首版架构必须轻、稳、可扩展。核心规则不能交给大模型生成，必须由确定性规则层产出。

## 2. 技术选型

### 首选方案

```text
原生微信小程序 + TypeScript + WXML + WXSS + JSON
```

原因：

- 当前目标只验证微信生态，不需要一开始多端适配。
- 原生小程序最贴近微信审核、分享、相册、Canvas、小程序码等能力。
- 规则层可以用 TypeScript 纯函数实现，便于单元测试和后续迁移。
- 后续如果做 App 或 Web，可复用规则层和部分数据结构。

### 暂不推荐

- MVP 0.1 不优先使用 Taro / uni-app，除非明确需要同步发 H5、App 或支付宝小程序。
- MVP 0.1 不优先做复杂后端。
- MVP 0.1 不接大模型。
- MVP 0.1 不引入智能体。

## 3. 分层架构

首版采用轻量分层：

```text
小程序页面层
  ↓
Application Service
  ↓
Risk Guard
  ↓
Rule Engine
  ↓
Interpretation Provider
  ↓
Result / Share Poster / Local History
  ↓
Analytics
```

### 页面层

负责用户可见页面和交互：

- 今日问道首页。
- 小六壬推演页。
- 结果页。
- 分享卡片生成页或组件。
- 历史记录页。
- 问事方向选择页或弹层可作为 V1 可选增强，不进入 MVP 0.1 主流程。

### Application Service

负责组织一次问道流程，不参与规则计算。

职责：

- 收集起念时间和来源。
- 问题类型首版使用默认值，可选输入后续再接入。
- 调用输入风险检测。
- 调用小六壬规则层。
- 调用解读 Provider。
- 生成结果页模型。
- 生成分享卡片模型。
- 写入本地历史。
- 触发埋点事件。

### Risk Guard

首版只做轻量关键词检测，不接 AI 审核。

职责：

- 检查用户可选输入是否命中医疗、金融、死亡、自伤、法律等风险词。
- 命中后提示用户调整问题。
- 不直接生成建议，不做专业判断。

### Rule Engine

负责确定性计算，只输出结构化结果。

要求：

- 不依赖大模型。
- 同一输入必须得到同一结果。
- 必须有可测试样例。
- 不生成煽动性、绝对性文案。
- 输出结果供结果页、分享卡片、历史记录和解读层复用。

MVP 0.1 规则：

- 小六壬。

V1 候选规则：

- 金钱卦。

### Interpretation Provider

负责把结构化结果转成用户可读文案。

接口先抽象，首版只实现模板 Provider：

```text
InterpretationProvider
  ├─ TemplateInterpretationProvider  MVP 0.1
  └─ LLMInterpretationProvider       V1+
```

要求：

- 不重新计算小六壬。
- 不修改规则层结果。
- 不输出绝对预测。
- 结果页和分享卡片可复用输出。

### 分享卡片层

负责生成适合保存到相册和朋友圈传播的图片数据。

要求：

- 不展示用户原问题。
- 优先使用结构化短字段。
- 不依赖长文本解读。
- 包含 `template_id`，为后续模板测试预留。
- 包含小程序码或回流入口。

## 4. 建议目录结构

```text
AskDao/
  docs/
  miniprogram/
    app.ts
    app.json
    app.wxss
    pages/
      home/
        index.ts
        index.wxml
        index.wxss
        index.json
      xiao-liuren/
        index.ts
        index.wxml
        index.wxss
        index.json
      result/
        index.ts
        index.wxml
        index.wxss
        index.json
      history/
        index.ts
        index.wxml
        index.wxss
        index.json
    components/
      daily-ritual/
      question-type-picker/
      ritual-button/
      result-panel/
      share-poster/
      ambient-background/
    application/
      divination-service.ts
      result-service.ts
      poster-service.ts
    domain/
      rules/
        xiao-liuren.ts
        types.ts
      interpretation/
        provider.ts
        template-provider.ts
        templates.ts
      risk/
        keyword-risk-guard.ts
        risk-keywords.ts
      calendar/
        lunar.ts
        chinese-hour.ts
    design/
      tokens.ts
      copywriting.ts
    services/
      storage.ts
      analytics.ts
      wx-share.ts
      poster.ts
    assets/
      images/
      icons/
    tests/
      xiao-liuren.test.ts
      risk-guard.test.ts
      template-provider.test.ts
```

如果首版不使用构建工具，可先采用微信开发者工具默认结构；但规则层、解释层和风险层仍应保持清晰边界，避免散落在页面文件里。

## 5. 核心数据结构

### 问题类型

```ts
type QuestionType =
  | 'daily_state'
  | 'work_choice'
  | 'interpersonal'
  | 'relationship'
  | 'decision'
  | 'open'
```

### 起问输入

```ts
type DivinationMethod = 'xiao_liuren'

interface DivinationInput {
  method: DivinationMethod
  questionType: QuestionType
  questionText?: string
  startedAt: string
  timezone: 'Asia/Shanghai'
  source: 'daily' | 'quick' | 'share'
}
```

### 规则层输出

规则结果必须能解释「为什么得到这个结果」，不保存整个用户状态。

```ts
type ResultGrade = '阻' | '平' | '顺'

interface RuleResult {
  method: 'xiao_liuren'
  rule_version: 'xiao_liuren_v1'
  input_snapshot: {
    lunar_month: number
    lunar_day: number
    hour_branch: string
    hour_index: number
  }
  calculation: {
    formula: string
    result: number
  }
  symbol: '大安' | '留连' | '速喜' | '赤口' | '小吉' | '空亡'
  grade: ResultGrade
  created_at: string
}
```

### 解读 Provider

```ts
interface InterpretationContext {
  questionType: QuestionType
  questionText?: string
  tone: 'mysterious' | 'calm'
}

interface InterpretationResult {
  title: string
  oracleText: string
  explanation: string
  actionHint: string
  reflectionQuestion: string
  disclaimer: string
}

interface InterpretationProvider {
  generate(
    ruleResult: RuleResult,
    context: InterpretationContext
  ): Promise<InterpretationResult>
}
```

MVP 0.1 使用：

```text
TemplateInterpretationProvider
```

V1 后可增加：

```text
LLMInterpretationProvider
```

### 分享卡片数据

```ts
type SharePosterType = 'result' | 'persona' | 'question'

interface SharePosterModel {
  template_id: 'A01' | 'B01' | 'C01'
  type: SharePosterType
  brand: '问道'
  methodName: '小六壬'
  grade: ResultGrade
  symbol: RuleResult['symbol']
  oracleText: string
  actionHint: string
  miniProgramCodeUrl?: string
}
```

### 历史记录

```ts
interface HistoryRecord {
  id: string
  rule_result: RuleResult
  interpretation: InterpretationResult
  poster_template_id: SharePosterModel['template_id']
  question_type: QuestionType
  created_at: string
  is_favorite: boolean
}
```

## 6. 小六壬规则层

小六壬输入：

- 起念时间。
- 公历时间转出的农历月日。
- 时辰序号。

公式：

```text
小六壬序号 = (农历月 + 农历日 + 时辰序号 - 2) % 6
```

余数映射：

| 余数 | 六象 | 三档 |
|---|---|---|
| 1 | 大安 | 顺 |
| 2 | 留连 | 平 |
| 3 | 速喜 | 顺 |
| 4 | 赤口 | 阻 |
| 5 | 小吉 | 顺 |
| 0 | 空亡 | 阻 |

关键测试样例：

```text
农历七月二十一日辰时：
(7 + 21 + 5 - 2) % 6 = 1
结果：大安 / 顺
rule_version: xiao_liuren_v1
```

## 7. 风险关键词过滤

MVP 0.1 使用本地关键词规则。

示例结构：

```ts
const riskKeywords = {
  medical: ['癌', '疾病', '症状', '诊断', '吃药', '手术'],
  finance: ['股票', '彩票', '投资', '借钱', '贷款', '暴富'],
  life: ['死亡', '自杀', '自残', '活不下去'],
  legal: ['违法', '坐牢', '起诉', '判刑'],
}
```

命中后提示：

```text
问道仅作为传统文化体验和自我参考。
涉及健康、法律、财务或人身安全的问题，请咨询专业人士或及时寻求现实帮助。
```

后续接入 LLM 后，可增加语义风险检测和输出安全审核，但不进入 MVP 0.1。

## 8. 解读层策略

MVP 0.1 不接大模型，使用模板解读。

模板输入：

- 六象。
- 三档结果。
- 问题类型。
- 可选问题文本。

模板输出：

- 一句签语。
- 一段解释。
- 一个行动提醒。
- 一个反思问题。
- 固定免责声明。

后续 LLM 输入应是结构化结果，而不是原始规则过程。

示例：

```json
{
  "method": "小六壬",
  "rule_version": "xiao_liuren_v1",
  "symbol": "大安",
  "grade": "顺",
  "question_type": "work_choice",
  "tone": "神秘仪式感，温和自省，不做绝对预测"
}
```

LLM 输出必须经过安全审核后再展示。审核范围：

- 医疗建议。
- 投资建议。
- 宿命判断。
- 恐吓表达。
- 保证性判断。

## 9. 后端预留边界

MVP 0.1 不实现后端。为了避免未来重构，代码边界按服务接口组织。

未来后端形态可演进为：

```text
用户
 |
小程序
 |
API Gateway
 |
--------------------------------
|              |               |
规则服务       内容服务         用户服务
|              |               |
Rule Engine    Prompt/Template  Profile/History
               |
             LLM 服务
```

当前只需要在前端保留：

- `InterpretationProvider` 接口。
- `Analytics` 事件接口。
- `PosterModel` 的 `template_id`。
- `RuleResult` 的 `rule_version`。

不要在 MVP 0.1 中实现 API Gateway、用户服务、Prompt 管理或云历史。

## 10. 数据埋点

首版必须定义事件名，否则上线后无法分析漏斗。

| 事件 | 触发时机 | 关键属性 |
|---|---|---|
| page_view | 进入页面 | page, source, scene |
| view_daily_ritual | 看到今日问道模块 | daily_symbol, daily_grade |
| click_start | 点击开始问道 | entry |
| start_divination | 开始小六壬推算 | method |
| complete_divination | 规则计算完成 | symbol, grade, rule_version |
| view_result | 查看结果页 | symbol, grade |
| save_poster | 保存分享卡片 | template_id, symbol, grade |
| share_click | 点击分享入口 | template_id, channel |
| reopen_from_share | 从分享回流 | template_id, share_scene |
| view_history | 查看历史记录 | count |

MVP 0.1 可以先把事件写入本地日志或微信统计能力；后续再接自有分析服务。

## 11. 视觉与交互实现原则

AskDao 的视觉目标是「神秘、有仪式感、但克制可信」。首版要把核心体验做顺，不追求复杂视觉堆叠。

### 视觉风格

推荐方向：

- **新中式**：宣纸白、墨黑、朱砂红、古铜金，整体克制、留白充足。
- **轻赛博玄学**：暗色背景、低饱和光晕、细线星图、铜钱高光，适合结果页和分享卡片。

首版主色建议：

| 用途 | 颜色方向 | 说明 |
|---|---|---|
| 背景 | 墨黑 / 深玄色 | 承载神秘氛围 |
| 主强调 | 古铜金 | 用于按钮、铜钱、结果高亮 |
| 风险提醒 | 朱砂红 | 少量使用，避免焦虑感 |
| 内容底色 | 宣纸白 / 暗色毛玻璃 | 保证正文可读性 |

字体建议：

- 标题可用系统衬线字体或宋体风格，增强古典感。
- 正文优先使用系统无衬线字体，例如苹方，保证小屏可读性。
- 不使用过多书法字体，避免影响识别和审核观感。

图标建议：

- 使用统一线性风格。
- 可从 iconfont 等图库寻找古风、铜钱、卦象、星辰类图标。
- 所有图标必须检查授权，不直接复制未授权素材。

### 首版 UI 基线

首版必须做到：

- 首页第一屏突出今日问道。
- 「不诚不占，不疑不占，不义不占」作为顶部仪式提示。
- 开始问道按钮清晰，不用复杂表单打断用户。
- 结果页信息层级清楚：六象 / 阻平顺 / 签语 / 行动提醒 / 免责声明。
- 分享卡片比页面更克制，只保留短签语、结果和小程序码。

避免：

- 大面积纯黑导致压抑。
- 多层毛玻璃叠加导致文字发糊。
- 背景动画抢走结果阅读焦点。
- 结果颜色过于刺激，例如大面积红色表示「阻」。

### 毛玻璃效果

毛玻璃可用于首页方法卡片、结果信息面板和顶部导航，但要谨慎使用。微信小程序运行环境对部分 CSS 支持存在差异，必须真机验证。

建议样式：

```css
.glass-card {
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.18);
}
```

注意：

- `backdrop-filter` 模糊元素背后的内容。
- `filter` 会模糊元素本身和子内容，不适合卡片文字容器。
- 若真机兼容性不足，降级为半透明背景 + 细边框 + 阴影。

### 氛围动效

首版可做轻量动效：

- 首页背景：缓慢流动光晕或细粒子。
- 起问过程：短暂推演动画。
- 结果出现：渐入和轻微上移。
- 操作反馈：关键点击可加轻微震动。

控制原则：

- 动效总时长不要拖慢完成起问，核心流程应在 1 分钟内完成。
- 背景动画必须低亮度、低频率。
- 优先用 CSS 动画实现，复杂罗盘 / 转盘后续再考虑 Canvas。
- Canvas 动画要注意性能、图片体积和低端机表现。

### 本地数据与历史记录

MVP 0.1 历史记录使用微信小程序本地存储即可。

建议保存：

- 问题类型。
- 起念时间。
- 六象。
- 主结果。
- 短签语。
- 卡片模板 ID。
- 是否收藏。

不建议首版保存：

- 用户原问题到分享卡片。
- 高敏个人信息。
- 未经说明的云端记录。

实现上可以用 `wx.setStorageSync` / `wx.getStorageSync`，后续再替换为服务端或云数据库。

### 视觉资产

首版需要准备：

- 小程序头像。
- 首页背景纹理或抽象光晕。
- 铜钱或小六壬图标。
- 分享卡片底图。
- 小程序码占位样式。

所有素材必须确认授权。若使用 AI 生成图片，应保留生成记录和授权说明。

## 12. 参考项目评估清单

参考项目只作为灵感来源，不直接复制代码、文案或素材。使用前必须检查许可证、代码质量、兼容性和审核风险。

### baguapan

地址：https://github.com/xxxume/baguapan

可参考点：

- 微信小程序原生结构。
- 罗盘转动交互。
- 太极图旋转动效。
- 转动结束后的震动反馈。
- 结果页与免责声明组织。

使用限制：

- 只参考交互和结构，不直接复用卦辞内容。
- 若复用代码片段，必须确认许可证要求并保留声明。
- AskDao MVP 0.1 不需要完整罗盘，避免过重。

### meihua_yishu

候选地址：https://github.com/yusenRAY/meihua_yishu

可参考点：

- 首页、结果页、历史记录等页面划分。
- 占卜类小程序的信息层级。
- 简洁 UI 组织方式。

状态：

- 待进一步核验项目是否仍可访问、许可证是否清晰、代码是否适合微信小程序。

### wechat-fortune-miniprogram

候选地址：https://github.com/gddange/wechat-fortune-miniprogram

可参考点：

- 每日内容型产品的留存结构。
- 渐变、卡片和现代 UI 的组合方式。
- 首页到结果页的轻流程组织。

状态：

- 待进一步核验项目是否仍可访问、许可证是否清晰、代码是否适合微信小程序。

## 13. 研发阶段

### Sprint 0：核心体验原型

目标：1 周内验证核心体验是否顺。

包含：

- 小程序项目骨架。
- 小六壬规则层。
- 小六壬固定测试样例。
- 今日问道首页。
- 心中默问起念页。
- 结果页。
- 一张分享卡片。
- 风险过滤接口预留。

不包含：

- 金钱卦。
- AI。
- 后端。
- 用户系统。

### MVP 0.1：传播闭环

目标：2-3 周内验证传播闭环。

包含：

- 小六壬完整流程。
- 今日问道。
- 结果页。
- 分享卡片保存。
- 本地历史。
- 基础埋点。
- 分享回流识别。
- 首版视觉基线：新中式暗色氛围、清晰结果卡片、轻动效。

### V1.0：内容质量

目标：提升内容解释质量和玩法丰富度。

增加：

- 金钱卦。
- LLM 解读。
- 内容安全审核。
- Prompt 管理。
- 分享模板扩展。
- 评估更复杂的 Canvas 罗盘、星图或转盘动效。

### V2：产品化

目标：从传播型小程序转向可持续产品。

增加：

- 用户体系。
- 云历史。
- 个性化。
- AI 交互。
- 后端服务化。
- App 版本评估。

## 14. 关键风险

- 公历转农历口径错误，导致小六壬结果不稳定。
- 没有 `rule_version`，导致历史记录未来无法复现。
- 大模型直接参与规则计算，导致结果不可复现。
- 分享卡片文案过于绝对，带来审核和口碑风险。
- 前端暴露大模型 API Key。
- 未配置隐私说明就调用保存相册能力。
- 小程序码、合法域名、备案等上线资料准备滞后。
- 视觉素材来源不清晰，导致版权风险。
- 背景动效、毛玻璃和 Canvas 过度使用，导致低端机卡顿或文字可读性下降。
- 参考项目直接复制代码或文案，导致许可证和内容风险。
- 首版范围回流到金钱卦、AI 或后端，拖慢传播验证。

## 15. 参考入口

- 微信小程序开发文档：https://developers.weixin.qq.com/miniprogram/dev/framework/
- 微信开发者工具：https://developers.weixin.qq.com/miniprogram/dev/devtools/devtools.html
- 小程序网络能力与域名配置：https://developers.weixin.qq.com/miniprogram/dev/framework/ability/network.html
- 用户隐私保护指引：https://developers.weixin.qq.com/miniprogram/dev/framework/user-privacy/
- 保存图片到相册 API：https://developers.weixin.qq.com/miniprogram/dev/api/media/image/wx.saveImageToPhotosAlbum.html
- Canvas 生成图片 API：https://developers.weixin.qq.com/miniprogram/dev/api/canvas/wx.canvasToTempFilePath.html
- 参考项目 baguapan：https://github.com/xxxume/baguapan
- 参考项目 meihua_yishu：https://github.com/yusenRAY/meihua_yishu
- 参考项目 wechat-fortune-miniprogram：https://github.com/gddange/wechat-fortune-miniprogram
