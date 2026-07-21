import { runXiaoLiurenDivination } from '../../application/divination-service'
import { saveHistoryRecord } from '../../services/storage'
import { track } from '../../services/analytics'

Page({
  data: {
    entry: 'daily',
    questionType: 'daily_state',
    questionText: '',
  },

  onLoad(options) {
    this.setData({
      entry: options?.entry || 'daily',
      questionType: options?.question_type || 'daily_state',
      questionText: decodeURIComponent(options?.question_text || ''),
    })
    track('page_view', { page: 'xiao-liuren', source: this.data.entry })
  },

  async handleDivine() {
    track('start_divination', { method: 'xiao_liuren' })

    const result = await runXiaoLiurenDivination({
      method: 'xiao_liuren',
      questionType: this.data.questionType,
      questionText: this.data.questionText,
      startedAt: new Date().toISOString(),
      timezone: 'Asia/Shanghai',
      source: this.data.entry,
    })

    if (!result.ok) {
      wx.showModal({
        title: '暂不适合问道',
        content: result.risk.message,
        showCancel: false,
      })
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
    track('complete_divination', {
      symbol: result.ruleResult.symbol,
      grade: result.ruleResult.grade,
      rule_version: result.ruleResult.rule_version,
    })
    wx.navigateTo({ url: '/pages/result/index' })
  },
})
