import type { XiaoLiurenSymbol } from '../rules/types'

export interface SymbolTemplate {
  oracleText: string
  explanation: string
  actionHint: string
}

export const symbolTemplates: Record<XiaoLiurenSymbol, SymbolTemplate[]> = {
  大安: [
    {
      oracleText: '稳处见机，静中有进。',
      explanation: '此象偏稳，适合先守住节奏，再从确定的小事推进。',
      actionHint: '今天先把手中已有的事理顺。',
    },
    {
      oracleText: '根基既定，徐行可至。',
      explanation: '眼下气机平稳，不必追求骤变，把已有基础照看好更为重要。',
      actionHint: '先完成一件能稳住局面的事。',
    },
    {
      oracleText: '守正安然，次第自明。',
      explanation: '此时适合按原有次序推进，少一些摇摆，事情会逐渐清楚。',
      actionHint: '列出先后顺序，只推进眼前一步。',
    },
  ],
  留连: [
    {
      oracleText: '事有牵连，不宜催逼。',
      explanation: '此象偏缓，问题可能仍在拉扯中，急于定论反而容易失真。',
      actionHint: '先观察一轮，不急着表态。',
    },
    {
      oracleText: '线索未齐，且待回环。',
      explanation: '局面仍有未显之处，时势尚未收束，贸然推进容易反复。',
      actionHint: '给关键的人或信息留一点回应时间。',
    },
    {
      oracleText: '水行有滞，缓步观澜。',
      explanation: '牵连之象重在耐心辨别，先看清阻力来自何处，再决定去留。',
      actionHint: '暂停追加投入，复核一次前提。',
    },
  ],
  速喜: [
    {
      oracleText: '喜信将近，顺势而行。',
      explanation: '此象偏动，适合接住出现的机会，但仍需保持分寸。',
      actionHint: '看到明确机会时，可以小步推进。',
    },
    {
      oracleText: '风来帆动，机缘渐显。',
      explanation: '时势正在转快，已有信号值得回应，但行动仍宜简洁明确。',
      actionHint: '及时回复一个已经明确的机会。',
    },
    {
      oracleText: '明意初至，趁势轻行。',
      explanation: '此象有开朗之意，适合借当前气机向前试一步，再观察反馈。',
      actionHint: '把想法变成一个今天能完成的尝试。',
    },
  ],
  赤口: [
    {
      oracleText: '言多生隙，慎口慎行。',
      explanation: '此象提醒沟通摩擦，尤其要避免冲动回应。',
      actionHint: '重要的话晚一点再说，先确认事实。',
    },
    {
      oracleText: '锋芒易起，静语为宜。',
      explanation: '眼下言语容易被放大，先收住情绪，才能让真实意图被听见。',
      actionHint: '回复前重读一遍，把判断改成事实。',
    },
    {
      oracleText: '声急则乱，退步听真。',
      explanation: '分歧未必来自立场，也可能来自节奏和误解，宜先听后答。',
      actionHint: '先问清对方的意思，再表达自己的边界。',
    },
  ],
  小吉: [
    {
      oracleText: '小有助力，可试可进。',
      explanation: '此象偏吉，但更适合轻试探，不适合一次押上全部。',
      actionHint: '先做一个低成本尝试。',
    },
    {
      oracleText: '微光可循，小进有益。',
      explanation: '助力已在近处显现，适合从容易验证的地方开始，逐步积累把握。',
      actionHint: '选一个可回退的方案先试一次。',
    },
    {
      oracleText: '得一分助，行一分程。',
      explanation: '此象贵在适度，顺着已有条件前进即可，不宜把小势放大成重注。',
      actionHint: '把目标缩小到今天能够验证的范围。',
    },
  ],
  空亡: [
    {
      oracleText: '象落空处，宜止宜察。',
      explanation: '此象提醒信息不足或预期落空，适合先停下补齐判断依据。',
      actionHint: '暂缓决定，先收集缺失信息。',
    },
    {
      oracleText: '虚处未定，静候实情。',
      explanation: '目前所见可能仍是设想，先分清事实与期待，答案才有落脚之处。',
      actionHint: '写下已知与猜测，不在猜测上做决定。',
    },
    {
      oracleText: '雾重形隐，且收其心。',
      explanation: '气机尚虚，继续追逐结论只会增加消耗，宜先回到可掌握之事。',
      actionHint: '放下一项暂时无法确认的安排。',
    },
  ],
}

export const disclaimer = '仅供传统文化体验与自我参考。'
