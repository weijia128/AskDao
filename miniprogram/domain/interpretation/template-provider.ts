import type { InterpretationContext, InterpretationProvider, InterpretationResult } from './provider'
import { disclaimer, symbolTemplates } from './templates'
import type { RuleResult } from '../rules/types'

export class TemplateInterpretationProvider implements InterpretationProvider {
  async generate(ruleResult: RuleResult, context: InterpretationContext): Promise<InterpretationResult> {
    const template = symbolTemplates[ruleResult.symbol]

    return {
      title: `${ruleResult.symbol} · ${ruleResult.grade}`,
      oracleText: template.oracleText,
      explanation: template.explanation,
      actionHint: template.actionHint,
      reflectionQuestion: context.questionType === 'open'
        ? template.reflectionQuestion
        : `关于这个问题，${template.reflectionQuestion}`,
      disclaimer,
    }
  }
}
