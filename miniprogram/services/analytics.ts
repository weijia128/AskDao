import { buildAnalyticsPayload } from './analytics.core'

export type AnalyticsEvent =
  | 'page_view'
  | 'view_daily_ritual'
  | 'click_start'
  | 'select_question_type'
  | 'start_divination'
  | 'complete_divination'
  | 'view_result'
  | 'save_poster'
  | 'save_thought_note'
  | 'share_click'
  | 'reopen_from_share'
  | 'view_history'
  | 'clear_history'

export function track(event: AnalyticsEvent, properties: Record<string, unknown> = {}) {
  const payload = buildAnalyticsPayload(event, properties)

  try {
    if (typeof wx !== 'undefined' && typeof wx.reportAnalytics === 'function') {
      // 需在微信公众平台「统计-自定义分析」配置事件后才入库；未配置时微信端静默忽略
      wx.reportAnalytics(event, payload)
      return
    }
  } catch (error) {
    // 静默降级到本地日志
  }

  console.info('[analytics]', event, payload)
}
