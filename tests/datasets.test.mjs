import test from 'node:test';
import assert from 'node:assert/strict';
import {lookupTraditionalStar, TRADITIONAL_STARS, MONTH_STARTS} from '../src/data/stars.mjs';
import {GUA_YING, DAY_CYCLES, guaEntries, lookupDayGua} from '../src/data/gua-ying.mjs';
import {getHexagramLines, renderHexagram} from '../src/data/hexagram.mjs';
import {matchesDay} from '../src/data/day-filter.mjs';
import {boundedCacheGet} from '../src/data/bounded-cache.mjs';

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

test('用户确认的 60 组 GUA_YING 按原字面和顺序保留', () => {
  const entries = guaEntries();
  assert.equal(GUA_YING.length, 60);
  assert.equal(entries[0].raw, '天风姤/n天罡');
  assert.equal(entries[12].raw, '坎为水/n提摄格');
  assert.equal(entries[35].raw, '火雷噬磕/n甪端');
  assert.equal(entries[54].raw, '山天大蓄/n九婴');
  assert.equal(entries[59].raw, '泽天夬/n空');
  assert.ok(entries.every(e => e.gua && e.ying && e.raw === `${e.gua}/n${e.ying}`));
  assert.equal(new Set(entries.map(e => e.gua)).size, 60);
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
  assert.equal(getHexagramLines('无名之卦'), null);
  assert.equal(renderHexagram('无名之卦'), '');
  for (const entry of guaEntries()) {
    const lines = getHexagramLines(entry.gua);
    assert.equal(lines?.length, 6, `Cannot draw ${entry.gua}`);
    const svg = renderHexagram(entry.gua);
    assert.match(svg, /<svg class="hexagram-figure"/);
    assert.match(svg, /aria-label="六爻卦象图"/);
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
