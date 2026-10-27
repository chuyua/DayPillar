import {SolarDay} from 'tyme4ts';
import {lookupTraditionalStar} from './data/stars.mjs';

export interface CalendarDay {
  iso: string;
  year: number;
  month: number;
  day: number;
  weekday: number;
  lunarName: string;
  lunarMonthName: string;
  monthSigned: number;
  lunarDay: number;
  lunarYear: number;
  lunarYearCycle: string;
  yearCycleByTerm: string;
  monthCycleByTerm: string;
  dayCycle: string;
  duty: string;
  star27: string;
  twelveStar: string;
  ecliptic: string;
  term: string | null;
  festival: string | null;
  zodiac: string;
}

export function formatISO(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}

export function parseISO(value: string): {year: number;month: number;day: number} | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1900 || year > 2100 || month < 1 || month > 12) return null;
  if (day < 1 || day > daysInMonth(year, month)) return null;
  return {year, month, day};
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function todayInChina(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const field = (k: string) => parts.find(p => p.type === k)?.value ?? '';
  return `${field('year')}-${field('month')}-${field('day')}`;
}

export function addMonths(year: number, month: number, offset: number): {year: number;month: number} {
  const index = year * 12 + (month - 1) + offset;
  return {year: Math.floor(index / 12), month: ((index % 12) + 12) % 12 + 1};
}

export function getCalendarDay(year: number, month: number, day: number): CalendarDay {
  const solar = SolarDay.fromYmd(year, month, day);
  const lunar = solar.getLunarDay();
  const lunarMonth = lunar.getLunarMonth();
  const cycleDay = solar.getSixtyCycleDay();
  const twelveStar = cycleDay.getTwelveStar();
  const termDay = solar.getTermDay();
  const monthSigned = lunarMonth.getMonthValue();
  const festival = lunar.getFestival()?.getName() ?? solar.getFestival()?.getName() ?? null;
  return {
    iso: formatISO(year, month, day),
    year, month, day,
    weekday: solar.getWeek().getIndex(),
    lunarName: lunar.getName(),
    lunarMonthName: lunarMonth.getName(),
    monthSigned,
    lunarDay: lunar.getDay(),
    lunarYear: lunar.getYear(),
    lunarYearCycle: lunarMonth.getLunarYear().getSixtyCycle().getName(),
    yearCycleByTerm: cycleDay.getYear().getName(),
    monthCycleByTerm: cycleDay.getMonth().getName(),
    dayCycle: cycleDay.getSixtyCycle().getName(),
    duty: cycleDay.getDuty().getName(),
    star27: lookupTraditionalStar(monthSigned, lunar.getDay()),
    twelveStar: twelveStar.getName(),
    ecliptic: twelveStar.getEcliptic().getName(),
    term: termDay.getDayIndex() === 0 ? termDay.getSolarTerm().getName() : null,
    festival,
    zodiac: solar.getConstellation().getName()
  };
}

/** 只为当前选中日期生成文化宜忌，不在月历批量循环中计算。 */
export function getDayTaboos(year: number, month: number, day: number): {
  recommends: string[];
  avoids: string[];
} {
  const cycle = SolarDay.fromYmd(year, month, day).getSixtyCycleDay();
  return {
    recommends: cycle.getRecommends().map(taboo => taboo.getName()),
    avoids: cycle.getAvoids().map(taboo => taboo.getName())
  };
}

export function getMonthCells(year: number, month: number): CalendarDay[] {
  const firstWeek = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  // 只生成本月可见的 5/6 周，避免重复初始化非必要的大量历法对象。
  const monthLength = daysInMonth(year, month);
  const cellsCount = Math.ceil((firstWeek + monthLength) / 7) * 7;
  const first = Date.UTC(year, month - 1, 1);
  const result: CalendarDay[] = [];
  for (let index = 0; index < cellsCount; index += 1) {
    const date = new Date(first + (index - firstWeek) * 86_400_000);
    result.push(getCalendarDay(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()));
  }
  return result;
}
