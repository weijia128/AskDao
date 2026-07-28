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
