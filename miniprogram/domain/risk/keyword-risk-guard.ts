import { riskKeywords, type RiskCategory } from './risk-keywords'

export interface RiskGuardResult {
  safe: boolean
  categories: RiskCategory[]
  message?: string
}

export function checkQuestionRisk(questionText = ''): RiskGuardResult {
  const categories = Object.entries(riskKeywords)
    .filter(([, words]) => words.some((word) => questionText.includes(word)))
    .map(([category]) => category as RiskCategory)

  if (categories.length === 0) {
    return { safe: true, categories: [] }
  }

  return {
    safe: false,
    categories,
    message: '问道仅作为传统文化体验和自我参考。涉及健康、法律、财务或人身安全的问题，请咨询专业人士或及时寻求现实帮助。',
  }
}
