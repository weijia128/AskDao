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

Because the home page uses `lunar-javascript` for real lunar calendar and almanac data, run dependency install once from the repository root:

```bash
npm install
```

Then in WeChat DevTools run:

```text
工具 -> 构建 npm
编译
```

Run local rule tests from the repository root:

```bash
npm test
```
