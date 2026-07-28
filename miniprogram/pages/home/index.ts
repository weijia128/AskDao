import { track } from '../../services/analytics'
import { buildShareReopenProperties } from '../../services/analytics.core'
import { getDailyDivinationUsage } from '../../services/daily-limit.core'
import { getDailyAlmanac } from '../../domain/calendar/almanac'

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

  handleOpenHistory() {
    wx.navigateTo({ url: '/pages/history/index' })
  },
})
