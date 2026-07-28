import { getShanghaiChineseHour } from '../rules/xiao-liuren'

export function getCurrentChineseHour(date: Date = new Date()) {
  return getShanghaiChineseHour(date)
}
