export type AnalyticsEvent =
  | 'page_view'
  | 'view_daily_ritual'
  | 'click_start'
  | 'select_question_type'
  | 'start_divination'
  | 'complete_divination'
  | 'view_result'
  | 'save_poster'
  | 'share_click'
  | 'reopen_from_share'
  | 'view_history'

export function track(event: AnalyticsEvent, properties: Record<string, unknown> = {}) {
  console.info('[analytics]', event, properties)
}
