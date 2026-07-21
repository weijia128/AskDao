import type { InterpretationResult } from '../domain/interpretation/provider'
import type { RuleResult } from '../domain/rules/types'

export function buildResultViewModel(ruleResult: RuleResult, interpretation: InterpretationResult) {
  return {
    grade: ruleResult.grade,
    symbol: ruleResult.symbol,
    title: interpretation.title,
    oracleText: interpretation.oracleText,
    explanation: interpretation.explanation,
    actionHint: interpretation.actionHint,
    reflectionQuestion: interpretation.reflectionQuestion,
    disclaimer: interpretation.disclaimer,
  }
}
