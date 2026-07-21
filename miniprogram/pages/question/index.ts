import { questionTypes } from '../../design/copywriting'
import { track } from '../../services/analytics'

Page({
  data: {
    entry: 'daily',
    questionTypes,
    selectedType: 'daily_state',
    questionText: '',
  },

  onLoad(options) {
    const entry = options?.entry === 'quick' ? 'quick' : 'daily'
    this.setData({ entry })
    track('page_view', { page: 'question', source: entry })
  },

  handleSelectType(event) {
    const selectedType = event.currentTarget.dataset.value
    this.setData({ selectedType })
    track('select_question_type', { question_type: selectedType })
  },

  handleInput(event) {
    this.setData({ questionText: event.detail.value })
  },

  handleContinue() {
    const query = `entry=${this.data.entry}&question_type=${this.data.selectedType}&question_text=${encodeURIComponent(this.data.questionText)}`
    wx.navigateTo({ url: `/pages/xiao-liuren/index?${query}` })
  },
})
