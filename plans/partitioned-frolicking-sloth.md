# AskDao 三项改进方案 v2（已评审修订）

## 评审结论

方向认可：文案轮换 + 常驻翻面提示（低风险高收益）、构建期静态历法数据（可行，需先实测体积）。
v1 的四处硬伤已修正：体积模型、`used` 字段、日期级重复键、闰月契约；两处流程问题已修正：配额顺序、repeat 通知脏状态；测试契约加强。

## 修正要点（相对 v1）

| # | v1 问题 | v2 修正 |
|---|---|---|
| 1 | JSON 体积估算错误（实测 516KiB），且 source map 不计入上传包（`uploadWithSourceMap: true`），真实基线 438KB，原方案反而增大 ~90KB | 先实测上传包基线；JSON 改「顺序数组 + 共享字典索引」紧凑结构（原型验证黄历 412KB→~135KB） |
| 2 | `getDailyDivinationUsage` 无 `used` 字段，`templates[NaN]` 会崩 | 用 `usage.count`；Provider 按 `templates.length` 取模，不硬编码 3 |
| 3 | 重复键只比农历月日时辰，跨年同农历误判 | `periodKey` = 上海时区民用日期 + hourIndex（如 `2026-07-27/4`），存入 record |
| 4 | 配额检查在计算前，第三问后的重复显示「三问已满」而非重复提示 | periodKey 计算提前：先判重复（免费）→ 再判配额 |
| 5 | 闰月负值（2025-07-25 → -6）导致起课抛错——**现网 bug** | 换算层输出正月份 + `isLeapMonth`；计算层只收正数；显示层加「闰」；固定闰月日期测试 |
| 6 | `askdao_repeat_notice` 落 storage 有脏状态 | 改用 `/pages/result/index?repeat=1` query 参数 |
| 7 | 源码正则断言无法证明运行时行为 | 起课主流程抽成可注入 storage 的纯函数，真实断言历史/次数/latest；静态 JSON 带 version 元信息与加载、降级契约 |

## 任务零（前置）：体积原型与基线实测

- 用开发者工具「上传」测当前主包基线（记录精确字节数）
- 紧凑结构生成器原型：黄历数据「顺序数组（按日偏移）+ 宜忌词条共享字符串表 + 干支/生肖查表」；目标：lunar-days + almanac 合计 ≤ 250KB，且对比基线净减 ≥ 300KB
- go/no-go：达不到净减目标则放弃任务二，保留 lunar-javascript，仅做任务一/三

## 任务三：模板文案轮换 + 翻面引导（先实施）

- `templates.ts`：每宫位 3 套文案（数组），字段不变，遵守 PRD §11 文案原则
- `template-provider.ts`：`context.variantIndex ?? 0`，取 `templates[variantIndex % templates.length]`
- `divination-service.ts`：`DivinationInput` 加可选 `variantIndex`；页面传 `getDailyDivinationUsage(wx).count`（已核实字段存在）
- 结果页卡下常驻引导：`{{isCardBackVisible ? '轻点卡面 · 翻回宫位' : '轻点卡面 · 翻看断课'}}`
- 测试：每宫位 3 套字段齐全；variantIndex 轮换（含 >length 取模）；文案禁用词黑名单扫描；引导文案断言

## 任务一：重复起课处理 + 闰月修复（次实施）

- `xiao-liuren.core.js`：新增 `buildDivinationPeriodKey(date, hourIndex)`（上海时区 `YYYY-MM-DD/hourIndex`）；换算层输出正月份 + `isLeapMonth`，`calculateXiaoLiuren`/`buildXiaoLiurenCountPath` 只收正数；`formatLunarTimeText` 显示层加「闰」
- 起课主流程抽纯函数（storage 注入）：先算 periodKey → 与 latest record 的 periodKey 比对
  - 命中：`track('repeat_divination')`，不写历史/不扣次数/不覆盖 latest，`wx.navigateTo('/pages/result/index?repeat=1')`
  - 未命中：再查配额 `canStartDailyDivination`，走原流程
- 结果页 onLoad 读 `options.repeat` 显示提示条「此时辰已取过象，结果与前次相同，不妨换个时辰再问。」
- 测试：periodKey 跨年/跨日/同时辰；闰月固定日期（2025-07-25 → 月 6 + isLeapMonth）；纯函数级断言「重复时历史长度/count/latest 均不变」；配额顺序（count=3 时重复仍放行提示）

## 任务二：历法迁移（任务零达标后实施）

- `scripts/build-almanac.mjs`：紧凑结构生成，参数固定（年份区间、截断条数），输出带 `{ version, generatedAt, startDate, endDate }` 元信息
- 运行期 `almanac.core.js` 重写为查表（小程序 `require` JSON）；表外降级：仅公历+星期+提示「请更新版本」；起课表（lunar-days）覆盖 2020-2035
- `package.json`：lunar-javascript → devDependencies；删除 `miniprogram_npm/lunar-javascript/`，重新构建 npm
- 测试：固定样例与 lunar-javascript 比对（含闰月日）；JSON 元信息契约；体积预算断言；2035 年后首页降级断言

## 验证

- `npm test` 全绿（基线 69，预计 90+）
- 主包：任务零实测基线 vs 任务二完成后实测，净减 ≥ 300KB 才合并
- 人工：同时辰重复（提示+不扣次数+第三问后仍可见提示）、闰月日起课正常、文案轮换、翻面引导、黄历表外降级

## 附：实施后代码审查的 5 项 LOW 修复（用户已确认）

1. `divination-flow.core.js` 的 `resolveDivinationAttempt` 删除未被页面消费的 `shouldWriteHistory`/`shouldConsumeDailyUsage` 标志位（页面按 outcome 分支硬编码），测试同步删除标志断言、保留行为断言；`getRecordPeriodKey` 补注释：legacy record 的 hour_index 为旧本地时区算法，非东八区设备可能误判为「非重复」，无害可接受
2. `divination-service.ts` 失败返回加 `type: 'keyword_risk' | 'unsupported_date'` 区分；起课页弹窗标题按类型区分：「暂不支持当前日期」/「暂不适合问道」
3. 删除空 `miniprogram_npm/` 目录；README 标注当前无运行时依赖、无需执行「构建 npm」（packNpm 配置保留以便未来依赖）
4. （同 1 的注释）
5. 提醒用户在开发者工具实测上传包大小（人工动作，不改代码）
