import { summarizeVerifications } from '../domain/verification/verification.core.js'

export const VERIFICATION_CARD_WIDTH = 375
export const VERIFICATION_CARD_HEIGHT = 560
export const VERIFICATION_CARD_BACKGROUND_IMAGE = '/assets/images/result-card-bg.png'

// 与结果卡码位一致，发布后替换真实太阳码：见 miniprogram/README.md
export const VERIFICATION_CARD_CODE_SLOT = { x: 265, y: 438, size: 56 }

// 验课卡不绑定单一宫位，用一套中性的墨绿色调
export const VERIFICATION_CARD_TONE = {
  glow: 'rgba(243, 219, 154, 0.24)',
  gradientFrom: 'rgba(58, 72, 66, 0.94)',
  gradientTo: 'rgba(22, 28, 26, 0.96)',
  border: 'rgba(209, 221, 176, 0.42)',
}

const SETTLED_STATUSES = ['fulfilled', 'unfulfilled']

function pad(value) {
  return `${value}`.padStart(2, '0')
}

function formatCardDate(createdAt = '') {
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const beijingDate = new Date(date.getTime() + 8 * 60 * 60 * 1000)
  return [
    beijingDate.getUTCFullYear(),
    pad(beijingDate.getUTCMonth() + 1),
    pad(beijingDate.getUTCDate()),
  ].join('.')
}

export function formatVerificationRange(records) {
  const list = Array.isArray(records) ? records : []
  const settled = list.filter((record) => SETTLED_STATUSES.includes(record?.verification?.status))
  if (!settled.length) {
    return ''
  }

  const dates = settled
    .map((record) => formatCardDate(record?.rule_result?.created_at || record?.created_at || ''))
    .filter(Boolean)
    .sort()
  if (!dates.length) {
    return ''
  }

  const earliest = dates[0]
  const latest = dates[dates.length - 1]

  if (earliest === latest) {
    return latest
  }

  return `${earliest} — ${latest}`
}

export function buildVerificationCardModel(records) {
  const summary = summarizeVerifications(records)
  if (!summary.settled) {
    return null
  }

  return {
    brand: '问道',
    title: '验课',
    rateText: `${summary.rate}%`,
    rateCaption: '应验率',
    statLines: [
      `已验 ${summary.settled} 课`,
      `应验 ${summary.fulfilled} · 未应验 ${summary.unfulfilled}`,
    ],
    rangeText: formatVerificationRange(records),
    disclaimer: '仅供传统文化体验与自我参考。',
    summary,
  }
}
