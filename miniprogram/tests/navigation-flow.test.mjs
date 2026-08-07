import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const readText = (path) => readFile(new URL(path, import.meta.url), 'utf8')

test('main app flow registers direct ritual flow without question page', async () => {
  const appJson = JSON.parse(await readText('../app.json'))

  assert.deepEqual(appJson.pages, [
    'pages/home/index',
    'pages/xiao-liuren/index',
    'pages/result/index',
    'pages/history/index',
  ])
})

test('main flow page navigation titles match the ritual sequence', async () => {
  const homeJson = JSON.parse(await readText('../pages/home/index.json'))
  const ritualJson = JSON.parse(await readText('../pages/xiao-liuren/index.json'))
  const resultJson = JSON.parse(await readText('../pages/result/index.json'))

  assert.equal(homeJson.navigationBarTitleText, '一念六壬')
  assert.equal(ritualJson.navigationBarTitleText, '小六壬')
  assert.equal(resultJson.navigationBarTitleText, '断课')
})

test('home starts directly on the ritual page without quick-entry routing', async () => {
  const homeSource = await readText('../pages/home/index.ts')

  assert.match(homeSource, /\/pages\/xiao-liuren\/index\?entry=daily/)
  assert.doesNotMatch(homeSource, /handleQuickStart/)
  assert.doesNotMatch(homeSource, /entry=quick/)
  assert.doesNotMatch(homeSource, /\/pages\/question\/index/)
})

test('result page does not encourage immediate repeat questions', async () => {
  const resultMarkup = await readText('../pages/result/index.wxml')
  const resultSource = await readText('../pages/result/index.ts')

  assert.match(resultMarkup, /小六壬断课/)
  assert.doesNotMatch(resultMarkup, /再问一次/)
  assert.doesNotMatch(resultSource, /handleAskAgain/)
  assert.doesNotMatch(resultSource, /entry=quick/)
  assert.doesNotMatch(resultSource, /\/pages\/question\/index/)
})

test('result page supports optional post-result thought note', async () => {
  const resultMarkup = await readText('../pages/result/index.wxml')
  const resultSource = await readText('../pages/result/index.ts')
  const historyMarkup = await readText('../pages/history/index.wxml')

  assert.match(resultMarkup, /记下此念/)
  assert.match(resultMarkup, /仅用于日后回看，不参与起课。/)
  assert.match(resultMarkup, /textarea/)
  assert.match(resultMarkup, /handleThoughtInput/)
  assert.match(resultMarkup, /handleOpenThoughtNote/)
  assert.match(resultMarkup, /handleCloseThoughtNote/)
  assert.match(resultMarkup, /handleSaveThought/)
  assert.match(resultMarkup, /showThoughtNoteCard/)
  assert.match(resultMarkup, /关闭/)
  assert.match(resultSource, /updateHistoryRecord/)
  assert.match(resultSource, /showThoughtNoteCard: false/)
  assert.match(resultSource, /thought_note/)
  assert.match(historyMarkup, /thought_note/)
})

test('thought note panel floats above the keyboard', async () => {
  const resultMarkup = await readText('../pages/result/index.wxml')
  const resultSource = await readText('../pages/result/index.ts')
  const resultStyles = await readText('../pages/result/index.wxss')

  assert.match(resultMarkup, /thought-mask/)
  assert.match(resultMarkup, /keyboardHeight \? keyboardHeight \+ 'px' : '40rpx'/)
  assert.match(resultMarkup, /adjust-position="\{\{false\}\}"/)
  assert.match(resultMarkup, /focus="\{\{showThoughtNoteCard\}\}"/)
  assert.match(resultSource, /wx\.onKeyboardHeightChange/)
  assert.match(resultSource, /keyboardHeight: 0/)
  assert.match(resultStyles, /\.thought-note\s*{[\s\S]*position: fixed;/)
  assert.match(resultStyles, /\.thought-mask/)
})

test('history page shows generated time and supports swipe deletion', async () => {
  const historyMarkup = await readText('../pages/history/index.wxml')
  const historySource = await readText('../pages/history/index.ts')
  const historyStyles = await readText('../pages/history/index.wxss')
  const storageSource = await readText('../services/storage.ts')

  assert.match(historyMarkup, /createdAtText/)
  assert.match(historyMarkup, /history-swipe-row/)
  assert.match(historyMarkup, /bindtouchstart="handleTouchStart"/)
  assert.match(historyMarkup, /bindtouchend="handleTouchEnd"/)
  assert.match(historyMarkup, /delete-action/)
  assert.match(historyMarkup, /catchtap="handleDeleteRecord"/)
  assert.match(historyMarkup, /删除/)

  assert.match(historySource, /formatHistoryCreatedAt/)
  assert.match(historySource, /deleteHistoryRecord/)
  assert.match(historySource, /openedRecordId/)
  assert.match(historySource, /touchStartX/)
  assert.match(historySource, /handleDeleteRecord/)
  assert.match(storageSource, /removeHistoryRecord/)

  assert.match(historyStyles, /translateX\(-154rpx\)/)
  assert.match(historyStyles, /translateX\(-308rpx\)/)
  assert.match(historyStyles, /\.has-card-action/)
  assert.match(historyStyles, /\.delete-action/)
  // 删除键保持低饱和底色，不做刺眼的实心红块
  assert.match(historyStyles, /\.delete-action\s*{[\s\S]*background: rgba\(168, 60, 42, 0\.08\);/)
  assert.doesNotMatch(historyStyles, /background: rgba\(134, 42, 36/)
})

test('history page supports clearing all records with confirmation', async () => {
  const historyMarkup = await readText('../pages/history/index.wxml')
  const historySource = await readText('../pages/history/index.ts')
  const storageSource = await readText('../services/storage.ts')

  assert.match(historyMarkup, /clear-all-button/)
  assert.match(historyMarkup, /handleClearAllRecords/)
  assert.match(historyMarkup, /清除全部记录/)

  assert.match(historySource, /wx\.showModal/)
  assert.match(historySource, /clearHistoryRecords/)
  assert.match(historySource, /clear_history/)
  assert.match(historySource, /删除后不可恢复/)

  assert.match(storageSource, /wx\.removeStorageSync/)
})

test('result page does not collect user profile information', async () => {
  const resultSource = await readText('../pages/result/index.ts')

  assert.doesNotMatch(resultSource, /getUserProfile/)
  assert.doesNotMatch(resultSource, /getUserInfo/)
  assert.doesNotMatch(resultSource, /nickName/)
})

test('result card supports saving both front and back faces', async () => {
  const resultSource = await readText('../pages/result/index.ts')

  assert.match(resultSource, /drawFrontFace/)
  assert.match(resultSource, /drawBackFace/)
  assert.match(resultSource, /drawCardBackground/)
  assert.match(resultSource, /drawCardChrome/)
  assert.match(resultSource, /isCardBackVisible \? 'back' : 'front'/)
  assert.match(resultSource, /cardImagePaths\?\.\[face\]/)
  assert.match(resultSource, /face,/)
  assert.match(resultSource, /getResultCardImagePath\('back'\)/)
  assert.match(resultSource, /cardImagePaths\?\.back/)
})

test('share button width includes its padding so it stays inside the shell', async () => {
  const resultStyles = await readText('../pages/result/index.wxss')

  assert.match(resultStyles, /\.share-button\s*\{[^}]*box-sizing:\s*border-box/)
})

test('home and ritual pages can be forwarded and shared to moments', async () => {
  const homeSource = await readText('../pages/home/index.ts')
  const ritualSource = await readText('../pages/xiao-liuren/index.ts')

  for (const source of [homeSource, ritualSource]) {
    assert.match(source, /onShareAppMessage/)
    assert.match(source, /onShareTimeline/)
    assert.match(source, /buildSharePath/)
    assert.match(source, /buildShareTimelineQuery/)
    assert.match(source, /一念六壬 · 起课问道/)
  }
})

test('result page shares the generated result card image instead of the app entry', async () => {
  const resultMarkup = await readText('../pages/result/index.wxml')
  const resultSource = await readText('../pages/result/index.ts')
  const shareSource = await readText('../services/wx-share.ts')

  assert.match(resultMarkup, /card-save-button/)
  assert.match(resultMarkup, /保存卡片/)
  assert.match(resultMarkup, /resultCardCanvas/)
  assert.match(resultMarkup, />分享断课卡片</)
  assert.match(resultMarkup, /quick-links/)
  assert.match(resultMarkup, /link-item/)
  assert.match(resultMarkup, /问道记录/)
  assert.doesNotMatch(resultMarkup, /open-type="share"/)
  assert.doesNotMatch(resultMarkup, /share-forward-button/)
  assert.doesNotMatch(resultMarkup, /保存分享卡片/)

  assert.match(resultSource, /wx\.showShareImageMenu/)
  assert.match(resultSource, /wx\.saveImageToPhotosAlbum/)
  assert.match(resultSource, /wx\.canvasToTempFilePath/)
  assert.match(resultSource, /buildResultCardImageModel/)
  assert.match(resultSource, /model\.lunarTimeText/)
  assert.match(resultSource, /needShowEntrance: true/)
  assert.match(resultSource, /entrancePath/)

  assert.match(resultSource, /onShareAppMessage/)
  assert.match(resultSource, /onShareTimeline/)
  assert.match(resultSource, /buildSharePath/)
  assert.match(resultSource, /buildShareTimelineQuery/)
  assert.match(resultSource, /channel: 'session'/)
  assert.match(resultSource, /channel: 'timeline'/)
  assert.match(resultSource, /channel: 'image_menu'/)

  assert.match(shareSource, /buildResultCardEntrancePath/)
  assert.match(shareSource, /buildShareTimelineQuery/)
  assert.match(shareSource, /share_scene=timeline/)
  assert.doesNotMatch(shareSource, /thought_note/)
})

test('ritual page title uses silent question copy', async () => {
  const ritualMarkup = await readText('../pages/xiao-liuren/index.wxml')
  const ritualSource = await readText('../pages/xiao-liuren/index.ts')

  assert.match(ritualMarkup, />心中默念所想</)
  assert.doesNotMatch(ritualMarkup, /心中默问起念/)
  assert.doesNotMatch(ritualMarkup, /静心一念，以此刻取月、日、时。/)
  assert.match(ritualSource, /selectionKey: periodKey/)
})

test('home shows the small-question and three-question rule', async () => {
  const homeMarkup = await readText('../pages/home/index.wxml')
  const homeSource = await readText('../pages/home/index.ts')

  assert.match(homeMarkup, /dailyLimitText/)
  assert.match(homeSource, /每日最多三问/)
})

test('home and result pages expose history entry points', async () => {
  const homeMarkup = await readText('../pages/home/index.wxml')
  const homeSource = await readText('../pages/home/index.ts')
  const resultMarkup = await readText('../pages/result/index.wxml')
  const resultSource = await readText('../pages/result/index.ts')

  assert.match(homeMarkup, /问道记录/)
  assert.match(homeMarkup, /handleOpenHistory/)
  assert.match(homeSource, /\/pages\/history\/index/)
  assert.match(resultMarkup, /问道记录/)
  assert.match(resultMarkup, /handleOpenHistory/)
  assert.match(resultSource, /\/pages\/history\/index/)
})

test('result page shows a symbolic front card that flips to interpretation', async () => {
  const resultMarkup = await readText('../pages/result/index.wxml')
  const resultSource = await readText('../pages/result/index.ts')
  const resultStyles = await readText('../pages/result/index.wxss')

  assert.match(resultMarkup, /result-card-shell/)
  assert.match(resultMarkup, /bindtap="handleToggleCardFace"/)
  assert.match(resultMarkup, /{{symbolTone}}/)
  assert.match(resultMarkup, /{{isCardBackVisible \? 'flipped' : ''}}/)
  assert.match(resultMarkup, /card-face card-front/)
  assert.match(resultMarkup, /result-symbol/)
  assert.match(resultMarkup, /symbol-char/)
  assert.match(resultMarkup, /wx:for="{{symbolChars}}"/)
  assert.match(resultMarkup, /{{record\.rule_result\.symbol}}/)
  assert.match(resultMarkup, /result-lunar-time/)
  assert.match(resultMarkup, /{{lunarTimeText}}/)
  assert.match(resultMarkup, /card-face card-back/)
  assert.match(resultMarkup, /card-back-bg/)
  assert.match(resultMarkup, /src="{{cardBackImage}}"/)
  assert.match(resultMarkup, /card-back-veil/)
  assert.match(resultMarkup, /card-back-content/)
  assert.match(resultMarkup, /record\.interpretation\.oracleText/)
  assert.match(resultMarkup, /record\.interpretation\.explanation/)
  assert.match(resultMarkup, /catchtap="handleSavePoster"/)
  assert.match(resultMarkup, /flip-hint/)
  assert.match(resultMarkup, /轻点卡面 · 翻看断课/)
  assert.match(resultMarkup, /轻点卡面 · 翻回宫位/)

  assert.match(resultSource, /SYMBOL_TONES/)
  assert.match(resultSource, /isCardBackVisible: false/)
  assert.match(resultSource, /splitResultSymbol/)
  assert.match(resultSource, /symbolChars/)
  assert.match(resultSource, /lunarTimeText/)
  assert.match(resultSource, /formatLunarTimeText/)
  assert.match(resultSource, /symbolTone/)
  assert.match(resultSource, /getResultCardBackImage/)
  assert.match(resultSource, /cardBackImage/)
  assert.match(resultSource, /handleToggleCardFace/)
  for (const symbol of ['大安', '留连', '速喜', '赤口', '小吉', '空亡']) {
    assert.match(resultSource, new RegExp(symbol))
  }

  assert.match(resultStyles, /rotateY/)
  assert.match(resultStyles, /backface-visibility/)
  assert.match(resultStyles, /\.flip-hint/)
  assert.match(resultStyles, /\.result-page\s*{[\s\S]*padding: 20rpx 16rpx 48rpx;/)
  assert.match(resultStyles, /\.result-card-shell\s*{[\s\S]*width: 100%;[\s\S]*height: 78vh;[\s\S]*min-height: 820rpx;/)
  assert.match(resultStyles, /\.card-face\s*{[\s\S]*padding: 44rpx 42rpx;/)
  assert.match(resultStyles, /\.front-content\s*{[\s\S]*position: absolute;[\s\S]*top: 50%;[\s\S]*left: 50%;[\s\S]*transform: translate\(-50%, -50%\);/)
  assert.match(resultStyles, /\.result-symbol\s*{[\s\S]*flex-direction: column;[\s\S]*gap: 28rpx;/)
  assert.match(resultStyles, /\.result-lunar-time\s*{[\s\S]*position: absolute;[\s\S]*bottom: 52rpx;[\s\S]*text-align: center;/)
  for (const toneClass of ['tone-da-an', 'tone-liu-lian', 'tone-su-xi', 'tone-chi-kou', 'tone-xiao-ji', 'tone-kong-wang']) {
    assert.match(resultStyles, new RegExp(`\\.${toneClass} \\.card-face`))
    assert.match(resultStyles, new RegExp(`\\.${toneClass} \\.card-back`))
  }

  assert.doesNotMatch(resultStyles, /^\.card-back\s*{[^}]*background:/m)
  assert.match(resultStyles, /^\.card-back\s*{[^}]*display: flex;[^}]*flex-direction: column;/m)
  assert.match(resultStyles, /\.card-back-bg[^{]*{[^}]*position: absolute;/)
  assert.match(resultStyles, /\.card-back-veil\s*{[^}]*background: linear-gradient\(180deg, rgba\(247, 242, 231, 0\.52\) 0%, rgba\(239, 232, 215, 0\.62\) 100%\);/)
  assert.match(resultStyles, /\.card-back-content\s*{[^}]*flex: 1;[^}]*overflow-y: auto;/)
  assert.match(resultStyles, /^\.text\s*{[^}]*margin-top: auto;/m)
  assert.match(resultStyles, /^\.disclaimer\s*{[^}]*margin-top: auto;/m)
})

// 首页太极章与起念页圆环都只是「细线圆环 + 宋体字」，不加提示会读成装饰印章而非可点控件。
test('home and ritual entries advertise that they are tappable', async () => {
  const homeMarkup = await readText('../pages/home/index.wxml')
  const homeStyles = await readText('../pages/home/index.wxss')
  const ritualMarkup = await readText('../pages/xiao-liuren/index.wxml')
  const ritualStyles = await readText('../pages/xiao-liuren/index.wxss')

  assert.match(homeMarkup, /entry-hint/)
  assert.match(homeMarkup, /轻点太极 · 起课问道/)
  assert.match(ritualMarkup, /action-hint/)
  assert.match(ritualMarkup, /轻点起念 · 落课成断/)

  // 扩散涟漪，不是此前几乎不可见的静态光晕
  assert.match(homeStyles, /@keyframes seal-ripple/)
  assert.match(homeStyles, /\.seal-ring::after/)
  assert.match(ritualStyles, /@keyframes circle-ripple/)
  assert.match(ritualStyles, /\.circle::after/)
  assert.doesNotMatch(homeStyles, /seal-breathe/)

  // 双圈错开半个周期：单圈淡出后不能出现「没有任何动静」的空档
  assert.match(homeStyles, /\.seal-ring::before/)
  assert.match(homeStyles, /\.seal-ring::before\s*{[^}]*animation-delay: -1\.2s;/)
  assert.match(ritualStyles, /\.circle::before/)
  assert.match(ritualStyles, /\.circle::before\s*{[^}]*animation-delay: -1\.2s;/)

  // 主体自身起伏，可点提示不能全压在外圈一条线上
  assert.match(homeStyles, /@keyframes taiji-pulse/)
  assert.match(homeStyles, /\.bagua-image\s*{[^}]*animation: taiji-pulse/)
  assert.match(ritualStyles, /@keyframes circle-pulse/)
  assert.match(ritualStyles, /^\.circle\s*{[^}]*animation: circle-pulse/m)

  // 起课过程中让位给旋转环，避免两圈动效打架；圆心走数字时起伏会读成抖动
  assert.match(ritualMarkup, /wx:if="{{!isDivining}}"/)
  assert.match(ritualStyles, /\.active \.circle::after\s*{[^}]*animation: none;/)
  assert.match(ritualStyles, /^\.active \.circle\s*{[^}]*animation: none;/m)

  // 提示语需重于页脚小注，否则读成脚注
  assert.match(homeStyles, /\.entry-hint\s*{[^}]*color: #6b675c;/)
  assert.match(ritualStyles, /\.action-hint\s*{[^}]*color: #6b675c;/)
})

test('ritual page offers an optional thought note line saved with the record', async () => {
  const ritualMarkup = await readText('../pages/xiao-liuren/index.wxml')
  const ritualSource = await readText('../pages/xiao-liuren/index.ts')
  const ritualStyles = await readText('../pages/xiao-liuren/index.wxss')

  assert.match(ritualMarkup, /note-entry/)
  assert.match(ritualMarkup, /note-input/)
  assert.match(ritualMarkup, /此念/)
  assert.match(ritualMarkup, /仅本机可见/)
  assert.match(ritualMarkup, /maxlength="60"/)
  assert.match(ritualMarkup, /仅存本机，不上传/)
  assert.match(ritualSource, /handleNoteInput/)
  assert.match(ritualSource, /noteFocused/)
  assert.match(ritualSource, /questionText: thoughtNote/)
  assert.match(ritualSource, /thought_note: thoughtNote/)
  assert.match(ritualStyles, /\.note-entry/)
  assert.match(ritualStyles, /\.note-placeholder/)
})

test('ritual page teaches how to ask before showing the result', async () => {
  const ritualMarkup = await readText('../pages/xiao-liuren/index.wxml')

  assert.match(ritualMarkup, /请在心中默问一件小事，一个方向。/)
  assert.match(ritualMarkup, /宜问：这件事今天推进，是否合适？/)
  assert.match(ritualMarkup, /不宜问：我应该怎么办？/)
  assert.match(ritualMarkup, /不以玩笑试探，不反复追问同一事。/)
})

test('占前须知移到起念页，三不占作横线行、无解释', async () => {
  const homeMarkup = await readText('../pages/home/index.wxml')
  const homeSource = await readText('../pages/home/index.ts')
  const homeStyles = await readText('../pages/home/index.wxss')
  const ritualMarkup = await readText('../pages/xiao-liuren/index.wxml')
  const ritualStyles = await readText('../pages/xiao-liuren/index.wxss')

  // 起念页：三不占与「遇事不决，六壬决断」同款横线行，紧随其后
  assert.match(ritualMarkup, /遇事不决，六壬决断[\s\S]*?不诚不占/)
  assert.match(ritualMarkup, /rules-row/)
  assert.match(ritualMarkup, /不诚不占/)
  assert.match(ritualMarkup, /不疑不占/)
  assert.match(ritualMarkup, /不义不占/)
  assert.match(ritualStyles, /\.rules-row\s*{[^}]*display:\s*flex/)
  assert.match(ritualStyles, /\.rules-text/)

  // 只占位一行：无标题栏、无解释文字、无三行版式
  assert.doesNotMatch(ritualMarkup, /占前须知/)
  assert.doesNotMatch(ritualMarkup, /心不诚/)
  assert.doesNotMatch(ritualMarkup, /事无疑/)
  assert.doesNotMatch(ritualMarkup, /所问不义/)
  assert.doesNotMatch(ritualMarkup, /rule-text/)
  assert.doesNotMatch(ritualStyles, /\.rule-text/)

  // 首页：整块移除，连样式与数据都不留
  assert.doesNotMatch(homeMarkup, /占前须知/)
  assert.doesNotMatch(homeMarkup, /rules-panel/)
  assert.doesNotMatch(homeSource, /ritualRules/)
  assert.doesNotMatch(homeStyles, /\.rule-row/)
})

test('ritual page starts divination instead of asking user to view result', async () => {
  const ritualMarkup = await readText('../pages/xiao-liuren/index.wxml')

  assert.match(ritualMarkup, /{{isDivining \? '起课中' : '起念'}}/)
  assert.match(ritualMarkup, /起课中/)
  assert.doesNotMatch(ritualMarkup, /起念中/)
  assert.doesNotMatch(ritualMarkup, /解卦中/)
  assert.doesNotMatch(ritualMarkup, /开始起念/)
  assert.doesNotMatch(ritualMarkup, /<view class="inner">问<\/view>/)
  assert.doesNotMatch(ritualMarkup, /查看结果/)
})

test('ritual page shows a center spinning wait state before auto navigating', async () => {
  const ritualMarkup = await readText('../pages/xiao-liuren/index.wxml')
  const ritualStyles = await readText('../pages/xiao-liuren/index.wxss')
  const ritualSource = await readText('../pages/xiao-liuren/index.ts')

  assert.match(ritualMarkup, /spinning-ring/)
  assert.match(ritualMarkup, /count-symbol/)
  assert.match(ritualMarkup, /{{countSymbol}}/)
  assert.doesNotMatch(ritualMarkup, /liuren-hand/)
  assert.doesNotMatch(ritualMarkup, /handPalaces/)
  assert.doesNotMatch(ritualMarkup, /hand-palace/)
  assert.doesNotMatch(ritualMarkup, /palace-name/)
  assert.doesNotMatch(ritualMarkup, /palace-number/)
  assert.doesNotMatch(ritualMarkup, /大安|留连|速喜|赤口|小吉|空亡/)
  assert.doesNotMatch(ritualSource, /LIUREN_HAND_PALACES/)
  assert.doesNotMatch(ritualSource, /activePalaceIndex/)
  assert.match(ritualStyles, /@keyframes spin/)
  assert.match(ritualStyles, /\.ritual-action\s*{[\s\S]*width: 336rpx;[\s\S]*height: 336rpx;/)
  assert.match(ritualStyles, /\.spinning-ring\s*{[\s\S]*width: 328rpx;[\s\S]*height: 328rpx;/)
  assert.doesNotMatch(ritualStyles, /liuren-hand/)
  assert.doesNotMatch(ritualStyles, /hand-palace/)
  assert.doesNotMatch(ritualStyles, /palacePulse/)
  assert.match(ritualSource, /buildXiaoLiurenCountPath/)
  assert.match(ritualSource, /XIAO_LIUREN_COUNT_SEQUENCE/)
  assert.match(ritualSource, /buildCountStepDelays/)
  assert.match(ritualSource, /runCountAnimation/)
  assert.doesNotMatch(ritualSource, /}, 1200\)/)
  assert.match(ritualSource, /isDivining/)
  assert.match(ritualSource, /setTimeout/)
  assert.match(
    ritualSource,
    /this\.runCountAnimation\(countPath, \(\) => \{[\s\S]*this\.navigateToResult\(url\)/
  )
  assert.match(ritualSource, /navigateToResult\(url: string\) {[\s\S]*wx\.navigateTo\(\{[\s\S]*fail: \(\) => \{[\s\S]*wx\.redirectTo/)
  assert.match(ritualSource, /this\.setData\(\{ isDivining: false, countSymbol: '', questionText: '', noteFocused: false \}\)/)
  assert.match(ritualSource, /\/pages\/result\/index/)
})

test('every divination creates its own record, even on a same-period repeat', async () => {
  const ritualSource = await readText('../pages/xiao-liuren/index.ts')

  assert.match(ritualSource, /resolveDivinationAttempt/)
  assert.match(ritualSource, /attempt\.outcome === 'limit'/)
  assert.doesNotMatch(ritualSource, /attempt\.outcome === 'repeat'/)
  assert.match(ritualSource, /attempt\.isRepeat/)

  // 重复起念同样走完整起课链路：新记录、写历史、计次数
  assert.match(ritualSource, /saveHistoryRecord\(record\)/)
  assert.match(ritualSource, /recordDailyDivination/)
  assert.match(ritualSource, /thought_note: thoughtNote/)
  assert.match(ritualSource, /period_key: periodKey/)

  // 重复仅作为展示提示带给结果页
  assert.match(ritualSource, /attempt\.isRepeat \? '\/pages\/result\/index\?repeat=1' : '\/pages\/result\/index'/)
  assert.match(ritualSource, /repeat_divination/)
  assert.match(ritualSource, /今日三问已满/)
})

test('result page shows a transient notice for repeated periods', async () => {
  const resultMarkup = await readText('../pages/result/index.wxml')
  const resultSource = await readText('../pages/result/index.ts')

  assert.match(resultMarkup, /showRepeatNotice/)
  assert.match(resultMarkup, /此时辰已取过象，结果与前次相同，不妨换个时辰再问。/)
  assert.match(resultSource, /options\?\.repeat === '1'/)
  assert.doesNotMatch(resultSource, /askdao_repeat_notice/)
})

test('result disclaimer stays short and does not explain the calculation', async () => {
  const templatesSource = await readText('../domain/interpretation/templates.ts')

  assert.match(templatesSource, /仅供传统文化体验与自我参考。/)
  assert.doesNotMatch(templatesSource, /不作为现实决策的唯一依据/)
})
