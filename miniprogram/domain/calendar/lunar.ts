export interface LunarDate {
  lunarMonth: number
  lunarDay: number
}

export function getLunarDateFromLocalDate(date: Date = new Date()): LunarDate {
  // Calendar conversion adapter boundary. Production release requires a verified lunar implementation.
  return {
    lunarMonth: date.getMonth() + 1,
    lunarDay: date.getDate(),
  }
}
