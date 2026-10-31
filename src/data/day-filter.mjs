import {lookupDayGua} from './gua-ying.mjs';

/** 页面只查询当月已经生成的日期，不重复触发历法计算。 */
export function matchesDay(item, rawKeyword) {
  const keyword = String(rawKeyword ?? '').trim().toLocaleLowerCase();
  if (!keyword) return true;
  const gua = lookupDayGua(item.dayCycle);
  const text = [
    item.iso, item.dayCycle, item.duty, item.star27,
    item.lunarName, item.lunarMonthName, item.term, item.festival,
    gua?.gua, gua?.ying
  ].filter(Boolean).join(' ').toLocaleLowerCase();
  // The preflight accepts space-separated terms: each must occur in one day.
  return keyword.split(/\s+/).every(part => text.includes(part));
}
