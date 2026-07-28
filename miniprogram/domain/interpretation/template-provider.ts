import type { InterpretationContext, InterpretationProvider, InterpretationResult } from './provider'
import { disclaimer, symbolTemplates } from './templates'
import { selectTemplateVariant } from './template-provider.core'
import { getTraditionalVerdicts } from './traditional-verdicts'
import { selectStableVerdict } from './traditional-verdicts.core'
import type { RuleResult } from '../rules/types'

export class TemplateInterpretationProvider implements InterpretationProvider {
  async generate(ruleResult: RuleResult, context: InterpretationContext): Promise<InterpretationResult> {
    const templates = symbolTemplates[ruleResult.symbol]
    const template = selectTemplateVariant(templates, context.variantIndex)
    const verdicts = getTraditionalVerdicts(ruleResult.symbol, 'general')
    const verdict = selectStableVerdict(
      verdicts,
      `${context.selectionKey || ruleResult.created_at}:${context.questionType}:${ruleResult.symbol}`,
      context.variantIndex,
    )

    return {
      title: `${ruleResult.symbol} · ${ruleResult.grade}`,
      oracleText: template.oracleText,
      explanation: `${verdict.summary}${verdict.trend}`,
      actionHint: verdict.advice,
      disclaimer,
    }
  }
}
