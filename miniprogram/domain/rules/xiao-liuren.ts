import type { RuleResult } from './types'

import {
  XIAO_LIUREN_COUNT_SEQUENCE,
  buildDivinationPeriodKey as buildDivinationPeriodKeyCore,
  buildCountStepDelays as buildCountStepDelaysCore,
  buildXiaoLiurenCountPath as buildCountPathCore,
  calculateXiaoLiuren as calculateCore,
  getChineseHour as getChineseHourCore,
  getShanghaiChineseHour as getShanghaiChineseHourCore,
} from './xiao-liuren.core'

export { XIAO_LIUREN_COUNT_SEQUENCE }

export function buildCountStepDelays(totalSteps: number): number[] {
  return buildCountStepDelaysCore(totalSteps) as number[]
}

export interface XiaoLiurenInput {
  lunarMonth: number
  lunarDay: number
  hourIndex: number
  hourBranch: string
  createdAt: string
  isLeapMonth?: boolean
}

export function calculateXiaoLiuren(input: XiaoLiurenInput): RuleResult {
  return calculateCore(input) as RuleResult
}

export function buildXiaoLiurenCountPath(input: Pick<XiaoLiurenInput, 'lunarMonth' | 'lunarDay' | 'hourIndex'>): number[] {
  return buildCountPathCore(input) as number[]
}

export function getChineseHour(hour: number): {
  branch: string
  index: number
  range: string
} {
  return getChineseHourCore(hour)
}

export function getShanghaiChineseHour(date: Date = new Date()): {
  branch: string
  index: number
  range: string
} {
  return getShanghaiChineseHourCore(date)
}

export function buildDivinationPeriodKey(date: Date, hourIndex: number): string {
  return buildDivinationPeriodKeyCore(date, hourIndex)
}
