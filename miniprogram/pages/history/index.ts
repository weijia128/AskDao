import { track } from '../../services/analytics'
import {
  clearHistoryRecords,
  deleteHistoryRecord,
  formatHistoryCreatedAt,
  getHistoryRecords,
} from '../../services/storage'

const SWIPE_OPEN_THRESHOLD = 48
const SWIPE_CLOSE_THRESHOLD = 24

function buildDisplayRecords(records) {
  return records.map((record) => ({
    ...record,
    createdAtText: formatHistoryCreatedAt(record?.rule_result?.created_at || record?.created_at || ''),
  }))
}

Page({
  data: {
    records: [],
    openedRecordId: '',
    touchStartX: 0,
    touchRecordId: '',
  },

  onShow() {
    this.refreshRecords()
  },

  refreshRecords() {
    const records = buildDisplayRecords(getHistoryRecords())
    this.setData({
      records,
      openedRecordId: '',
      touchStartX: 0,
      touchRecordId: '',
    })
    track('view_history', { count: records.length })
  },

  handleTouchStart(event) {
    const touch = event.touches?.[0]
    this.setData({
      touchStartX: touch?.clientX || 0,
      touchRecordId: event.currentTarget?.dataset?.id || '',
    })
  },

  handleTouchEnd(event) {
    const touch = event.changedTouches?.[0]
    const recordId = this.data.touchRecordId
    if (!touch || !recordId) {
      return
    }

    const deltaX = touch.clientX - this.data.touchStartX
    if (deltaX < -SWIPE_OPEN_THRESHOLD) {
      this.setData({ openedRecordId: recordId })
      return
    }

    if (deltaX > SWIPE_CLOSE_THRESHOLD) {
      this.setData({ openedRecordId: '' })
    }
  },

  handleDeleteRecord(event) {
    const recordId = event.currentTarget?.dataset?.id
    if (!recordId) {
      return
    }

    const records = buildDisplayRecords(deleteHistoryRecord(recordId))
    this.setData({
      records,
      openedRecordId: '',
      touchStartX: 0,
      touchRecordId: '',
    })
    wx.showToast({ title: '已删除', icon: 'success' })
  },

  handleClearAllRecords() {
    const count = this.data.records.length
    if (!count) {
      return
    }

    wx.showModal({
      title: '清除全部记录',
      content: '将删除本机保存的全部问道记录（含此念笔记），删除后不可恢复。',
      confirmText: '全部清除',
      confirmColor: '#8f2e25',
      success: (res) => {
        if (!res.confirm) {
          return
        }

        clearHistoryRecords()
        this.setData({
          records: [],
          openedRecordId: '',
          touchStartX: 0,
          touchRecordId: '',
        })
        track('clear_history', { count })
        wx.showToast({ title: '已清除', icon: 'success' })
      },
    })
  },
})
