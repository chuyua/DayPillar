/**
 * 古法历注的并行规则层；绝不修改 GUA_YING 固定六十甲子对应关系。
 *
 * 唐代直接依据：《太白阴经》卷十「推月将法」。
 * https://zh.wikisource.org/zh-hans/太白陰經/卷十
 * 唐《天宝历》月厌、厌对的佚文，见后世《御定星历考原》卷四：
 * https://zh.wikisource.org/zh-hans/御定星厯考原_(四庫全書本)/卷4
 * 黄黑二道及月建天罡河魁：见《御定星历考原》相关条目。
 *
 * 月建按「节」划界，月将按「中气」划界。当前页面仅选日期，不接收
 * 时刻，节气交接当日依 tyme4ts 的公历日口径，不声称精确到交节时刻。
 */
const BRANCHES = '子丑寅卯辰巳午未申酉戌亥'.split('');
const TWELVE = [
  '青龙','明堂','天刑','朱雀','金匮','天德',
  '白虎','玉堂','天牢','玄武','司命','勾陈'
];
const GOOD = new Set(['青龙','明堂','金匮','天德','玉堂','司命']);
// 中气对应月将，以大寒→神后为循环起点，避免把「立春」误当作「雨水」。
const SOLAR_TERMS = [
  '小寒','大寒','立春','雨水','惊蛰','春分',
  '清明','谷雨','立夏','小满','芒种','夏至',
  '小暑','大暑','立秋','处暑','白露','秋分',
  '寒露','霜降','立冬','小雪','大雪','冬至'
];
const MONTH_GENERALS = [
  ['神后','子'],['登明','亥'],['河魁','戌'],['从魁','酉'],
  ['传送','申'],['小吉','未'],['胜光','午'],['太乙','巳'],
  ['天罡','辰'],['太冲','卯'],['功曹','寅'],['大吉','丑']
];
const at = i => BRANCHES[((i % 12) + 12) % 12];

/** 对已计算的节令月干支与日干支，返回相互独立且可校验的传统规则。 */
export function deriveTraditionalAlmanac(monthCycle, dayCycle, recentSolarTerm) {
  const monthBranch = String(monthCycle).slice(-1);
  const dayBranch = String(dayCycle).slice(-1);
  const m = BRANCHES.indexOf(monthBranch);
  const d = BRANCHES.indexOf(dayBranch);
  const t = SOLAR_TERMS.indexOf(recentSolarTerm);
  if (m < 0 || d < 0 || t < 0) return null;

  const monthNumber = ((m - 2 + 12) % 12) + 1; // 寅建正月，丑建十二月
  const monthYan = at(10 - (monthNumber - 1));  // 正月戌，逆行
  const yanDui = at(BRANCHES.indexOf(monthYan) + 6);
  const dragonBase = (((m - 2 + 12) % 6) * 2); // 寅申月子起青龙
  const twelveStar = TWELVE[((d - dragonBase) + 12) % 12];
  const yangMonth = m % 2 === 0; // 子寅辰午申戌为阳月
  const tianGang = at(m + (yangMonth ? 3 : 9)); // 阳月平日，阴月收日
  const heKui = at(m + (yangMonth ? 9 : 3));
  // 节（偶序）沿用上一中气；中气（奇序）从该日起换将。
  const midIndex = t % 2 === 0 ? (t + 23) % 24 : t;
  const generalIndex = (midIndex + 23) % 24 / 2;
  const [generalName, generalBranch] = MONTH_GENERALS[generalIndex];
  return Object.freeze({
    monthBranch, monthNumber, dayBranch,
    monthYan, yanDui, hitMonthYan: dayBranch === monthYan,
    hitYanDui: dayBranch === yanDui,
    twelveStar, ecliptic: GOOD.has(twelveStar) ? '黄道' : '黑道',
    tianGang, heKui,
    hitTianGang: dayBranch === tianGang,
    hitHeKui: dayBranch === heKui,
    generalName, generalBranch,
    generalBoundary: SOLAR_TERMS[midIndex]
  });
}
