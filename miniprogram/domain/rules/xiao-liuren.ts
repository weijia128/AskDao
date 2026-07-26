import type { RuleResult } from './types'

import {
  XIAO_LIUREN_COUNT_SEQUENCE,
  buildCountStepDelays as buildCountStepDelaysCore,
  buildXiaoLiurenCountPath as buildCountPathCore,
  calculateXiaoLiuren as calculateCore,
  getChineseHour as getChineseHourCore,
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
