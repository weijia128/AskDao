import { buildSharePosterModel } from '../../application/poster-service'
import {
  buildResultCardImageModel,
  formatLunarTimeText,
  getVerticalSymbolLayout,
  RESULT_CARD_CODE_SLOT,
  splitResultSymbol,
  wrapPosterText,
} from '../../services/result-card-image.core'
import { track } from '../../services/analytics'
import { updateHistoryRecord } from '../../services/storage'
import {
  buildResultCardEntrancePath,
  buildSharePath,
  buildShareTimelineQuery,
} from '../../services/wx-share'

const RESULT_CARD_CANVAS_ID = 'resultCardCanvas'
const RESULT_CARD_WIDTH = 375
const RESULT_CARD_HEIGHT = 560
const RESULT_CARD_SHARE_FALLBACK_IMAGE = '/assets/images/result-card-bg.png'

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

  drawResultCardImage() {
    const model = buildResultCardImageModel(this.data.record)
    const toneStyle = model.toneStyle
    const ctx = wx.createCanvasContext(RESULT_CARD_CANVAS_ID, this)

    // 背景与 App 卡面一致：六象色调线性渐变 + 中部径向光晕
    const background = ctx.createLinearGradient(0, 0, RESULT_CARD_WIDTH * 0.6, RESULT_CARD_HEIGHT * 0.85)
    background.addColorStop(0, toneStyle.gradientFrom)
    background.addColorStop(1, toneStyle.gradientTo)
    ctx.setFillStyle(background)
    ctx.fillRect(0, 0, RESULT_CARD_WIDTH, RESULT_CARD_HEIGHT)

    const glow = ctx.createCircularGradient(
      RESULT_CARD_WIDTH / 2,
      RESULT_CARD_HEIGHT * 0.43,
      RESULT_CARD_WIDTH * 0.55,
    )
    glow.addColorStop(0, toneStyle.glow)
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.setFillStyle(glow)
    ctx.fillRect(0, 0, RESULT_CARD_WIDTH, RESULT_CARD_HEIGHT)

    ctx.setStrokeStyle(toneStyle.border)
    ctx.setLineWidth(1)
    ctx.strokeRect(28, 34, RESULT_CARD_WIDTH - 56, RESULT_CARD_HEIGHT - 68)

    ctx.setStrokeStyle('rgba(255, 246, 216, 0.14)')
    ctx.strokeRect(38, 44, RESULT_CARD_WIDTH - 76, RESULT_CARD_HEIGHT - 88)

    ctx.setFillStyle('rgba(255, 246, 216, 0.92)')
    ctx.setFontSize(20)
    ctx.fillText(model.brand, 48, 72)

    ctx.setFillStyle('rgba(255, 246, 216, 0.66)')
    ctx.setFontSize(15)
    ctx.fillText(`${model.methodName} · ${model.symbol}`, 48, 106)

    ctx.setFillStyle('#fff6d8')
    ctx.setFontSize(76)
    ctx.fillText(model.grade, 48, 194)

    ctx.setFillStyle('rgba(243, 219, 154, 0.92)')
    ctx.setFontSize(30)
    getVerticalSymbolLayout(model.symbolChars, {
      centerY: 184,
      fontSize: 30,
      gap: 18,
    }).forEach((item) => {
      ctx.fillText(item.char, 136, item.y)
    })

    ctx.setFillStyle('rgba(255, 246, 216, 0.6)')
    ctx.setFontSize(14)
    ctx.setTextAlign('center')
    ctx.fillText(model.lunarTimeText, RESULT_CARD_WIDTH / 2, RESULT_CARD_HEIGHT - 54)
    ctx.setTextAlign('left')

    ctx.setFillStyle('rgba(255, 246, 216, 0.85)')
    ctx.setFontSize(15)
    wrapPosterText(model.oracleText, 16).slice(0, 3).forEach((line, index) => {
      ctx.fillText(line, 48, 276 + index * 26)
    })

    ctx.setFillStyle('rgba(255, 246, 216, 0.62)')
    ctx.setFontSize(14)
    wrapPosterText(model.actionHint, 18).slice(0, 3).forEach((line, index) => {
      ctx.fillText(line, 48, 356 + index * 24)
    })

    ctx.setStrokeStyle('rgba(214, 99, 82, 0.8)')
    ctx.strokeRect(286, 56, 42, 42)
    ctx.setFillStyle('rgba(224, 122, 102, 0.95)')
    ctx.setFontSize(14)
    ctx.fillText('问', 293, 74)
    ctx.fillText('道', 293, 94)

    ctx.setFillStyle('rgba(224, 122, 102, 0.85)')
    ctx.setFontSize(13)
    ctx.fillText(model.signature, 220, 442)

    ctx.setFillStyle('rgba(255, 246, 216, 0.55)')
    ctx.setFontSize(13)
    ctx.fillText(model.createdAtText, 48, 466)

    ctx.setFillStyle('rgba(255, 246, 216, 0.4)')
    ctx.setFontSize(12)
    ctx.fillText(model.disclaimer, 48, 536)

    if (model.miniProgramCodeUrl) {
      ctx.drawImage(
        model.miniProgramCodeUrl,
        RESULT_CARD_CODE_SLOT.x,
        RESULT_CARD_CODE_SLOT.y,
        RESULT_CARD_CODE_SLOT.size,
        RESULT_CARD_CODE_SLOT.size,
      )
    } else {
      ctx.setStrokeStyle('rgba(255, 246, 216, 0.32)')
      ctx.setLineWidth(1)
      ctx.strokeRect(
        RESULT_CARD_CODE_SLOT.x,
        RESULT_CARD_CODE_SLOT.y,
        RESULT_CARD_CODE_SLOT.size,
        RESULT_CARD_CODE_SLOT.size,
      )
      ctx.setFillStyle('rgba(255, 246, 216, 0.5)')
      ctx.setFontSize(13)
      ctx.fillText('问', RESULT_CARD_CODE_SLOT.x + 21, RESULT_CARD_CODE_SLOT.y + 24)
      ctx.fillText('道', RESULT_CARD_CODE_SLOT.x + 21, RESULT_CARD_CODE_SLOT.y + 42)
    }

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
            success: (res) => {
              this.cardImagePath = res.tempFilePath
              resolve(res.tempFilePath)
            },
            fail: reject,
          },
          this,
        )
      })
    })
  },

  getResultCardImagePath() {
    if (this.cardImagePath) {
      return Promise.resolve(this.cardImagePath)
    }

    return this.drawResultCardImage()
  },

  onShareAppMessage() {
    const record = this.data.record
    const templateId = record?.poster_template_id || 'A01'
    track('share_click', {
      channel: 'session',
      template_id: templateId,
      symbol: record?.rule_result?.symbol,
      grade: record?.rule_result?.grade,
    })

    return {
      title: `小六壬断课 · ${record?.rule_result?.symbol || '问道'} · ${record?.rule_result?.grade || ''}`,
      path: buildSharePath(templateId),
      imageUrl: this.cardImagePath || RESULT_CARD_SHARE_FALLBACK_IMAGE,
    }
  },

  onShareTimeline() {
    const record = this.data.record
    const templateId = record?.poster_template_id || 'A01'
    track('share_click', {
      channel: 'timeline',
      template_id: templateId,
      symbol: record?.rule_result?.symbol,
      grade: record?.rule_result?.grade,
    })

    return {
      title: `小六壬断课 · ${record?.rule_result?.symbol || '问道'} · ${record?.rule_result?.grade || ''}`,
      query: buildShareTimelineQuery(templateId),
      imageUrl: this.cardImagePath || RESULT_CARD_SHARE_FALLBACK_IMAGE,
    }
  },

  async handleSavePoster() {
    if (!this.data.record || this.data.isBuildingCard) {
      return
    }

    this.setData({ isBuildingCard: true })
    const poster = buildSharePosterModel(this.data.record.rule_result, this.data.record.interpretation)
    wx.setStorageSync('askdao_latest_poster', poster)

    try {
      const imagePath = await this.getResultCardImagePath()
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
      const imagePath = await this.getResultCardImagePath()
      wx.showShareImageMenu({
        path: imagePath,
        needShowEntrance: true,
        entrancePath: buildResultCardEntrancePath(this.data.record.poster_template_id || 'A01'),
        success: () => {
          track('share_click', {
            channel: 'image_menu',
            template_id: this.data.record.poster_template_id || 'A01',
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
