import { Solar } from 'lunar-javascript'

import {
  getDailyAlmanacFromSolar,
  getLunarDateFromSolar,
} from './almanac.core'

export function getLunarDateFromLocalDateCore(date: Date = new Date()) {
  return getLunarDateFromSolar(Solar, date)
}

export function getDailyAlmanac(date: Date = new Date()) {
  return getDailyAlmanacFromSolar(Solar, date)
}
