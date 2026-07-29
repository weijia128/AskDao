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
  assert.match(homeSource, /syncLatestResultRecord/)
  assert.match(homeSource, /refreshDueVerification/)
  assert.match(homeSource, /track\('view_verification_prompt'/)
  assert.match(homeSource, /track\('mark_verification'/)
})

test('最新记录副本的同步逻辑只有一份，收在 storage 层', async () => {
  const storageSource = await readText('../services/storage.ts')
  const homeSource = await readText('../pages/home/index.ts')
  const historySource = await readText('../pages/history/index.ts')

  assert.match(storageSource, /export function syncLatestResultRecord/)
  assert.match(storageSource, /askdao_latest_result/)

  // 两个页面都必须走共用函数，不得各自复制一份读改写
  for (const pageSource of [homeSource, historySource]) {
    assert.match(pageSource, /syncLatestResultRecord\(/)
    assert.doesNotMatch(pageSource, /askdao_latest_result/)
  }
})

test('问道录可点击记录改写验证状态', async () => {
  const historyMarkup = await readText('../pages/history/index.wxml')
  const historySource = await readText('../pages/history/index.ts')

  assert.match(historyMarkup, /bindtap="handleEditVerification"/)

  assert.match(historySource, /VERIFICATION_ACTIONS/)
  assert.match(historySource, /'应验'/)
  assert.match(historySource, /'未应验'/)
  assert.match(historySource, /'尚未分晓'/)
  assert.match(historySource, /wx\.showActionSheet/)
  assert.match(historySource, /applyVerification/)
  assert.match(historySource, /buildVerificationPatch/)
  assert.match(historySource, /updateHistoryRecord/)
  assert.match(historySource, /source: 'history'/)

  // 已定论的记录也能改回来，窗口只管何时追问、不锁数据
  assert.doesNotMatch(historySource, /isVerificationTerminal/)

  // 滑动删除后紧跟的那次 tap 不能误开面板
  assert.match(historySource, /swipedRecently/)

  // 没写此念的记录不入验课，点了要给出解释而不是静默
  assert.match(historySource, /此课未记此念，不入验课/)
})

test('首页验课拒绝渲染切换中的快速重复点击', async () => {
  const homeSource = await readText('../pages/home/index.ts')

  assert.match(
    homeSource,
    /isProcessingVerification: false,[\s\S]*handleVerify\(event\) \{[\s\S]*if \(this\.data\.isProcessingVerification\) \{\s*return\s*\}[\s\S]*this\.setData\(\{ isProcessingVerification: true \}\)[\s\S]*this\.setData\(\{ dueRecord: null, dueRecordTimeText: '' \}, \(\) => \{\s*this\.refreshDueVerification\(\)\s*this\.setData\(\{ isProcessingVerification: false \}\)\s*\}\)/,
  )
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

test('问道录展示每条记录的验证状态与累计应验率', async () => {
  const historyMarkup = await readText('../pages/history/index.wxml')
  const historySource = await readText('../pages/history/index.ts')
  const historyStyles = await readText('../pages/history/index.wxss')

  assert.match(historyMarkup, /verify-summary/)
  assert.match(historyMarkup, /\{\{summary\.settled\}\}/)
  assert.match(historyMarkup, /\{\{summary\.fulfilled\}\}/)
  assert.match(historyMarkup, /\{\{summary\.rate\}\}%/)
  assert.match(historyMarkup, /应验率/)
  assert.match(historyMarkup, /\{\{item\.verificationText\}\}/)
  assert.match(historyMarkup, /wx:if="\{\{item\.verificationText\}\}"/)

  assert.match(historySource, /getVerificationLabel/)
  assert.match(historySource, /summarizeVerifications/)
  assert.match(historySource, /verificationText/)

  assert.match(historyStyles, /\.verify-summary/)
  assert.match(historyStyles, /\.verify-tag/)
})

test('问道录可导出验课卡并保存到相册', async () => {
  const historyMarkup = await readText('../pages/history/index.wxml')
  const historySource = await readText('../pages/history/index.ts')
  const historyStyles = await readText('../pages/history/index.wxss')

  assert.match(historyMarkup, /verificationCardCanvas/)
  assert.match(historyMarkup, /verify-card-button/)
  assert.match(historyMarkup, /保存验课卡/)
  assert.match(historyMarkup, /bindtap="handleSaveVerificationCard"/)
  assert.match(historyMarkup, /wx:if="\{\{summary\.settled\}\}"/)

  assert.match(historySource, /buildVerificationCardModel/)
  assert.match(historySource, /wx\.createCanvasContext/)
  assert.match(historySource, /wx\.canvasToTempFilePath/)
  assert.match(historySource, /wx\.saveImageToPhotosAlbum/)
  assert.match(historySource, /track\('save_verification_card'/)
  assert.match(historySource, /isBuildingCard/)

  assert.match(
    historyStyles,
    /\.page-shell\s*>\s*canvas\.verification-card-canvas\s*\{[^}]*position:\s*fixed;/,
  )
  assert.match(historyStyles, /\.verify-card-button/)
})

test('验课卡不写入任何此念原文', async () => {
  const cardSource = await readText('../services/verification-card-image.core.js')
  const historySource = await readText('../pages/history/index.ts')

  assert.doesNotMatch(cardSource, /thought_note/)
  assert.doesNotMatch(historySource, /drawVerificationCard[\s\S]*thought_note/)
})
