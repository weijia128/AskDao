import type { QuestionType, RuleResult } from '../rules/types'

export interface InterpretationContext {
  questionType: QuestionType
  questionText?: string
  tone: 'mysterious' | 'calm'
  variantIndex?: number
  selectionKey?: string
}

export interface InterpretationResult {
  title: string
  oracleText: string
  explanation: string
  actionHint: string
  disclaimer: string
}

export interface InterpretationProvider {
  generate(ruleResult: RuleResult, context: InterpretationContext): Promise<InterpretationResult>
}
