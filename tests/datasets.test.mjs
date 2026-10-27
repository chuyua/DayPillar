import test from 'node:test';
import assert from 'node:assert/strict';
import {lookupTraditionalStar, TRADITIONAL_STARS, MONTH_STARTS} from '../src/data/stars.mjs';
import {GUA_YING, guaEntries} from '../src/data/gua-ying.mjs';

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
