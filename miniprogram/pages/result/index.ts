import { buildSharePosterModel } from '../../application/poster-service'
import { track } from '../../services/analytics'

Page({
  data: {
    record: null,
  },

  onLoad() {
    const record = wx.getStorageSync('askdao_latest_result')
    this.setData({ record })
    track('page_view', { page: 'result' })
    if (record) {
      track('view_result', {
        symbol: record.rule_result.symbol,
        grade: record.rule_result.grade,
        question_type: record.question_type,
      })
    }
  },

  handleSavePoster() {
    const poster = buildSharePosterModel(this.data.record.rule_result, this.data.record.interpretation)
    wx.setStorageSync('askdao_latest_poster', poster)
    track('save_poster', {
      template_id: poster.template_id,
      symbol: poster.symbol,
      grade: poster.grade,
    })
    wx.showToast({ title: '卡片已生成', icon: 'success' })
  },

  handleAskAgain() {
    wx.navigateTo({ url: '/pages/question/index?entry=quick' })
  },
})
