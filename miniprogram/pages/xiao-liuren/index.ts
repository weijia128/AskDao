import { runXiaoLiurenDivination } from '../../application/divination-service'
import {
  buildCountStepDelays,
  buildXiaoLiurenCountPath,
  XIAO_LIUREN_COUNT_SEQUENCE,
} from '../../domain/rules/xiao-liuren'
import { saveHistoryRecord } from '../../services/storage'
import { track } from '../../services/analytics'
import { canStartDailyDivination, recordDailyDivination } from '../../services/daily-limit.core'

const ANIMATION_SETTLE_MS = 450

Page({
  data: {
    entry: 'daily',
    questionType: 'daily_state',
    questionText: '',
    isDivining: false,
    countSymbol: '',
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

  async handleDivine() {
    if (this.data.isDivining) {
      return
    }

    if (!canStartDailyDivination(wx)) {
      wx.showModal({
        title: '今日三问已满',
        content: '问道重在一念，不宜反复试探。明日再来，取新的时机。',
        showCancel: false,
      })
      return
    }

    const startedAt = new Date().toISOString()
    this.setData({ isDivining: true })
    track('start_divination', { method: 'xiao_liuren' })

    const result = await runXiaoLiurenDivination({
      method: 'xiao_liuren',
      questionType: this.data.questionType,
      questionText: this.data.questionText,
      startedAt,
      timezone: 'Asia/Shanghai',
      source: this.data.entry,
    })

    if (!result.ok) {
      wx.showModal({
        title: '暂不适合问道',
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
      is_favorite: false,
    }

    wx.setStorageSync('askdao_latest_result', record)
    saveHistoryRecord(record)
    recordDailyDivination(wx)
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
      this.setData({ isDivining: false, countSymbol: '' })
      wx.navigateTo({ url: '/pages/result/index' })
    })
  },
})
