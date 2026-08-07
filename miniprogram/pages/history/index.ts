import { track } from '../../services/analytics'
import {
  clearHistoryRecords,
  deleteHistoryRecord,
  formatHistoryCreatedAt,
  getHistoryRecords,
  syncLatestResultRecord,
  updateHistoryRecord,
} from '../../services/storage'
import {
  buildVerificationPatch,
  getVerificationLabel,
  summarizeVerifications,
} from '../../domain/verification/verification'
import {
  buildVerificationCardModel,
  VERIFICATION_CARD_CODE_SLOT,
  VERIFICATION_CARD_HEIGHT,
  VERIFICATION_CARD_TONE,
  VERIFICATION_CARD_WIDTH,
} from '../../services/verification-card-image.core'
import {
  buildVerificationRecordCardModel,
  canExportVerificationCard,
  drawVerificationRecordCard,
  VERIFICATION_RECORD_CARD_HEIGHT,
  VERIFICATION_RECORD_CARD_WIDTH,
} from '../../services/verification-record-card.core'

const SWIPE_OPEN_THRESHOLD = 48
const SWIPE_CLOSE_THRESHOLD = 24
const SWIPE_TAP_TOLERANCE = 10
const VERIFICATION_CARD_CANVAS_ID = 'verificationCardCanvas'

// 记录页直接改状态：窗口只决定首页何时主动追问，不锁定数据。
// 「尚未分晓」在这里固定落到 deferred，让它日后仍可被追问。
const VERIFICATION_ACTIONS = [
  { label: '应验', status: 'fulfilled' },
  { label: '未应验', status: 'unfulfilled' },
  { label: '尚未分晓', status: 'deferred' },
]

function buildDisplayRecords(records) {
  return records.map((record) => ({
    ...record,
    createdAtText: formatHistoryCreatedAt(record?.rule_result?.created_at || record?.created_at || ''),
    verificationText: getVerificationLabel(record),
  }))
}

Page({
  data: {
    records: [],
    summary: { fulfilled: 0, unfulfilled: 0, unclear: 0, deferred: 0, settled: 0, total: 0, rate: 0 },
    openedRecordId: '',
    touchStartX: 0,
    touchRecordId: '',
    isBuildingCard: false,
    showCardPreview: false,
    previewCardPath: '',
    previewCardSymbol: '',
    previewRecordId: '',
  },

  onShow() {
    this.refreshRecords()
  },

  refreshRecords() {
    const rawRecords = getHistoryRecords()
    const records = buildDisplayRecords(rawRecords)
    this.setData({
      records,
      summary: summarizeVerifications(rawRecords),
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
    // 横向滑动之后紧跟着会冒出一次 tap，别让它误开状态选择面板
    this.swipedRecently = Math.abs(deltaX) > SWIPE_TAP_TOLERANCE

    if (deltaX < -SWIPE_OPEN_THRESHOLD) {
      this.setData({ openedRecordId: recordId })
      return
    }

    if (deltaX > SWIPE_CLOSE_THRESHOLD) {
      this.setData({ openedRecordId: '' })
    }
  },

  handleEditVerification(event) {
    const recordId = event.currentTarget?.dataset?.id
    if (!recordId || this.swipedRecently) {
      return
    }

    if (this.data.openedRecordId) {
      this.setData({ openedRecordId: '' })
      return
    }

    const record = this.data.records.find((item) => item.id === recordId)
    if (!record) {
      return
    }

    // 已应验的记录点按直接看验课卡，不再弹状态问询；改状态入口收在卡片预览里
    if (record?.verification?.status === 'fulfilled') {
      this.saveRecordCard(recordId)
      return
    }

    this.openVerificationSheet(recordId)
  },

  openVerificationSheet(recordId) {
    wx.showActionSheet({
      itemList: VERIFICATION_ACTIONS.map((action) => action.label),
      success: (res) => {
        const action = VERIFICATION_ACTIONS[res.tapIndex]
        if (action) {
          this.applyVerification(recordId, action.status)
        }
      },
      fail: () => {},
    })
  },

  applyVerification(recordId, status) {
    const patch = buildVerificationPatch(status)
    const rawRecords = updateHistoryRecord(recordId, patch)
    syncLatestResultRecord(recordId, patch)

    this.setData({
      records: buildDisplayRecords(rawRecords),
      summary: summarizeVerifications(rawRecords),
      openedRecordId: '',
    })
    track('mark_verification', { status, source: 'history' })

    if (status === 'fulfilled') {
      // 应验的瞬间是分享动机最强的时刻，直接出验课卡预览，存不存由卡片上的按钮决定
      wx.showToast({ title: '已记下应验', icon: 'none' })
      this.saveRecordCard(recordId)
      return
    }

    wx.showToast({ title: '已更新', icon: 'none' })
  },

  handleDeleteRecord(event) {
    const recordId = event.currentTarget?.dataset?.id
    if (!recordId) {
      return
    }

    const rawRecords = deleteHistoryRecord(recordId)
    this.setData({
      records: buildDisplayRecords(rawRecords),
      summary: summarizeVerifications(rawRecords),
      openedRecordId: '',
      touchStartX: 0,
      touchRecordId: '',
    })
    wx.showToast({ title: '已删除', icon: 'success' })
  },

  drawVerificationCard(ctx, model) {
    const background = ctx.createLinearGradient(0, 0, 0, VERIFICATION_CARD_HEIGHT)
    background.addColorStop(0, VERIFICATION_CARD_TONE.gradientFrom)
    background.addColorStop(1, VERIFICATION_CARD_TONE.gradientTo)
    ctx.setFillStyle(background)
    ctx.fillRect(0, 0, VERIFICATION_CARD_WIDTH, VERIFICATION_CARD_HEIGHT)

    const glow = ctx.createCircularGradient(
      VERIFICATION_CARD_WIDTH / 2,
      VERIFICATION_CARD_HEIGHT * 0.4,
      VERIFICATION_CARD_WIDTH * 0.55,
    )
    glow.addColorStop(0, VERIFICATION_CARD_TONE.glow)
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.setFillStyle(glow)
    ctx.fillRect(0, 0, VERIFICATION_CARD_WIDTH, VERIFICATION_CARD_HEIGHT)

    ctx.setStrokeStyle(VERIFICATION_CARD_TONE.border)
    ctx.setLineWidth(1)
    ctx.strokeRect(28, 34, VERIFICATION_CARD_WIDTH - 56, VERIFICATION_CARD_HEIGHT - 68)
    ctx.setStrokeStyle('rgba(255, 246, 216, 0.14)')
    ctx.strokeRect(38, 44, VERIFICATION_CARD_WIDTH - 76, VERIFICATION_CARD_HEIGHT - 88)

    ctx.setFillStyle('rgba(255, 246, 216, 0.92)')
    ctx.setFontSize(20)
    ctx.fillText(model.brand, 48, 72)

    ctx.setFillStyle('rgba(255, 246, 216, 0.66)')
    ctx.setFontSize(15)
    ctx.fillText(model.title, 48, 106)

    ctx.setTextAlign('center')
    ctx.setFillStyle('#fff6d8')
    ctx.setFontSize(96)
    ctx.fillText(model.rateText, VERIFICATION_CARD_WIDTH / 2, 268)

    ctx.setFillStyle('rgba(255, 246, 216, 0.66)')
    ctx.setFontSize(16)
    ctx.fillText(model.rateCaption, VERIFICATION_CARD_WIDTH / 2, 302)

    ctx.setFillStyle('rgba(255, 246, 216, 0.85)')
    ctx.setFontSize(16)
    model.statLines.forEach((line, index) => {
      ctx.fillText(line, VERIFICATION_CARD_WIDTH / 2, 356 + index * 30)
    })

    ctx.setFillStyle('rgba(255, 246, 216, 0.5)')
    ctx.setFontSize(13)
    ctx.fillText(model.rangeText, VERIFICATION_CARD_WIDTH / 2, 424)

    ctx.setFillStyle('rgba(255, 246, 216, 0.4)')
    ctx.setFontSize(11)
    ctx.fillText(model.disclaimer, VERIFICATION_CARD_WIDTH / 2, 548)
    ctx.setTextAlign('left')

    ctx.setStrokeStyle('rgba(255, 246, 216, 0.32)')
    ctx.setLineWidth(1)
    ctx.strokeRect(
      VERIFICATION_CARD_CODE_SLOT.x,
      VERIFICATION_CARD_CODE_SLOT.y,
      VERIFICATION_CARD_CODE_SLOT.size,
      VERIFICATION_CARD_CODE_SLOT.size,
    )
    ctx.setFillStyle('rgba(255, 246, 216, 0.5)')
    ctx.setFontSize(13)
    ctx.fillText('问', VERIFICATION_CARD_CODE_SLOT.x + 21, VERIFICATION_CARD_CODE_SLOT.y + 24)
    ctx.fillText('道', VERIFICATION_CARD_CODE_SLOT.x + 21, VERIFICATION_CARD_CODE_SLOT.y + 42)
  },

  buildVerificationCardImage() {
    const model = buildVerificationCardModel(getHistoryRecords())
    if (!model) {
      return Promise.reject(new Error('No settled verification'))
    }

    const ctx = wx.createCanvasContext(VERIFICATION_CARD_CANVAS_ID, this)
    this.drawVerificationCard(ctx, model)

    return new Promise((resolve, reject) => {
      ctx.draw(false, () => {
        wx.canvasToTempFilePath(
          {
            canvasId: VERIFICATION_CARD_CANVAS_ID,
            width: VERIFICATION_CARD_WIDTH,
            height: VERIFICATION_CARD_HEIGHT,
            destWidth: VERIFICATION_CARD_WIDTH * 2,
            destHeight: VERIFICATION_CARD_HEIGHT * 2,
            fileType: 'jpg',
            quality: 0.92,
            success: (res) => resolve(res.tempFilePath),
            fail: reject,
          },
          this,
        )
      })
    })
  },

  async handleSaveVerificationCard() {
    if (this.data.isBuildingCard || !this.data.summary.settled) {
      return
    }

    this.setData({ isBuildingCard: true })

    try {
      const imagePath = await this.buildVerificationCardImage()
      wx.saveImageToPhotosAlbum({
        filePath: imagePath,
        success: () => {
          track('save_verification_card', {
            settled: this.data.summary.settled,
            rate: this.data.summary.rate,
          })
          wx.showToast({ title: '已保存到相册', icon: 'success' })
        },
        fail: () => {
          wx.showToast({ title: '保存失败', icon: 'none' })
        },
        complete: () => {
          this.setData({ isBuildingCard: false })
        },
      })
    } catch (error) {
      console.error('Build verification card failed:', error)
      this.setData({ isBuildingCard: false })
      wx.showToast({ title: '生成失败', icon: 'none' })
    }
  },

  handleSaveRecordCard(event) {
    const recordId = event?.currentTarget?.dataset?.id
    if (recordId) {
      this.setData({ openedRecordId: '' })
      this.saveRecordCard(recordId)
    }
  },

  buildVerificationRecordCardImage(record) {
    const model = buildVerificationRecordCardModel(record)
    if (!model) {
      return Promise.reject(new Error('Record not fulfilled'))
    }

    const ctx = wx.createCanvasContext(VERIFICATION_CARD_CANVAS_ID, this)
    drawVerificationRecordCard(ctx, model)

    return new Promise((resolve, reject) => {
      ctx.draw(false, () => {
        wx.canvasToTempFilePath(
          {
            canvasId: VERIFICATION_CARD_CANVAS_ID,
            width: VERIFICATION_RECORD_CARD_WIDTH,
            height: VERIFICATION_RECORD_CARD_HEIGHT,
            destWidth: VERIFICATION_RECORD_CARD_WIDTH * 2,
            destHeight: VERIFICATION_RECORD_CARD_HEIGHT * 2,
            fileType: 'jpg',
            quality: 0.92,
            success: (res) => resolve(res.tempFilePath),
            fail: reject,
          },
          this,
        )
      })
    })
  },

  async saveRecordCard(recordId) {
    if (this.data.isBuildingCard || this.data.showCardPreview) {
      return
    }

    const record = getHistoryRecords<{ id: string; rule_result?: { symbol?: string } }>()
      .find((item) => item.id === recordId)
    if (!canExportVerificationCard(record)) {
      wx.showToast({ title: '此课尚未应验', icon: 'none' })
      return
    }

    this.setData({ isBuildingCard: true })

    try {
      // 先出预览，存不存由用户在预览里决定
      const imagePath = await this.buildVerificationRecordCardImage(record)
      this.setData({
        isBuildingCard: false,
        openedRecordId: '',
        showCardPreview: true,
        previewCardPath: imagePath,
        previewCardSymbol: record?.rule_result?.symbol || '',
        previewRecordId: recordId,
      })
    } catch (error) {
      console.error('Build verification record card failed:', error)
      this.setData({ isBuildingCard: false })
      wx.showToast({ title: '生成失败', icon: 'none' })
    }
  },

  handleConfirmSaveRecordCard() {
    const { previewCardPath, previewCardSymbol } = this.data
    if (!previewCardPath) {
      return
    }

    wx.saveImageToPhotosAlbum({
      filePath: previewCardPath,
      success: () => {
        track('save_verification_record_card', { symbol: previewCardSymbol })
        wx.showToast({ title: '已保存到相册', icon: 'success' })
      },
      fail: () => {
        wx.showToast({ title: '保存失败', icon: 'none' })
      },
      complete: () => {
        this.closeRecordCardPreview()
      },
    })
  },

  handleCancelRecordCardPreview() {
    this.closeRecordCardPreview()
  },

  handlePreviewEditVerification() {
    // 应验卡的改状态入口：先收下浮层，再弹状态选择
    const recordId = this.data.previewRecordId
    this.closeRecordCardPreview()
    if (recordId) {
      this.openVerificationSheet(recordId)
    }
  },

  closeRecordCardPreview() {
    this.setData({
      showCardPreview: false,
      previewCardPath: '',
      previewCardSymbol: '',
      previewRecordId: '',
    })
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
          summary: { fulfilled: 0, unfulfilled: 0, unclear: 0, deferred: 0, settled: 0, total: 0, rate: 0 },
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
