import { ritualRule, ritualRuleHint } from '../../design/copywriting'
import { track } from '../../services/analytics'

Page({
  data: {
    ritualRule,
    ritualRuleHint,
    dailySymbol: '大安',
    dailyGrade: '顺',
    dailyHint: '宜稳中求进，不宜急躁。',
    dailyQuestion: '今天有什么事情值得重新观察？',
  },

  onLoad(options) {
    track('page_view', { page: 'home', source: options?.source || 'direct' })
    track('view_daily_ritual', { daily_symbol: this.data.dailySymbol, daily_grade: this.data.dailyGrade })
  },

  handleStart() {
    track('click_start', { entry: 'daily' })
    wx.navigateTo({ url: '/pages/question/index?entry=daily' })
  },

  handleQuickStart() {
    track('click_start', { entry: 'quick' })
    wx.navigateTo({ url: '/pages/question/index?entry=quick' })
  },
})
