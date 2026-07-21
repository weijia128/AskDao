import type { XiaoLiurenSymbol } from '../rules/types'

export const symbolTemplates: Record<XiaoLiurenSymbol, {
  oracleText: string
  explanation: string
  actionHint: string
  reflectionQuestion: string
}> = {
  大安: {
    oracleText: '稳处见机，静中有进。',
    explanation: '此象偏稳，适合先守住节奏，再从确定的小事推进。',
    actionHint: '今天先把手中已有的事理顺。',
    reflectionQuestion: '哪一步是你已经能确定的小动作？',
  },
  留连: {
    oracleText: '事有牵连，不宜催逼。',
    explanation: '此象偏缓，问题可能仍在拉扯中，急于定论反而容易失真。',
    actionHint: '先观察一轮，不急着表态。',
    reflectionQuestion: '你是在等答案，还是在逃避确认？',
  },
  速喜: {
    oracleText: '喜信将近，顺势而行。',
    explanation: '此象偏动，适合接住出现的机会，但仍需保持分寸。',
    actionHint: '看到明确机会时，可以小步推进。',
    reflectionQuestion: '有什么信号已经比之前更清楚？',
  },
  赤口: {
    oracleText: '言多生隙，慎口慎行。',
    explanation: '此象提醒沟通摩擦，尤其要避免冲动回应。',
    actionHint: '重要的话晚一点再说，先确认事实。',
    reflectionQuestion: '你真正想表达的是立场，还是情绪？',
  },
  小吉: {
    oracleText: '小有助力，可试可进。',
    explanation: '此象偏吉，但更适合轻试探，不适合一次押上全部。',
    actionHint: '先做一个低成本尝试。',
    reflectionQuestion: '你能用什么小动作验证方向？',
  },
  空亡: {
    oracleText: '象落空处，宜止宜察。',
    explanation: '此象提醒信息不足或预期落空，适合先停下补齐判断依据。',
    actionHint: '暂缓决定，先收集缺失信息。',
    reflectionQuestion: '现在最不确定的事实是什么？',
  },
}

export const disclaimer = '问道结果仅作传统文化体验与自我参考，不作为现实决策的唯一依据。'
