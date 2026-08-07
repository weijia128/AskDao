import { track } from '../../services/analytics'
import { buildShareReopenProperties } from '../../services/analytics.core'
import { getDailyDivinationUsage } from '../../services/daily-limit.core'
import { buildSharePath, buildShareTimelineQuery } from '../../services/wx-share'
import { getDailyAlmanac } from '../../domain/calendar/almanac'
import {
  getHistoryRecords,
  formatHistoryCreatedAt,
  syncLatestResultRecord,
  updateHistoryRecord,
} from '../../services/storage'
import {
  buildVerificationPatch,
  getDueVerificationRecord,
  resolveDeferAction,
  type VerificationState,
} from '../../domain/verification/verification'
import type { RuleResult } from '../../domain/rules/types'

type VerificationRecord = {
  id: string
  created_at?: string
  thought_note?: string
  rule_result?: Pick<RuleResult, 'created_at' | 'symbol' | 'grade'>
  verification?: VerificationState
}

function getEnterScene() {
  try {
    return typeof wx.getEnterOptionsSync === 'function'
      ? wx.getEnterOptionsSync()?.scene
      : undefined
  } catch (error) {
    return undefined
  }
}

const emptyAlmanac = {
  source: '',
  dateKey: '',
  solarText: '',
  weekdayText: '',
  lunarText: '',
  ganzhiText: '',
  zodiacText: '',
  chongShaText: '',
  yi: [],
  ji: [],
  noticeText: '',
}

Page({
  data: {
    dailyLimitText: '',
    almanac: emptyAlmanac,
    dueRecord: null,
    dueRecordTimeText: '',
    isProcessingVerification: false,
  },

  onLoad(options) {
    this.refreshAlmanac()
    this.refreshDailyLimit()
    track('page_view', { page: 'home', source: options?.source || 'direct' })

    const reopenProperties = buildShareReopenProperties(options, getEnterScene())
    if (reopenProperties) {
      track('reopen_from_share', reopenProperties)
    }
  },

  onShow() {
    this.refreshAlmanac()
    this.refreshDailyLimit()
    this.refreshDueVerification()
  },

  refreshAlmanac() {
    this.setData({ almanac: getDailyAlmanac() })
  },

  refreshDailyLimit() {
    const usage = getDailyDivinationUsage(wx)
    this.setData({
      dailyLimitText: `问小事，问一念；每日最多三问。今日还可问 ${usage.remaining} 次。`,
    })
  },

  handleStart() {
    track('click_start', { entry: 'daily' })
    wx.navigateTo({ url: '/pages/xiao-liuren/index?entry=daily' })
  },

  refreshDueVerification() {
    const dueRecord = getDueVerificationRecord(getHistoryRecords<VerificationRecord>())
    if (!dueRecord) {
      this.setData({ dueRecord: null, dueRecordTimeText: '' })
      return
    }

    this.setData({
      dueRecord,
      dueRecordTimeText: formatHistoryCreatedAt(
        dueRecord.rule_result?.created_at || dueRecord.created_at || '',
      ),
    })
    track('view_verification_prompt', {
      status: dueRecord.verification?.status || 'pending',
    })
  },

  handleVerify(event) {
    if (this.data.isProcessingVerification) {
      return
    }

    const action = event.currentTarget?.dataset?.action
    const record = this.data.dueRecord
    if (!action || !record) {
      return
    }

    this.setData({ isProcessingVerification: true })

    const status = action === 'defer' ? resolveDeferAction(record) : action
    const patch = buildVerificationPatch(status)
    updateHistoryRecord<VerificationRecord>(record.id, patch)
    syncLatestResultRecord(record.id, patch)

    track('mark_verification', {
      status,
      symbol: record.rule_result?.symbol,
      grade: record.rule_result?.grade,
    })
    wx.showToast({ title: status === 'fulfilled' ? '已记应验' : '已记下', icon: 'none' })

    // 先让旧操作区完成退场，再接上积压的下一条，避免旧按钮事件误标新记录。
    this.setData({ dueRecord: null, dueRecordTimeText: '' }, () => {
      this.refreshDueVerification()
      this.setData({ isProcessingVerification: false })
    })
  },

  handleOpenHistory() {
    wx.navigateTo({ url: '/pages/history/index' })
  },

  onShareAppMessage() {
    track('share_click', { channel: 'session', page: 'home' })
    return {
      title: '一念六壬 · 起课问道',
      path: buildSharePath(),
    }
  },

  onShareTimeline() {
    track('share_click', { channel: 'timeline', page: 'home' })
    return {
      title: '一念六壬 · 起课问道',
      query: buildShareTimelineQuery(),
    }
  },
})
