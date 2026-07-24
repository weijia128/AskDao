import { buildSharePosterModel } from '../../application/poster-service'
import {
  buildResultCardImageModel,
  formatLunarTimeText,
  getVerticalSymbolLayout,
  splitResultSymbol,
  wrapPosterText,
} from '../../services/result-card-image.core'
import { track } from '../../services/analytics'
import { updateHistoryRecord } from '../../services/storage'
import { buildResultCardEntrancePath } from '../../services/wx-share'

const RESULT_CARD_CANVAS_ID = 'resultCardCanvas'
const RESULT_CARD_WIDTH = 375
const RESULT_CARD_HEIGHT = 560
const RESULT_CARD_WATERMARK_KEY = 'askdao_result_card_watermark'

const SYMBOL_TONES = {
  大安: 'tone-da-an',
  留连: 'tone-liu-lian',
  速喜: 'tone-su-xi',
  赤口: 'tone-chi-kou',
  小吉: 'tone-xiao-ji',
  空亡: 'tone-kong-wang',
}

function getSymbolTone(record) {
  return SYMBOL_TONES[record?.rule_result?.symbol] || 'tone-neutral'
}

Page({
  data: {
    record: null,
    thoughtNote: '',
    showThoughtNoteCard: false,
    isBuildingCard: false,
    isCardBackVisible: false,
    symbolTone: '',
    symbolChars: [],
    lunarTimeText: '',
  },

  onLoad() {
    const record = wx.getStorageSync('askdao_latest_result')
    this.setData({
      record,
      thoughtNote: record?.thought_note || '',
      showThoughtNoteCard: false,
      isBuildingCard: false,
      isCardBackVisible: false,
      symbolTone: getSymbolTone(record),
      symbolChars: splitResultSymbol(record?.rule_result?.symbol),
      lunarTimeText: formatLunarTimeText(record?.rule_result?.input_snapshot),
    })
    track('page_view', { page: 'result' })
    if (record) {
      track('view_result', {
        symbol: record.rule_result.symbol,
        grade: record.rule_result.grade,
        question_type: record.question_type,
      })
    }
  },

  handleToggleCardFace() {
    if (!this.data.record) {
      return
    }

    this.setData({ isCardBackVisible: !this.data.isCardBackVisible })
  },

  handleOpenHistory() {
    wx.navigateTo({ url: '/pages/history/index' })
  },

  getStoredWatermarkName() {
    return wx.getStorageSync(RESULT_CARD_WATERMARK_KEY) || ''
  },

  getResultCardWatermarkName() {
    const storedName = this.getStoredWatermarkName()
    if (storedName) {
      return Promise.resolve(storedName)
    }

    if (!wx.getUserProfile) {
      return Promise.resolve('')
    }

    return new Promise((resolve) => {
      wx.getUserProfile({
        desc: '用于生成结果卡片署名',
        success: (res) => {
          const nickName = res.userInfo?.nickName || ''
          if (nickName) {
            wx.setStorageSync(RESULT_CARD_WATERMARK_KEY, nickName)
          }
          resolve(nickName)
        },
        fail: () => {
          resolve('')
        },
      })
    })
  },

  drawResultCardImage(watermarkName = '') {
    const model = buildResultCardImageModel(this.data.record, watermarkName)
    const ctx = wx.createCanvasContext(RESULT_CARD_CANVAS_ID, this)

    ctx.drawImage(model.backgroundImagePath, 0, 0, RESULT_CARD_WIDTH, RESULT_CARD_HEIGHT)

    ctx.setFillStyle('rgba(255, 255, 255, 0.58)')
    ctx.fillRect(0, 0, RESULT_CARD_WIDTH, RESULT_CARD_HEIGHT)

    ctx.setFillStyle('rgba(255, 252, 244, 0.78)')
    ctx.fillRect(28, 34, RESULT_CARD_WIDTH - 56, RESULT_CARD_HEIGHT - 68)

    ctx.setStrokeStyle('rgba(108, 78, 45, 0.52)')
    ctx.setLineWidth(1)
    ctx.strokeRect(28, 34, RESULT_CARD_WIDTH - 56, RESULT_CARD_HEIGHT - 68)

    ctx.setStrokeStyle('rgba(142, 46, 37, 0.38)')
    ctx.strokeRect(38, 44, RESULT_CARD_WIDTH - 76, RESULT_CARD_HEIGHT - 88)

    ctx.setFillStyle('#2b2119')
    ctx.setFontSize(20)
    ctx.fillText(model.brand, 48, 72)

    ctx.setFillStyle('rgba(78, 58, 38, 0.8)')
    ctx.setFontSize(15)
    ctx.fillText(`${model.methodName} · ${model.symbol}`, 48, 106)

    ctx.setFillStyle('#1f1a14')
    ctx.setFontSize(76)
    ctx.fillText(model.grade, 48, 194)

    ctx.setFillStyle('#8f2e25')
    ctx.setFontSize(30)
    getVerticalSymbolLayout(model.symbolChars, {
      centerY: 184,
      fontSize: 30,
      gap: 18,
    }).forEach((item) => {
      ctx.fillText(item.char, 136, item.y)
    })

    ctx.setFillStyle('rgba(78, 58, 38, 0.7)')
    ctx.setFontSize(14)
    ctx.setTextAlign('center')
    ctx.fillText(model.lunarTimeText, RESULT_CARD_WIDTH / 2, RESULT_CARD_HEIGHT - 54)
    ctx.setTextAlign('left')

    ctx.setFillStyle('rgba(31, 26, 20, 0.78)')
    ctx.setFontSize(15)
    wrapPosterText(model.oracleText, 16).slice(0, 3).forEach((line, index) => {
      ctx.fillText(line, 48, 276 + index * 26)
    })

    ctx.setFillStyle('rgba(31, 26, 20, 0.66)')
    ctx.setFontSize(14)
    wrapPosterText(model.actionHint, 18).slice(0, 3).forEach((line, index) => {
      ctx.fillText(line, 48, 356 + index * 24)
    })

    ctx.setStrokeStyle('rgba(142, 46, 37, 0.72)')
    ctx.strokeRect(286, 56, 42, 42)
    ctx.setFillStyle('rgba(142, 46, 37, 0.9)')
    ctx.setFontSize(14)
    ctx.fillText('问', 293, 74)
    ctx.fillText('道', 293, 94)

    ctx.setFillStyle('rgba(142, 46, 37, 0.74)')
    ctx.setFontSize(13)
    ctx.fillText(`${model.watermarkName} 起念`, 220, 442)

    ctx.setFillStyle('rgba(78, 58, 38, 0.72)')
    ctx.setFontSize(13)
    ctx.fillText(model.createdAtText, 48, 466)

    ctx.setFillStyle('rgba(31, 26, 20, 0.46)')
    ctx.setFontSize(12)
    ctx.fillText(model.disclaimer, 48, 508)

    return new Promise((resolve, reject) => {
      ctx.draw(false, () => {
        wx.canvasToTempFilePath(
          {
            canvasId: RESULT_CARD_CANVAS_ID,
            width: RESULT_CARD_WIDTH,
            height: RESULT_CARD_HEIGHT,
            destWidth: RESULT_CARD_WIDTH * 2,
            destHeight: RESULT_CARD_HEIGHT * 2,
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

  async handleSavePoster() {
    if (!this.data.record || this.data.isBuildingCard) {
      return
    }

    this.setData({ isBuildingCard: true })
    const poster = buildSharePosterModel(this.data.record.rule_result, this.data.record.interpretation)
    wx.setStorageSync('askdao_latest_poster', poster)

    try {
      const watermarkName = await this.getResultCardWatermarkName()
      const imagePath = await this.drawResultCardImage(watermarkName)
      wx.saveImageToPhotosAlbum({
        filePath: imagePath,
        success: () => {
          track('save_poster', {
            template_id: poster.template_id,
            symbol: poster.symbol,
            grade: poster.grade,
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
      this.setData({ isBuildingCard: false })
      wx.showToast({ title: '卡片生成失败', icon: 'none' })
    }
  },

  async handleShareResultCard() {
    if (!this.data.record || this.data.isBuildingCard) {
      return
    }

    this.setData({ isBuildingCard: true })

    try {
      const watermarkName = await this.getResultCardWatermarkName()
      const imagePath = await this.drawResultCardImage(watermarkName)
      wx.showShareImageMenu({
        path: imagePath,
        needShowEntrance: true,
        entrancePath: buildResultCardEntrancePath(this.data.record.poster_template_id || 'A01'),
        success: () => {
          track('share_click', {
            symbol: this.data.record.rule_result.symbol,
            grade: this.data.record.rule_result.grade,
          })
        },
        fail: () => {
          wx.showToast({ title: '分享已取消', icon: 'none' })
        },
        complete: () => {
          this.setData({ isBuildingCard: false })
        },
      })
    } catch (error) {
      this.setData({ isBuildingCard: false })
      wx.showToast({ title: '卡片生成失败', icon: 'none' })
    }
  },

  handleThoughtInput(event) {
    this.setData({ thoughtNote: event.detail.value })
  },

  handleOpenThoughtNote() {
    this.setData({ showThoughtNoteCard: true })
  },

  handleCloseThoughtNote() {
    this.setData({
      thoughtNote: this.data.record?.thought_note || '',
      showThoughtNoteCard: false,
    })
  },

  handleSaveThought() {
    const record = this.data.record
    if (!record) {
      return
    }

    const thoughtNote = this.data.thoughtNote.trim()
    if (!thoughtNote) {
      wx.showToast({ title: '请先写下此念', icon: 'none' })
      return
    }

    const nextRecord = {
      ...record,
      thought_note: thoughtNote,
    }

    wx.setStorageSync('askdao_latest_result', nextRecord)
    updateHistoryRecord(nextRecord.id, { thought_note: thoughtNote })
    this.setData({
      record: nextRecord,
      thoughtNote,
      showThoughtNoteCard: false,
    })
    track('save_thought_note', {
      symbol: nextRecord.rule_result.symbol,
      grade: nextRecord.rule_result.grade,
    })
    wx.showToast({ title: '已保存', icon: 'success' })
  },

})
