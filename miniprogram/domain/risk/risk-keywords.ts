export const riskKeywords = {
  medical: ['癌', '疾病', '症状', '诊断', '吃药', '手术'],
  finance: ['股票', '彩票', '投资', '借钱', '贷款', '暴富'],
  life: ['死亡', '自杀', '自残', '活不下去'],
  legal: ['违法', '坐牢', '起诉', '判刑'],
} as const

export type RiskCategory = keyof typeof riskKeywords
