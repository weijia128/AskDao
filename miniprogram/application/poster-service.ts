import type { InterpretationResult } from '../domain/interpretation/provider'
import type { RuleResult } from '../domain/rules/types'

export function buildSharePosterModel(ruleResult: RuleResult, interpretation: InterpretationResult) {
  return {
    template_id: 'A01' as const,
    type: 'result' as const,
    brand: '问道' as const,
    methodName: '小六壬' as const,
    grade: ruleResult.grade,
    symbol: ruleResult.symbol,
    oracleText: interpretation.oracleText,
    actionHint: interpretation.actionHint,
  }
}
