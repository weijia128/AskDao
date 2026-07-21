export type QuestionType =
  | 'daily_state'
  | 'work_choice'
  | 'interpersonal'
  | 'relationship'
  | 'decision'
  | 'open'

export type DivinationMethod = 'xiao_liuren'
export type ResultGrade = '阻' | '平' | '顺'
export type XiaoLiurenSymbol = '大安' | '留连' | '速喜' | '赤口' | '小吉' | '空亡'

export interface DivinationInput {
  method: DivinationMethod
  questionType: QuestionType
  questionText?: string
  startedAt: string
  timezone: 'Asia/Shanghai'
  source: 'daily' | 'quick' | 'share'
}

export interface RuleResult {
  method: DivinationMethod
  rule_version: 'xiao_liuren_v1'
  input_snapshot: {
    lunar_month: number
    lunar_day: number
    hour_branch: string
    hour_index: number
  }
  calculation: {
    formula: string
    result: number
  }
  symbol: XiaoLiurenSymbol
  grade: ResultGrade
  created_at: string
}
