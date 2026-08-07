import { buildSharePosterModel } from '../../application/poster-service'
import {
  buildResultCardImageModel,
  formatLunarTimeText,
  getAspectFillCrop,
  getResultCardBackImage,
  getVerticalSymbolLayout,
  RESULT_CARD_BACK_IMAGE_SIZE,
  RESULT_CARD_BACK_VEIL,
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
    cardBackImage: '',
    lunarTimeText: '',
    showRepeatNotice: false,
    keyboardHeight: 0,
  },

  onLoad(options) {
    const record = wx.getStorageSync('askdao_latest_result')
    this.setData({
      record,
      thoughtNote: record?.thought_note || '',
      showThoughtNoteCard: false,
      isBuildingCard: false,
      isCardBackVisible: false,
      symbolTone: getSymbolTone(record),
      symbolChars: splitResultSymbol(record?.rule_result?.symbol),
      cardBackImage: getResultCardBackImage(record?.rule_result?.symbol),
      lunarTimeText: formatLunarTimeText(record?.rule_result?.input_snapshot),
      showRepeatNotice: options?.repeat === '1',
      keyboardHeight: 0,
    })

    if (typeof wx.onKeyboardHeightChange === 'function') {
      wx.onKeyboardHeightChange((res) => {
        this.setData({ keyboardHeight: res?.height || 0 })
      })
    }
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

  drawCardBackground(ctx, toneStyle) {
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

    this.drawCardFrame(ctx, toneStyle.border)
  },

  drawBackCardBackground(ctx, model) {
    // 背面：六象底图 aspectFill 铺满 + 宣纸纱罩（与首页/起念页同配方）
    const crop = getAspectFillCrop(
      RESULT_CARD_BACK_IMAGE_SIZE.width,
      RESULT_CARD_BACK_IMAGE_SIZE.height,
      RESULT_CARD_WIDTH,
      RESULT_CARD_HEIGHT,
    )
    ctx.drawImage(
      model.backImagePath,
      crop.sx,
      crop.sy,
      crop.sWidth,
      crop.sHeight,
      0,
      0,
      RESULT_CARD_WIDTH,
      RESULT_CARD_HEIGHT,
    )

    const veil = ctx.createLinearGradient(0, 0, 0, RESULT_CARD_HEIGHT)
    veil.addColorStop(0, RESULT_CARD_BACK_VEIL.from)
    veil.addColorStop(1, RESULT_CARD_BACK_VEIL.to)
    ctx.setFillStyle(veil)
    ctx.fillRect(0, 0, RESULT_CARD_WIDTH, RESULT_CARD_HEIGHT)

    this.drawCardFrame(ctx, model.toneStyle.border)
  },

  drawCardFrame(ctx, borderColor) {
    ctx.setStrokeStyle(borderColor)
    ctx.setLineWidth(1)
    ctx.strokeRect(28, 34, RESULT_CARD_WIDTH - 56, RESULT_CARD_HEIGHT - 68)

    ctx.setStrokeStyle('rgba(255, 246, 216, 0.14)')
    ctx.strokeRect(38, 44, RESULT_CARD_WIDTH - 76, RESULT_CARD_HEIGHT - 88)
  },

  drawCardChrome(ctx, model, face = 'front') {
    const isBack = face === 'back'
    // 正背面共用：品牌、方法、印章、码位、免责声明
    ctx.setFillStyle(isBack ? 'rgba(35, 33, 28, 0.72)' : 'rgba(255, 246, 216, 0.92)')
    ctx.setFontSize(20)
    ctx.fillText(model.brand, 48, 72)

    ctx.setFillStyle(isBack ? 'rgba(35, 33, 28, 0.56)' : 'rgba(255, 246, 216, 0.66)')
    ctx.setFontSize(15)
    ctx.fillText(`${model.methodName} · ${model.symbol}`, 48, 106)

    ctx.setStrokeStyle(isBack ? 'rgba(107, 87, 52, 0.56)' : 'rgba(214, 99, 82, 0.8)')
    ctx.strokeRect(286, 56, 42, 42)
    ctx.setFillStyle(isBack ? 'rgba(107, 87, 52, 0.88)' : 'rgba(224, 122, 102, 0.95)')
    ctx.setFontSize(14)
    ctx.fillText('问', 293, 74)
    ctx.fillText('道', 293, 94)

    if (model.miniProgramCodeUrl) {
      ctx.drawImage(
        model.miniProgramCodeUrl,
        RESULT_CARD_CODE_SLOT.x,
        RESULT_CARD_CODE_SLOT.y,
        RESULT_CARD_CODE_SLOT.size,
        RESULT_CARD_CODE_SLOT.size,
      )
    } else {
      ctx.setStrokeStyle(isBack ? 'rgba(35, 33, 28, 0.28)' : 'rgba(255, 246, 216, 0.32)')
      ctx.setLineWidth(1)
      ctx.strokeRect(
        RESULT_CARD_CODE_SLOT.x,
        RESULT_CARD_CODE_SLOT.y,
        RESULT_CARD_CODE_SLOT.size,
        RESULT_CARD_CODE_SLOT.size,
      )
      ctx.setFillStyle(isBack ? 'rgba(35, 33, 28, 0.42)' : 'rgba(255, 246, 216, 0.5)')
      ctx.setFontSize(13)
      ctx.fillText('问', RESULT_CARD_CODE_SLOT.x + 21, RESULT_CARD_CODE_SLOT.y + 24)
      ctx.fillText('道', RESULT_CARD_CODE_SLOT.x + 21, RESULT_CARD_CODE_SLOT.y + 42)
    }

    ctx.setFillStyle(isBack ? 'rgba(35, 33, 28, 0.38)' : 'rgba(255, 246, 216, 0.4)')
    ctx.setFontSize(11)
    ctx.setTextAlign('center')
    ctx.fillText(model.disclaimer, RESULT_CARD_WIDTH / 2, 548)
    ctx.setTextAlign('left')
  },

  drawFrontFace(ctx, model) {
    // 正面：宫位大字竖排居中 + 农历时辰，与 App 卡面一致
    ctx.setFillStyle('#fff6d8')
    ctx.setFontSize(104)
    ctx.setTextAlign('center')
    getVerticalSymbolLayout(model.symbolChars, {
      centerY: 290,
      fontSize: 104,
      gap: 26,
    }).forEach((item) => {
      ctx.fillText(item.char, RESULT_CARD_WIDTH / 2, item.y)
    })

    ctx.setFillStyle('rgba(255, 246, 216, 0.6)')
    ctx.setFontSize(14)
    ctx.fillText(model.lunarTimeText, RESULT_CARD_WIDTH / 2, 496)
    ctx.setTextAlign('left')
  },

  drawBackFace(ctx, model) {
    // 背面：档位 + 竖排宫位 + 签语 + 行动提示 + 起念时间（宣纸面墨色）
    ctx.setFillStyle('#23211c')
    ctx.setFontSize(76)
    ctx.fillText(model.grade, 48, 194)

    ctx.setFillStyle('rgba(107, 79, 42, 0.92)')
    ctx.setFontSize(30)
    getVerticalSymbolLayout(model.symbolChars, {
      centerY: 184,
      fontSize: 30,
      gap: 18,
    }).forEach((item) => {
      ctx.fillText(item.char, 136, item.y)
    })

    ctx.setFillStyle('#6b4f2a')
    ctx.setFontSize(15)
    wrapPosterText(model.oracleText, 16).slice(0, 3).forEach((line, index) => {
      ctx.fillText(line, 48, 276 + index * 26)
    })

    ctx.setFillStyle('rgba(35, 33, 28, 0.78)')
    ctx.setFontSize(14)
    wrapPosterText(model.actionHint, 18).slice(0, 3).forEach((line, index) => {
      ctx.fillText(line, 48, 356 + index * 24)
    })

    ctx.setFillStyle('rgba(35, 33, 28, 0.55)')
    ctx.setFontSize(13)
    ctx.fillText(model.createdAtText, 48, 470)

    ctx.setFillStyle('rgba(35, 33, 28, 0.6)')
    ctx.setFontSize(14)
    ctx.fillText(model.lunarTimeText, 48, 496)
  },

  drawResultCardImage(face = 'back') {
    const model = buildResultCardImageModel(this.data.record)
    const ctx = wx.createCanvasContext(RESULT_CARD_CANVAS_ID, this)

    if (face === 'front') {
      this.drawCardBackground(ctx, model.toneStyle)
    } else {
      this.drawBackCardBackground(ctx, model)
    }
    this.drawCardChrome(ctx, model, face)

    if (face === 'front') {
      this.drawFrontFace(ctx, model)
    } else {
      this.drawBackFace(ctx, model)
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
              this.cardImagePaths = { ...this.cardImagePaths, [face]: res.tempFilePath }
              resolve(res.tempFilePath)
            },
            fail: reject,
          },
          this,
        )
      })
    })
  },

  getResultCardImagePath(face) {
    const cached = this.cardImagePaths?.[face]
    if (cached) {
      return Promise.resolve(cached)
    }

    return this.drawResultCardImage(face)
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
      imageUrl: this.cardImagePaths?.back || RESULT_CARD_SHARE_FALLBACK_IMAGE,
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
      imageUrl: this.cardImagePaths?.back || RESULT_CARD_SHARE_FALLBACK_IMAGE,
    }
  },

  async handleSavePoster() {
    if (!this.data.record || this.data.isBuildingCard) {
      return
    }

    this.setData({ isBuildingCard: true })
    const poster = buildSharePosterModel(this.data.record.rule_result, this.data.record.interpretation)
    wx.setStorageSync('askdao_latest_poster', poster)
    const face = this.data.isCardBackVisible ? 'back' : 'front'

    try {
      const imagePath = await this.getResultCardImagePath(face)
      wx.saveImageToPhotosAlbum({
        filePath: imagePath,
        success: () => {
          track('save_poster', {
            template_id: poster.template_id,
            symbol: poster.symbol,
            grade: poster.grade,
            face,
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
      const imagePath = await this.getResultCardImagePath('back')
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
