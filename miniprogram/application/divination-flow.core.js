import { buildDivinationPeriodKey } from '../domain/rules/xiao-liuren.core.js'

export function getRecordPeriodKey(record) {
  if (typeof record?.period_key === 'string' && record.period_key) {
    return record.period_key
  }

  // 兼容旧记录：按 created_at + hour_index 重建 periodKey。
  // 注意旧记录的 hour_index 是按设备本地时区计算的，非东八区设备上可能与
  // 新的上海时区算法差一个时辰——后果仅是误判为「非重复」并正常起课，无害。
  const createdAt = record?.rule_result?.created_at || record?.created_at
  const hourIndex = record?.rule_result?.input_snapshot?.hour_index
  if (!createdAt || !Number.isInteger(hourIndex)) {
    return ''
  }

  try {
    return buildDivinationPeriodKey(createdAt, hourIndex)
  } catch (error) {
    return ''
  }
}

// 每一次起念都是独立一问：同时辰重复不再拦截复用，
// 照常起课、存档、计次，只用 isRepeat 标记「结果与前次相同」作展示提示。
export function resolveDivinationAttempt({ periodKey, latestRecord, dailyUsage }) {
  if (!dailyUsage || dailyUsage.remaining <= 0) {
    return {
      outcome: 'limit',
      isRepeat: false,
    }
  }

  const isRepeat = Boolean(periodKey) && getRecordPeriodKey(latestRecord) === periodKey

  return {
    outcome: 'proceed',
    isRepeat,
  }
}
