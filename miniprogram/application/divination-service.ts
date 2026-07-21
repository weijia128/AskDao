import { getCurrentChineseHour } from '../domain/calendar/chinese-hour'
import { getLunarDateFromLocalDate } from '../domain/calendar/lunar'
import { TemplateInterpretationProvider } from '../domain/interpretation/template-provider'
import { checkQuestionRisk } from '../domain/risk/keyword-risk-guard'
import { calculateXiaoLiuren } from '../domain/rules/xiao-liuren'
import type { DivinationInput } from '../domain/rules/types'

export async function runXiaoLiurenDivination(input: DivinationInput) {
  const risk = checkQuestionRisk(input.questionText)
  if (!risk.safe) {
    return { ok: false as const, risk }
  }

  const startedAt = new Date(input.startedAt)
  const lunar = getLunarDateFromLocalDate(startedAt)
  const hour = getCurrentChineseHour(startedAt)
  const ruleResult = calculateXiaoLiuren({
    lunarMonth: lunar.lunarMonth,
    lunarDay: lunar.lunarDay,
    hourIndex: hour.index,
    hourBranch: hour.branch,
    createdAt: input.startedAt,
  })
  const interpretation = await new TemplateInterpretationProvider().generate(ruleResult, {
    questionType: input.questionType,
    questionText: input.questionText,
    tone: 'mysterious',
  })

  return { ok: true as const, ruleResult, interpretation }
}
