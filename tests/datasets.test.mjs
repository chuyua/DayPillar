import test from 'node:test';
import assert from 'node:assert/strict';
import {lookupTraditionalStar, TRADITIONAL_STARS, MONTH_STARTS} from '../src/data/stars.mjs';
import {GUA_YING, DAY_CYCLES, guaEntries, lookupDayGua} from '../src/data/gua-ying.mjs';
import {getHexagramLines, renderHexagram} from '../src/data/hexagram.mjs';
import {matchesDay} from '../src/data/day-filter.mjs';
import {boundedCacheGet} from '../src/data/bounded-cache.mjs';
import {hexagramIntroNames,lookupHexagramIntro,lookupShanhaiBeast,shanhaiBeasts,lookupCultureEntry,culturalEntries} from '../src/data/cultural-notes.mjs';
import {deriveTraditionalAlmanac} from '../src/data/traditional-almanac.mjs';

test('唐月将与古法月厌、厌对、黄黑道相互独立，寅月辰日同时金匮与厌对', () => {
  const before = deriveTraditionalAlmanac('庚寅','丙辰','立春');
  assert.equal(before.monthNumber,1);
  assert.equal(before.monthBranch,'寅');
  assert.equal(before.monthYan,'戌');
  assert.equal(before.yanDui,'辰');
  assert.equal(before.hitMonthYan,false);
  assert.equal(before.hitYanDui,true);
  assert.equal(before.twelveStar,'金匮');
  assert.equal(before.ecliptic,'黄道');
  assert.equal(before.generalName,'神后'); // 雨水尚未到，不能用正月亥将
  assert.equal(before.generalBranch,'子');
  assert.equal(before.generalBoundary,'大寒');
  assert.equal(before.tianGang,'巳');  // 阳月平日，不能将厌对辰等同天罡
  assert.equal(before.heKui,'亥');
  assert.equal(before.hitTianGang,false);
  const after = deriveTraditionalAlmanac('庚寅','戊辰','雨水');
  assert.equal(after.twelveStar,'金匮');
  assert.equal(after.hitYanDui,true);
  assert.equal(after.generalName,'登明');
  assert.equal(after.generalBranch,'亥');
  assert.equal(after.generalBoundary,'雨水');
});

test('月厌及对冲按十二月逆转，月内天罡／河魁按阴阳月交换平收位', () => {
  const branches='寅卯辰巳午未申酉戌亥子丑'.split('');
  const months=new Set();
  for(let i=0;i<12;i++){
    const entry=deriveTraditionalAlmanac('甲'+branches[i],'甲子','大寒');
    assert.equal(entry.monthNumber,i+1);
    months.add(entry.monthYan);
    assert.equal(entry.yanDui,branches[(2-i+12)%12]); // 正月辰起，逆行十二辰
    const expectYang=i%2===0;
    const labels = expectYang ? ['巳','亥'] : ['子','午'];
    if(i===0)assert.deepEqual([entry.tianGang,entry.heKui],labels);
    if(i===1)assert.deepEqual([entry.tianGang,entry.heKui],labels);
    assert.equal(entry.hitMonthYan,entry.monthYan==='子');
    assert.equal(entry.hitYanDui,entry.yanDui==='子');
  }
  assert.equal(months.size,12);
  for(const x of [
    ['甲x','甲子','立春'],['甲寅','甲x','雨水'],['甲寅','甲辰','无此节气']
  ])assert.equal(deriveTraditionalAlmanac(...x),null);
});

test('十二中气月将依唐《太白阴经》十二月名表，节日不提前换将', () => {
  const starts=['大寒','雨水','春分','谷雨','小满','夏至','大暑','处暑','秋分','霜降','小雪','冬至'];
  const nextTerms=['立春','惊蛰','清明','立夏','芒种','小暑','立秋','白露','寒露','立冬','大雪','小寒'];
  const generals=['神后子','登明亥','河魁戌','从魁酉','传送申','小吉未','胜光午','太乙巳','天罡辰','太冲卯','功曹寅','大吉丑'];
  for(let i=0;i<12;i++){
    const original=deriveTraditionalAlmanac('甲寅','甲子',starts[i]);
    const still=deriveTraditionalAlmanac('甲寅','甲子',nextTerms[i]);
    assert.equal(original.generalName+original.generalBranch,generals[i],starts[i]);
    assert.equal(still.generalName+still.generalBranch,generals[i],nextTerms[i]);
    assert.equal(still.generalBoundary,starts[i]);
  }
});

test('有界缓存：命中不重算、最近访问保留、异常不污染数据', () => {
  const cache=new Map();
  let calls=0;
  const load=key => boundedCacheGet(cache,key,3,() => ({key,n:++calls}));
  const first=load('a');
  load('b');
  load('c');
  assert.equal(load('a'),first);
  assert.equal(calls,3);
  load('d');
  assert.equal(cache.size,3);
  assert.equal(cache.has('b'),false);
  load('b');
  assert.equal(calls,5);
  assert.ok(cache.size <= 3);
  assert.throws(() => boundedCacheGet(cache,'error',3,() => {throw Error('failed');}),/failed/);
  assert.equal(cache.has('error'),false);
});

test('公开二十七宿规则：27 唯一宿名、12 个月首宿', () => {
  assert.equal(TRADITIONAL_STARS.length, 27);
  assert.equal(new Set(TRADITIONAL_STARS).size, 27);
  assert.ok(!TRADITIONAL_STARS.includes('牛'));
  assert.deepEqual(MONTH_STARTS, ['室','奎','胃','毕','参','鬼','张','角','氐','心','斗','虚']);
});

test('农历月日轮转：12 个月 × 30 天，闰月同月口径', () => {
  for (let month = 1; month <= 12; month++) {
    const first = TRADITIONAL_STARS.indexOf(MONTH_STARTS[month - 1]);
    for (let day = 1; day <= 30; day++) {
      const expected = TRADITIONAL_STARS[(first + day - 1) % 27] + '宿';
      assert.equal(lookupTraditionalStar(month, day), expected);
      assert.equal(lookupTraditionalStar(-month, day), expected);
    }
  }
  assert.equal(lookupTraditionalStar(1, 1), '室宿');
  assert.equal(lookupTraditionalStar(1, 28), '室宿');
  assert.equal(lookupTraditionalStar(1, 30), '奎宿');
});

test('非法月日必须拒绝，不能落入错误数组元素', () => {
  for (const [month, day] of [[0,1],[13,1],[-13,1],[1,0],[1,31],[1.2,1],[1,NaN]]) {
    assert.throws(() => lookupTraditionalStar(month, day), RangeError);
  }
});

test('用户确认的 60 组 GUA_YING 只规范两处卦名，不改变顺序和对应名称', () => {
  const entries = guaEntries();
  assert.equal(GUA_YING.length, 60);
  assert.equal(entries[0].raw, '天风姤/n天罡');
  assert.equal(entries[12].raw, '坎为水/n提摄格');
  assert.equal(entries[35].raw, '火雷噬嗑/n甪端');
  assert.equal(entries[54].raw, '山天大畜/n九婴');
  assert.equal(entries[59].raw, '泽天夬/n空');
  assert.ok(entries.every(e => e.gua && e.ying && e.raw === `${e.gua}/n${e.ying}`));
  assert.equal(new Set(entries.map(e => e.gua)).size, 60);
  assert.ok(!GUA_YING.some(x => x.includes('噬磕') || x.includes('大蓄')),
    '不能再次将两处卦名回退到旧字形');
});

test('日干支与 60 组卦象逐项对应，甲子日必须是天风姤／天罡', () => {
  const entries = guaEntries();
  assert.equal(DAY_CYCLES.length, 60);
  assert.equal(new Set(DAY_CYCLES).size, 60);
  assert.equal(DAY_CYCLES[0], '甲子');
  assert.equal(DAY_CYCLES[1], '乙丑');
  assert.equal(DAY_CYCLES[59], '癸亥');
  assert.deepEqual(lookupDayGua('甲子'), entries[0]);
  assert.equal(lookupDayGua('甲子').gua, '天风姤');
  assert.equal(lookupDayGua('甲子').ying, '天罡');
  assert.equal(lookupDayGua('乙丑').ying, '朱厌');
  assert.equal(lookupDayGua('癸亥').ying, '空');
  for (let i = 0; i < entries.length; i++) {
    assert.equal(entries[i].dayCycle, DAY_CYCLES[i]);
    assert.equal(lookupDayGua(DAY_CYCLES[i]), entries[i]);
  }
  assert.equal(lookupDayGua('不存在'), null);
  assert.equal(lookupDayGua('甲子日'), null);
});

test('六爻 SVG 按八卦上下三爻正确绘制，不修改原始卦名', () => {
  assert.deepEqual(getHexagramLines('天风姤'), [true,true,true,true,true,false]);
  assert.deepEqual(getHexagramLines('泽风大过'), [false,true,true,true,true,false]);
  assert.deepEqual(getHexagramLines('坎为水'), [false,true,false,false,true,false]);
  assert.deepEqual(getHexagramLines('巽为风'), [true,true,false,true,true,false]);
  assert.deepEqual(getHexagramLines('离为火'), [true,false,true,true,false,true]);
  assert.deepEqual(getHexagramLines('火雷噬嗑'), [true,false,true,false,false,true]);
  assert.deepEqual(getHexagramLines('山天大畜'), [true,false,false,true,true,true]);
  assert.equal(getHexagramLines('无名之卦'), null);
  assert.equal(renderHexagram('无名之卦'), '');
  for (const entry of guaEntries()) {
    const lines = getHexagramLines(entry.gua);
    assert.equal(lines?.length, 6, `Cannot draw ${entry.gua}`);
    const svg = renderHexagram(entry.gua);
    assert.match(svg, /<svg class="hexagram-figure"/);
    assert.ok(svg.includes(`aria-label="${entry.gua}六爻卦象图"`));
    assert.equal((svg.match(/\sy="/g) ?? []).length >= 6, true);
  }
});

test('查询只高亮匹配当月日期：支持干支、二十七宿、卦名、对应名称', () => {
  const sample = {
    iso:'2026-10-27',dayCycle:'甲子',duty:'建',star27:'角宿',
    lunarName:'初一',lunarMonthName:'九月',term:null,festival:null
  };
  for (const query of ['甲子','角宿','天风姤','天罡','2026-10',' 建 ','']) {
    assert.equal(matchesDay(sample,query),true,`Expected query ${query}`);
  }
  for (const query of ['乙丑','室宿','朱厌','腊月']) {
    assert.equal(matchesDay(sample,query),false,`Unexpected query ${query}`);
  }
});

test('规范卦名可以按甲子映射检索，其他对应名称保持不变', () => {
  const bite = guaEntries()[35];
  const store = guaEntries()[54];
  assert.equal(lookupDayGua(bite.dayCycle).ying, '甪端');
  assert.equal(lookupDayGua(store.dayCycle).ying, '九婴');
  for (const [entry, name] of [[bite,'火雷噬嗑'],[store,'山天大畜']]) {
    assert.equal(entry.gua, name);
    assert.equal(matchesDay({
      iso:'2026-10-27',dayCycle:entry.dayCycle,duty:'建',star27:'角宿',
      lunarName:'初一',lunarMonthName:'九月',term:null,festival:null
    },name),true);
  }
});

test('每条六十甲子卦象有唯一的简短介绍，保留通行卦名和原映射', () => {
  const entries = guaEntries();
  const intros = hexagramIntroNames();
  assert.equal(intros.length, 60);
  assert.equal(new Set(intros).size, 60);
  assert.deepEqual(new Set(intros), new Set(entries.map(e=>e.gua)));
  for (const entry of entries) {
    const intro = lookupHexagramIntro(entry.gua);
    assert.equal(typeof intro, 'string');
    assert.ok(intro.length >= 10 && intro.length < 80, `Intro length: ${entry.gua}`);
  }
  assert.match(lookupHexagramIntro('火雷噬嗑'), /阻碍/);
  assert.match(lookupHexagramIntro('山天大畜'), /积/);
  assert.equal(lookupHexagramIntro('火雷噬磕'), null);
  assert.equal(lookupHexagramIntro('不存在'), null);
});

test('山海经异兽介绍只收录目录中与 60 甲子精确匹配的 17 条异兽，链接指向原词条', () => {
  const beasts = shanhaiBeasts();
  const names = new Set(guaEntries().map(e=>e.ying));
  assert.equal(beasts.length, 17);
  assert.equal(new Set(beasts.map(b=>b.name)).size, 17);
  for (const beast of beasts) {
    assert.ok(names.has(beast.name), `Unmapped beast: ${beast.name}`);
    assert.equal(lookupShanhaiBeast(beast.name), beast);
    assert.match(beast.source, /^https:\/\/tgqmdj\.cn\/dadian_show\.php\?did=(7|8)&sid=\d+$/);
    assert.ok(beast.description.length >= 12 && beast.description.length < 100);
  }
  assert.match(lookupShanhaiBeast('狍鸮').source, /did=8&sid=54$/);
  assert.match(lookupShanhaiBeast('甪端').source, /did=7&sid=30$/);
  assert.match(lookupShanhaiBeast('九婴').source, /did=7&sid=41$/);
  for (const nonBeast of ['天罡','九地','魑','魅','魍','魉','虚耗','空','不存在']) {
    assert.equal(lookupShanhaiBeast(nonBeast), null, `Not a beast: ${nonBeast}`);
  }
});

test('异兽和神煞介绍覆盖全部 60 个原始对应名称，分类与来源可追溯', () => {
  const originals = guaEntries();
  const records = culturalEntries();
  assert.equal(records.length, 60);
  assert.deepEqual(new Set(records.map(entry => entry.name)),new Set(originals.map(entry => entry.ying)));
  for (const original of originals) {
    const record = lookupCultureEntry(original.ying);
    assert.ok(record, `Missing: ${original.ying}`);
    assert.equal(record.name, original.ying);
    assert.ok(record.category.length >= 3);
    assert.ok(record.description.length > 15);
    assert.match(record.source, /^https:\/\/tgqmdj\.cn\/dadian_show\.php\?did=(5|6|7|8|9|10)&sid=\d+$/);
    assert.equal(Object.isFrozen(record),true);
  }
  const counts = Object.fromEntries(
    [...new Set(records.map(entry=>entry.category))].map(category=>
      [category,records.filter(entry=>entry.category===category).length])
  );
  assert.deepEqual(counts,{
    '异兽 / 神兽':17,'神煞与术数':5,'奇门九星':9,'神怪传说':5,
    '空亡术语':2,'岁阳 · 天干纪名':10,'岁阴 · 地支纪名':12
  });
  assert.equal(lookupCultureEntry('不存在'),null);
});

test('新增术语依据词典原条目；异兽、九星、空亡、岁名不混为一类', () => {
  for (const [name,category,did,sid] of [
    ['天罡','神煞与术数',6,13],
    ['九天','神煞与术数',6,14],
    ['天蓬','奇门九星',6,24],
    ['魑','神怪传说',7,26],
    ['九地','神煞与术数',7,25],
    ['虚耗','神怪传说',7,31],
    ['太阴','神煞与术数',9,60],
    ['太阳','神煞与术数',10,79],
    ['提摄格','岁阴 · 地支纪名',9,64],
    ['强围','岁阳 · 天干纪名',10,84],
    ['涒滩','岁阴 · 地支纪名',9,74],
    ['亡','空亡术语',5,264],
    ['空','空亡术语',5,264],
    ['狍鸮','异兽 / 神兽',8,54],
    ['九婴','异兽 / 神兽',7,41]
  ]) {
    const entry = lookupCultureEntry(name);
    assert.equal(entry.category,category);
    assert.equal(entry.source,`https://tgqmdj.cn/dadian_show.php?did=${did}&sid=${sid}`);
  }
  for (const name of ['提摄格','强围','敦祥','淹茂','元黓']) {
    assert.match(lookupCultureEntry(name).description,/原映射/);
  }
  assert.match(lookupCultureEntry('亡').description,/并非判断本日/);
});
