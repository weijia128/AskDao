import { track } from '../../services/analytics'
import { getHistoryRecords } from '../../services/storage'

Page({
  data: {
    records: [],
  },

  onShow() {
    const records = getHistoryRecords()
    this.setData({ records })
    track('view_history', { count: records.length })
  },
})
