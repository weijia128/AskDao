const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

function pad(value) {
  return `${value}`.padStart(2, '0')
}

export function getLunarDateFromSolar(Solar, date = new Date()) {
  const lunar = Solar.fromYmd(date.getFullYear(), date.getMonth() + 1, date.getDate()).getLunar()

  return {
    lunarMonth: lunar.getMonth(),
    lunarDay: lunar.getDay(),
  }
}

export function getDailyAlmanacFromSolar(Solar, date = new Date()) {
  const solar = Solar.fromYmd(date.getFullYear(), date.getMonth() + 1, date.getDate())
  const lunar = solar.getLunar()
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()

  return {
    source: '6tail/lunar-javascript',
    dateKey: `${year}-${pad(month)}-${pad(day)}`,
    solarText: `${year}年${month}月${day}日`,
    weekdayText: WEEKDAYS[date.getDay()],
    lunarText: `农历${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`,
    ganzhiText: `${lunar.getYearInGanZhi()}年 ${lunar.getMonthInGanZhi()}月 ${lunar.getDayInGanZhi()}日`,
    zodiacText: `生肖${lunar.getYearShengXiao()}`,
    chongShaText: `冲${lunar.getChongDesc()} 煞${lunar.getSha()}`,
    yi: lunar.getDayYi().slice(0, 8),
    ji: lunar.getDayJi().slice(0, 8),
  }
}
