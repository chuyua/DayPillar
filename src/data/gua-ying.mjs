/**
 * 用户确认的 60 条关系：保持顺序、对应名称及 /n 分隔符。
 * 2026-10-28 按用户明确要求，将两处卦名统一为《周易》通行写法：
 * 「火雷噬磕」→「火雷噬嗑」、「山天大蓄」→「山天大畜」。
 * 这 60 条不是「完整 64 卦」，不能凭空补 4 个缺项。
 * 用户确认按六十甲子顺序对应：甲子日即第 1 条（天风姤 / 天罡）。
 */
export const GUA_YING = Object.freeze([
  "天风姤/n天罡", "泽风大过/n朱厌", "火风鼎/n困敦", "雷风恒/n九天", "巽为风/n阏逢",
  "水风井/n穷奇", "山风蛊/n饮原", "地风升/n赤奋若", "天水讼/n天蓬", "泽水困/n白泽",
  "雷水解/n梼杌", "风水涣/n狍鸮", "坎为水/n提摄格", "山水蒙/n天芮", "地水师/n旃蒙",
  "天山遁/n狰", "泽山咸/n隗知", "火山旅/n单阏", "雷山小过/n太阳", "风山渐/n柔兆",
  "水山蹇/n狞", "艮为山/n魑", "地山谦/n执徐", "天地否/n天冲", "泽地萃/n强围",
  "火地晋/n犬因", "雷地豫/n魅", "风地观/n大荒落", "水地比/n天辅", "山地剥/n著雍",
  "地雷复/n亡", "山雷颐/n魍", "水雷屯/n敦祥", "风雷益/n九地", "震为雷/n天禽",
  "火雷噬嗑/n甪端", "泽雷随/n蜚瘟", "天雷无妄/n魉", "地火明夷/n协洽", "山火贲/n天心",
  "风火家人/n屠维", "雷火丰/n虚耗", "离为火/n鬼车", "泽火革/n涒滩", "天火同人/n天柱",
  "地泽临/n上章", "山泽损/n傲狠", "水泽节/n作噩", "风泽中孚/n太阴", "雷泽归妹/n昭阳",
  "火泽睽/n诸怀", "兑为泽/n淹茂", "天泽履/n天任", "地天泰/n重光", "山天大畜/n九婴",
  "水天需/n大渊献", "风天小畜/n天英", "雷天大壮/n元黓", "火天大有/n飞廉", "泽天夬/n空"
]);

const STEMS = Object.freeze(['甲','乙','丙','丁','戊','己','庚','辛','壬','癸']);
const BRANCHES = Object.freeze(['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥']);
export const DAY_CYCLES = Object.freeze(
  Array.from({length: 60}, (_, index) => STEMS[index % 10] + BRANCHES[index % 12])
);
const ENTRIES = Object.freeze(GUA_YING.map((raw, index) => {
    const [gua, ying] = raw.split('/n');
    return Object.freeze({ index: index + 1, dayCycle: DAY_CYCLES[index], gua, ying, raw });
  }));
const BY_DAY_CYCLE = new Map(ENTRIES.map(entry => [entry.dayCycle, entry]));

export function guaEntries() {
  return ENTRIES;
}

export function lookupDayGua(dayCycle) {
  return BY_DAY_CYCLE.get(dayCycle) ?? null;
}
