import type { RuleResult } from './types'

import {
  calculateXiaoLiuren as calculateCore,
  getChineseHour as getChineseHourCore,
} from './xiao-liuren.core'

export interface XiaoLiurenInput {
  lunarMonth: number
  lunarDay: number
  hourIndex: number
  hourBranch: string
  createdAt: string
}

export function calculateXiaoLiuren(input: XiaoLiurenInput): RuleResult {
  return calculateCore(input) as RuleResult
}

export function getChineseHour(hour: number): {
  branch: string
  index: number
  range: string
} {
  return getChineseHourCore(hour)
}
