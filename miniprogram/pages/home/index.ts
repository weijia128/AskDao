import { track } from '../../services/analytics'
import { buildShareReopenProperties } from '../../services/analytics.core'
import { getDailyDivinationUsage } from '../../services/daily-limit.core'
import { getDailyAlmanac } from '../../domain/calendar/almanac'
import { getHistoryRecords, formatHistoryCreatedAt, updateHistoryRecord } from '../../services/storage'
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
    ritualRules: [
      {
        title: '不诚不占',
        text: '心不诚，则象不明。',
      },
      {
        title: '不疑不占',
        text: '事无疑，则不必问。',
      },
      {
        title: '不义不占',
        text: '所问不义，则不取象。',
      },
    ],
    dailyLimitText: '',
    almanac: emptyAlmanac,
    dueRecord: null,
    dueRecordTimeText: '',
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
    const action = event.currentTarget?.dataset?.action
    const record = this.data.dueRecord
    if (!action || !record) {
      return
    }

    const status = action === 'defer' ? resolveDeferAction(record) : action
    const patch = buildVerificationPatch(status)
    updateHistoryRecord<VerificationRecord>(record.id, patch)
    this.syncLatestResult(record.id, patch)

    track('mark_verification', {
      status,
      symbol: record.rule_result?.symbol,
      grade: record.rule_result?.grade,
    })
    wx.showToast({ title: status === 'fulfilled' ? '已记应验' : '已记下', icon: 'none' })

    // 清空后立刻重扫，把积压的下一条接上
    this.setData({ dueRecord: null, dueRecordTimeText: '' })
    this.refreshDueVerification()
  },

  // history 与 askdao_latest_result 是两份副本，命中最新记录时必须一起更新，
  // 否则结果页读到的仍是未验证的旧对象。
  syncLatestResult(recordId, patch) {
    const latest = wx.getStorageSync('askdao_latest_result')
    if (!latest || latest.id !== recordId) {
      return
    }

    wx.setStorageSync('askdao_latest_result', { ...latest, ...patch })
  },

  handleOpenHistory() {
    wx.navigateTo({ url: '/pages/history/index' })
  },
})
