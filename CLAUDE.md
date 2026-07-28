# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

AskDao (问道) — a WeChat Mini Program for 小六壬 divination. MVP 0.1: rule engine only, no backend, no user accounts, no LLM, no coin gua. Everything runs on-device; history lives in `wx.setStorageSync`.

Open the **repository root** in WeChat DevTools — `project.config.json` sets `miniprogramRoot` to `miniprogram/`.

## Commands

```bash
npm test                                    # all tests (node:test, ~88 assertions)
node --test miniprogram/tests/xiao-liuren.test.mjs   # single test file
npm run build:almanac                       # regenerate checked-in calendar data
npx --yes -p typescript@5 tsc --noEmit -p miniprogram/tsconfig.json   # typecheck
```

Pin TypeScript to `@5` — TS 6 rejects this tsconfig's `baseUrl` and `moduleResolution: Node`.

## The `.core.js` / `.ts` split (most important convention)

Tests run in plain Node with no WeChat runtime, so **all testable logic lives in `.core.js` ES modules that never touch `wx.*`**. The sibling `.ts` file is a thin typed wrapper that adds interfaces and injects the WeChat API.

```
domain/rules/xiao-liuren.core.js   # pure logic, imported by tests
domain/rules/xiao-liuren.ts        # re-exports with RuleResult types, imported by pages
services/storage.core.js           # list transforms on plain arrays
services/storage.ts                # same ops wrapped around wx.getStorageSync
```

Where a core function needs storage, the `wx` object is **passed in as a parameter** (`getDailyDivinationUsage(storage, date)`), so tests hand it a stub.

When adding logic: put it in `.core.js`, write the test against `.core.js`, then expose it through the `.ts` wrapper. Do not add `wx.*` calls to a `.core.js` file.

## Layers

```
pages/            WXML/WXSS/TS page controllers — orchestrate, own all wx.* UI calls
application/      divination-service.ts (risk → lunar → rule → interpretation)
                  divination-flow.core.js (repeat vs. daily-limit arbitration)
domain/           rules/ calendar/ interpretation/ risk/ — no wx.* except almanac.ts
services/         storage, analytics, daily-limit, wx-share, result-card-image
```

`domain/calendar/almanac.ts` is the one deliberate exception: it calls `wx.base64ToArrayBuffer` to decode the packed activity table.

## Flow and business rules

`pages/xiao-liuren/index.ts#handleDivine` is the heart of the app:

1. `periodKey` = Shanghai civil date + hour index (`2026-07-27/4`) — computed **first**.
2. `resolveDivinationAttempt` checks **repeat before quota**: re-asking within the same 时辰 replays the stored result for free (`?repeat=1`) and never consumes a daily slot.
3. Otherwise enforce `DAILY_DIVINATION_LIMIT = 3`, run the divination, persist, then `recordDailyDivination`.
4. `runCountAnimation` walks `buildXiaoLiurenCountPath` with `buildCountStepDelays` (accelerating→slowing, 0.9–3.4s total) before navigating to the result page.

The count animation and the result must agree: the final step of `XIAO_LIUREN_COUNT_SEQUENCE` lands exactly on the calculated symbol. A test enforces this.

`variantIndex` = today's usage count, rotating the interpretation template so the 2nd and 3rd question of a day read differently. `selectionKey` = `periodKey`, hashed (FNV-1a) to pick a stable traditional verdict — same 时辰 always yields the same text.

Storage keys: `askdao_latest_result`, `askdao_history_records` (capped at 20), `askdao_latest_poster`, `askdao_daily_divination_usage`.

## Calendar data

`scripts/build-almanac.mjs` uses `lunar-javascript` (a **dev-only** dependency, never shipped) to generate `lunar-days.data.js` (2020–2035) and `almanac.data.js` (2025–2028, packed as base64 + shared string dictionary to stay under a 250KB budget). Both are checked in. The Mini Program has **zero runtime npm dependencies** — `packNpmManually` is `false` and there is no `miniprogram_npm`; a test asserts this.

Outside the almanac range the app falls back to the solar date; outside the lunar range `runXiaoLiurenDivination` returns `{ ok: false, type: 'unsupported_date' }`.

## Tests are contracts over source text

Beyond the pure-logic tests, `navigation-flow.test.mjs`, `theme-mode.test.mjs`, `devtools-config.test.mjs` and `assets.test.mjs` **read `.wxml`/`.wxss`/`.ts` files as strings and regex-assert on them** — exact copy (`轻点卡面 · 翻看断课`), CSS values (`translateX(-154rpx)`), handler names, and `doesNotMatch` guards against deleted features (`再问一次`, `entry=quick`, `getUserProfile`, `liuren-hand`).

Consequence: editing UI copy, class names, or layout values breaks tests by design. Update the assertion alongside the change — a failing string match usually means an intentional product rule is being reverted, not a stale test. `devtools-config.test.mjs` also asserts a list of deleted files stays deleted.

`assets.test.mjs` enforces image budgets: `page-bg.png` ≤150KB, `result-card-bg.png` ≤180KB, `bagua-taiji.png` ≤80KB (main package limit is 2MB).

## Theming

`app.json` sets `darkmode: true` with `theme.json` variables (`@navBgColor`, `@bgColor`, `@navTxtStyle`). Home / ritual / history follow the system theme and need a `@media (prefers-color-scheme: dark)` block in their WXSS. **The result page is always dark** — its `index.json` hardcodes `#10100f`, because the flip card and the saved image share one tone palette.

Card tones are defined twice and must stay in sync: `pages/result/index.wxss` (`.tone-da-an` … `.tone-kong-wang`) and `services/result-card-image.core.js` (`RESULT_CARD_TONE_STYLES`) for canvas rendering.

## Privacy and compliance constraints

- No `getUserProfile` / `getUserInfo` / nickname collection anywhere (asserted by test).
- The optional 此念 note is local-only and never enters the share path (`wx-share.ts` must not reference `thought_note`).
- `checkQuestionRisk` blocks health/legal/financial/self-harm keywords before any calculation.
- Disclaimer copy in `domain/interpretation/templates.ts` is deliberately short — do not re-add explanations of the calculation.
- The result card reserves a mini-program-code slot drawn as a 「问道」 placeholder until publication; see `miniprogram/README.md` for the swap steps.

## Docs

`docs/` holds the Chinese PRD, architecture framework, brand and launch-prep notes; `plans/` holds reviewed change proposals. Consult them for product intent before changing ritual copy or flow.
