import { runXiaoLiurenDivination } from '../../application/divination-service'
import { resolveDivinationAttempt } from '../../application/divination-flow.core'
import {
  buildDivinationPeriodKey,
  buildCountStepDelays,
  buildXiaoLiurenCountPath,
  XIAO_LIUREN_COUNT_SEQUENCE,
} from '../../domain/rules/xiao-liuren'
import { getCurrentChineseHour } from '../../domain/calendar/chinese-hour'
import { saveHistoryRecord } from '../../services/storage'
import { track } from '../../services/analytics'
import { getDailyDivinationUsage, recordDailyDivination } from '../../services/daily-limit.core'
import { buildSharePath, buildShareTimelineQuery } from '../../services/wx-share'

const ANIMATION_SETTLE_MS = 450

Page({
  data: {
    entry: 'daily',
    questionType: 'daily_state',
    questionText: '',
    isDivining: false,
    countSymbol: '',
    noteFocused: false,
  },

  countTimer: 0,

  onLoad(options) {
    this.setData({
      entry: options?.entry || 'daily',
      questionType: options?.question_type || 'daily_state',
      questionText: decodeURIComponent(options?.question_text || ''),
    })
    track('page_view', { page: 'xiao-liuren', source: this.data.entry })
  },

  onUnload() {
    this.clearCountTimer()
  },

  clearCountTimer() {
    if (this.countTimer) {
      clearTimeout(this.countTimer)
      this.countTimer = 0
    }
  },

  runCountAnimation(countPath: number[], onComplete: () => void) {
    this.clearCountTimer()
    const delays = buildCountStepDelays(countPath.length)
    let step = 0

    const tick = () => {
      if (step >= delays.length) {
        this.countTimer = setTimeout(() => {
          this.countTimer = 0
          onComplete()
        }, ANIMATION_SETTLE_MS)
        return
      }

      this.setData({
        countSymbol: XIAO_LIUREN_COUNT_SEQUENCE[step % XIAO_LIUREN_COUNT_SEQUENCE.length],
      })
      this.countTimer = setTimeout(tick, delays[step])
      step += 1
    }

    tick()
  },

  // 跳转后再重置起课态：让落宫宫位在页面转场期间保持显示，流程不断帧。
  // 同时清空此念：从结果页返回起念页时应是全新一问，不残留上次的输入。
  navigateToResult(url: string) {
    wx.navigateTo({
      url,
      fail: () => {
        // navigateTo 静默失败时降级 redirectTo，保证流程不中断
        wx.redirectTo({ url })
      },
    })
    setTimeout(() => {
      this.setData({ isDivining: false, countSymbol: '', questionText: '', noteFocused: false })
    }, 400)
  },

  handleNoteInput(event) {
    this.setData({ questionText: event.detail.value })
  },

  handleNoteFocus() {
    this.setData({ noteFocused: true })
  },

  handleNoteBlur() {
    this.setData({ noteFocused: false })
  },

  async handleDivine() {
    if (this.data.isDivining) {
      return
    }

    const startedAtDate = new Date()
    const hour = getCurrentChineseHour(startedAtDate)
    const periodKey = buildDivinationPeriodKey(startedAtDate, hour.index)
    const latestRecord = wx.getStorageSync('askdao_latest_result')
    const usage = getDailyDivinationUsage(wx, startedAtDate)
    const attempt = resolveDivinationAttempt({ periodKey, latestRecord, dailyUsage: usage })

    if (attempt.outcome === 'limit') {
      wx.showModal({
        title: '今日三问已满',
        content: '问道重在一念，不宜反复试探。明日再来，取新的时机。',
        showCancel: false,
      })
      return
    }

    const startedAt = startedAtDate.toISOString()
    const thoughtNote = this.data.questionText.trim()
    this.setData({ isDivining: true })

    if (attempt.isRepeat) {
      // 同时辰再起一念：照常起课存档计次，仅提示结果与前次相同
      track('repeat_divination', { symbol: latestRecord?.rule_result?.symbol })
    }
    track('start_divination', { method: 'xiao_liuren' })

    const result = await runXiaoLiurenDivination({
      method: 'xiao_liuren',
      questionType: this.data.questionType,
      questionText: thoughtNote,
      startedAt,
      timezone: 'Asia/Shanghai',
      source: this.data.entry,
      variantIndex: usage.count,
      selectionKey: periodKey,
    })

    if (!result.ok) {
      wx.showModal({
        title: result.type === 'unsupported_date' ? '暂不支持当前日期' : '暂不适合问道',
        content: result.risk.message,
        showCancel: false,
      })
      this.setData({ isDivining: false })
      return
    }

    const record = {
      id: `${Date.now()}`,
      rule_result: result.ruleResult,
      interpretation: result.interpretation,
      poster_template_id: 'A01',
      question_type: this.data.questionType,
      created_at: result.ruleResult.created_at,
      period_key: periodKey,
      thought_note: thoughtNote,
      is_favorite: false,
    }

    wx.setStorageSync('askdao_latest_result', record)
    saveHistoryRecord(record)
    recordDailyDivination(wx, startedAtDate)
    track('complete_divination', {
      symbol: result.ruleResult.symbol,
      grade: result.ruleResult.grade,
      rule_version: result.ruleResult.rule_version,
    })

    const countPath = buildXiaoLiurenCountPath({
      lunarMonth: result.ruleResult.input_snapshot.lunar_month,
      lunarDay: result.ruleResult.input_snapshot.lunar_day,
      hourIndex: result.ruleResult.input_snapshot.hour_index,
    })

    this.runCountAnimation(countPath, () => {
      const url = attempt.isRepeat ? '/pages/result/index?repeat=1' : '/pages/result/index'
      this.navigateToResult(url)
    })
  },

  onShareAppMessage() {
    track('share_click', { channel: 'session', page: 'ritual' })
    return {
      title: '一念六壬 · 起课问道',
      path: buildSharePath(),
    }
  },

  onShareTimeline() {
    track('share_click', { channel: 'timeline', page: 'ritual' })
    return {
      title: '一念六壬 · 起课问道',
      query: buildShareTimelineQuery(),
    }
  },
})
