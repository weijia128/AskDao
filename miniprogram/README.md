# AskDao Mini Program Skeleton

This directory contains the MVP 0.1 WeChat Mini Program skeleton.

Scope:

- Xiao Liuren rule engine.
- Ink-wash Taiji home page with daily almanac.
- Direct silent-question ritual flow.
- Result page.
- Local history.
- Share poster model boundary.
- Template interpretation provider.
- Lightweight keyword risk guard.

Not in MVP 0.1:

- Coin gua.
- LLM interpretation.
- Backend services.
- User accounts.

Open the repository root in WeChat DevTools. The root `project.config.json` points `miniprogramRoot` to this directory.

Calendar data is generated at build time. Install development dependencies and rebuild the checked-in tables from the repository root when their supported ranges need to change:

```bash
npm install
npm run build:almanac
```

`lunar-javascript` is a development-only generator dependency and is not included in the Mini Program package. The generated lunar conversion table covers 2020-2035; the detailed almanac covers 2025-2028 and falls back to the solar date outside that range.

Run local rule tests from the repository root:

```bash
npm test
```

## 结果卡小程序码

结果卡右下角预留了小程序码码位（`services/result-card-image.core.js` 的 `RESULT_CARD_CODE_SLOT`）。小程序未发布前，码位绘制「问道」占位印记；发布后按以下步骤替换为真实太阳码：

1. 微信公众平台 → 管理 → 小程序码，下载小程序太阳码 PNG（建议 430px 档）。
2. 压缩至 30KB 以内，命名为 `mp-code.png`，放入 `miniprogram/assets/images/`。
3. 在生成历史记录/结果数据时把 `mini_program_code_url` 设为 `/assets/images/mp-code.png`（或在 `buildResultCardImageModel` 中将默认值改为该路径）。
4. 重新上传代码并提交审核。
