import { getLunarDateFromLocalDateCore } from './almanac'

export interface LunarDate {
  lunarMonth: number
  lunarDay: number
}

export function getLunarDateFromLocalDate(date: Date = new Date()): LunarDate {
  return getLunarDateFromLocalDateCore(date)
}
