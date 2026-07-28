import {
  getDailyAlmanacFromTables,
  getLunarDateFromTable,
} from './almanac.core'
import lunarDaysTable from './lunar-days.data'
import almanacTable from './almanac.data'

const almanacActivityBytes = new Uint8Array(wx.base64ToArrayBuffer(almanacTable.activitySlots))

export function getLunarDateFromLocalDateCore(date: Date = new Date()) {
  return getLunarDateFromTable(lunarDaysTable, date)
}

export function getDailyAlmanac(date: Date = new Date()) {
  return getDailyAlmanacFromTables(lunarDaysTable, almanacTable, almanacActivityBytes, date)
}
