---
type: research
title: "AskDao 历法与黄历数据方案调研"
created: 2026-07-01
updated: 2026-07-01
category: data
status: research
description: "记录 AskDao MVP 中农历、二十四节气、黄历宜忌、历史事件与传统意义内容的数据源选择和推荐架构"
tags: [research, data, lunar-calendar, solar-terms, almanac, ios, mvp]
---

# AskDao 历法与黄历数据方案调研

## 1. 结论

截至 2026-07-01，建议结论是：

> 农历 / 节气走本地库或自建算法，黄历宜忌走第三方 API 或独立内容层。不要把三者混成一个不可替换的数据源。

这个方向适合做成 AskDao 的「每日传统日历卡片」，而不是单纯查黄历。项目关键不只是算法，而是数据口径和内容质量：农历 / 节气可以稳定解决；黄历宜忌和历史意义应做成可替换、可审校、可缓存的内容层。

## 2. 现有库调研

| 方案 | 适合 | 优点 | 风险 |
|---|---|---|---|
| 6tail/lunar-javascript / lunar-python | JS / Python 项目；想快速覆盖农历 + 黄历字段 | 无第三方依赖，MIT；支持农历、节气、干支、生肖、彭祖百忌、每日宜忌、吉神凶煞、冲煞、胎神等，适合 MVP 和普通业务 | 黄历「宜忌」口径需要接受该库规则，建议做抽样校验 |
| sxtwl / sxtwl_cpp | 更重视天文历法准确性、长时间跨度 | 基于寿星天文历，支持农历、节气、儒略日；PyPI 版 2.0.7 于 2024-09-05 发布，适合做核心历法引擎 | 不主打黄历宜忌；C++ / Python wrapper 部署复杂度较高 |
| zhdate | 只做简单农历 / 阳历互转 | 简单，本地计算 | GPLv3+；功能少，无节气 / 黄历，不适合作商业闭源核心依赖 |

### 首选判断

- 如果项目是 Web / Node / TypeScript，优先考虑 `lunar-javascript`。
- 如果项目是 Python，且只需要严谨农历 / 节气，优先考虑 `sxtwl`。
- 6tail 的 JS / Python 库都声明支持老黄历、节气、干支、生肖等字段。
- sxtwl 更偏天文历法，支持宽范围查询和节气儒略日。

相关链接：

- 6tail/lunar-javascript: https://github.com/6tail/lunar-javascript
- 6tail/lunar-python: https://github.com/6tail/lunar-python
- sxtwl PyPI: https://pypi.org/project/sxtwl/

## 3. 自建算法方案

自建可行，但建议只自建「核心历法层」，不要从零自建完整黄历宜忌。

### 适合自建的部分

- 农历：按 GB/T 33661-2017《农历的编算和颁行》做口径。已核到国家标准全文公开系统中该标准为现行，发布日期为 2017-05-12，实施日期为 2017-09-01。
- 节气：按太阳黄经每 15 度一个节气计算。香港天文台说明，24 节气把黄道 360 度分为 24 段，每段相隔太阳黄经 15 度。

香港天文台 24 节气说明：

- https://www.hko.gov.hk/en/gts/time/24solarterms.htm

### 不建议自建的部分

- 黄历宜忌不建议从零自建，除非有明确民俗规则来源和内容审校能力。
- 黄历宜忌没有唯一权威口径，容易出现「同一天不同网站宜忌不同」的问题。

### 自建落地方式

- 使用天文算法或 `sxtwl` 预生成 1900-2100 或业务范围内的年表。
- 预生成结果缓存为 JSON 或数据库。
- 对春节、闰月、2033 年等边界年做回归测试。
- 所有计算固定为 `Asia/Shanghai` 时区。

## 4. 第三方 API 调研

| API | 覆盖 | 适合 | 注意 |
|---|---|---|---|
| 天行 / TianAPI 中国老黄历 | 宜忌、冲煞、吉时、胎神、节气、农历、干支等 | 快速上线黄历内容 | 会员 / 额度 / QPS 限制；需要缓存和字段兼容 |
| 天行 / TianAPI 二十四节气 | 节气日期、农历 / 公历、介绍、习俗、诗句等 | 需要节气内容文案 | 如果只要节气时间，本地计算更稳 |
| 聚合数据老黄历 | 阳历、阴历、五行、冲煞、彭祖百忌、吉神、宜忌、凶神等 | 老牌 API，可作为备选 / 比对源 | 文档显示日期开始时间为 2010-01-01，历史范围需要确认 |

### TianAPI

天行老黄历接口：

```text
https://apis.tianapi.com/lunar/index?key={apiKey}
```

字段覆盖 `fitness`、`taboo`、`pengzu`、`shenwei`、`taishen`、`chongsha` 等。

文档：

- https://www.tianapi.com/apiview/45

天行节气接口：

```text
https://apis.tianapi.com/jieqi/index?key={apiKey}
```

文档：

- https://www.tianapi.com/apiview/86

### 聚合数据

聚合老黄历接口：

```text
http://v.juhe.cn/laohuangli/d
```

文档说明日期从 2010-01-01 开始。

文档：

- https://www.juhe.cn/docs/download/pdf/65?aids=174

聚合数据也可用于「历史上的今天」，提供事件、诞辰、逝世等图文详情，可作为历史事件内容来源。

## 5. 推荐数据架构

### 核心层

本地库或自建算法生成：

- 农历
- 干支
- 生肖
- 节气

### 内容层

独立存储：

- 黄历宜忌
- 吉神凶煞
- 胎神
- 冲煞
- 吉时
- 传统意义内容
- 历史事件

内容字段建议带上：

- `source`
- `provider`
- `version`
- `fetched_at`

### API 使用原则

- API 只做黄历内容补充或数据校验，不要每次请求都实时查询 API。
- 上线前用 TianAPI、聚合、6tail / sxtwl 互相比对 50-100 个日期。
- 比对后确认产品采用哪套黄历口径，并把口径写入项目文档。

## 6. 首页「每日传统日历卡片」建议

首页当天内容建议包括：

- 顶部：公历日期、星期、农历日期、干支、生肖
- 今日黄历：宜、忌、冲煞、胎神、彭祖百忌、吉时
- 节气状态：今天是否节气；如果不是，显示「距下个节气还有 X 天」
- 今日传统意义：节气 / 节日 / 农历节点解释，例如立春、清明、端午、中秋
- 历史上的今天：传统文化、历史事件、人物诞辰 / 忌辰
- 日期切换：支持左右滑动查看前后日期

## 7. iOS 数据方案建议

iOS 端不建议直接依赖实时 API，建议做三层。

### 1. 本地历法层

- 农历、干支、生肖、节气日期：本地计算或预生成。
- 对 iOS 来说，稳妥方案是用 `lunar-javascript` 或 `sxtwl` 在构建阶段预生成 1900-2100 的 SQLite / JSON，再打包进 App。
- 优点是打开 App 秒出结果，且离线可用。

### 2. 黄历内容层

- MVP 可以用 TianAPI 中国老黄历，覆盖宜忌、冲煞、吉时、胎神等字段。
- 生产版不要把 API Key 放在 iOS 客户端里，应通过自有轻量后端请求并缓存。

### 3. 历史事件 / 意义内容层

- 历史上的今天可用聚合数据 API，获取事件、诞辰、逝世等图文详情。
- 「传统意义」不要完全依赖 API，建议维护一份高质量内容库。
- 内容库可覆盖：24 节气、传统节日、农历月份、节令习俗、食俗、诗句、禁忌说明等。

## 8. 推荐技术架构

- iOS：SwiftUI + SwiftData 或 SQLite
- 本地数据库：`daily_calendar.sqlite`
- 后端：Cloudflare Workers / Vercel / FastAPI 均可
- 农历 / 节气：随 App 打包，几年不用变
- 黄历：服务端提前缓存未来 30-90 天
- 历史事件：按 `MM-DD` 缓存
- 传统意义：人工编辑 JSON / Markdown

## 9. 核心数据模型草案

```swift
struct DailyDigest {
    let date: Date
    let lunar: LunarInfo
    let almanac: AlmanacInfo?
    let solarTerm: SolarTermInfo?
    let nextSolarTerm: SolarTermInfo?
    let events: [HistoryEvent]
    let meanings: [TraditionalMeaning]
}
```

## 10. MVP 落地建议

1. 首页只做「今日卡片 + 前后日期切换」。
2. 本地先放农历、节气、传统节日解释。
3. 黄历和历史事件通过后端缓存接口返回。
4. 没网时仍显示农历、节气、节日意义；联网后补充黄历和历史事件。
5. 所有黄历内容标注「民俗参考」，避免被理解成确定性建议。

## 11. 后续待确认

- 是否采用 `lunar-javascript` 预生成 iOS 本地数据。
- 黄历宜忌采用 TianAPI、聚合数据、6tail 规则，还是自维护内容口径。
- 是否需要建立 50-100 个日期的多源比对表。
- 传统意义内容库的编辑范围、语气、英文翻译风格与审校流程。
- 历史上的今天是否纳入 MVP，或推迟到 V1.1。
