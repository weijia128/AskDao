import {
  buildResultCardImageModel,
  getVerticalSymbolLayout,
} from './result-card-image.core.js'

export const VERIFICATION_RECORD_CARD_WIDTH = 375
export const VERIFICATION_RECORD_CARD_HEIGHT = 560

function pad(value) {
  return `${value}`.padStart(2, '0')
}

export function canExportVerificationCard(record) {
  return record?.verification?.status === 'fulfilled'
}

export function formatVerifiedAtText(record) {
  const updatedAt = record?.verification?.updated_at
  const date = new Date(updatedAt)
  if (!updatedAt || Number.isNaN(date.getTime())) {
    return ''
  }

  const beijingDate = new Date(date.getTime() + 8 * 60 * 60 * 1000)
  return `${pad(beijingDate.getUTCMonth() + 1)}.${pad(beijingDate.getUTCDate())} 应验`
}

export function buildVerificationRecordCardModel(record) {
  if (!canExportVerificationCard(record)) {
    return null
  }

  return {
    ...buildResultCardImageModel(record),
    verifiedAtText: formatVerifiedAtText(record),
  }
}

// 与结果卡一致的六象色调渐变 + 中部径向光晕，不加线框
function drawCardBackground(ctx, toneStyle) {
  const background = ctx.createLinearGradient(
    0,
    0,
    VERIFICATION_RECORD_CARD_WIDTH * 0.6,
    VERIFICATION_RECORD_CARD_HEIGHT * 0.85,
  )
  background.addColorStop(0, toneStyle.gradientFrom)
  background.addColorStop(1, toneStyle.gradientTo)
  ctx.setFillStyle(background)
  ctx.fillRect(0, 0, VERIFICATION_RECORD_CARD_WIDTH, VERIFICATION_RECORD_CARD_HEIGHT)

  const glow = ctx.createCircularGradient(
    VERIFICATION_RECORD_CARD_WIDTH / 2,
    VERIFICATION_RECORD_CARD_HEIGHT * 0.43,
    VERIFICATION_RECORD_CARD_WIDTH * 0.55,
  )
  glow.addColorStop(0, toneStyle.glow)
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.setFillStyle(glow)
  ctx.fillRect(0, 0, VERIFICATION_RECORD_CARD_WIDTH, VERIFICATION_RECORD_CARD_HEIGHT)
}

// 简洁正面：宫位大字竖排居中 + 应验日期 + 农历时辰，与 App 卡面同一气质
function drawFrontFace(ctx, model) {
  ctx.setFillStyle('#fff6d8')
  ctx.setFontSize(104)
  ctx.setTextAlign('center')
  getVerticalSymbolLayout(model.symbolChars, {
    centerY: 268,
    fontSize: 104,
    gap: 26,
  }).forEach((item) => {
    ctx.fillText(item.char, VERIFICATION_RECORD_CARD_WIDTH / 2, item.y)
  })

  ctx.setFillStyle('rgba(243, 219, 154, 0.88)')
  ctx.setFontSize(15)
  ctx.fillText(model.verifiedAtText, VERIFICATION_RECORD_CARD_WIDTH / 2, 452)

  ctx.setFillStyle('rgba(255, 246, 216, 0.6)')
  ctx.setFontSize(14)
  ctx.fillText(model.lunarTimeText, VERIFICATION_RECORD_CARD_WIDTH / 2, 488)

  ctx.setFillStyle('rgba(255, 246, 216, 0.4)')
  ctx.setFontSize(11)
  ctx.fillText(model.disclaimer, VERIFICATION_RECORD_CARD_WIDTH / 2, 548)
  ctx.setTextAlign('left')
}

export function drawVerificationRecordCard(ctx, model) {
  drawCardBackground(ctx, model.toneStyle)
  drawFrontFace(ctx, model)
}
