import { getChineseHour } from '../rules/xiao-liuren'

export function getCurrentChineseHour(date: Date = new Date()) {
  return getChineseHour(date.getHours())
}
