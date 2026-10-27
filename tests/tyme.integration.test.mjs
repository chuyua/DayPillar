/** 依赖真实 tyme4ts；npm install 后运行 npm run test:integration */
import test from 'node:test';
import assert from 'node:assert/strict';
import {SolarDay, LunarDay} from 'tyme4ts';
import {lookupTraditionalStar} from '../src/data/stars.mjs';
import {DAY_CYCLES, lookupDayGua} from '../src/data/gua-ying.mjs';

test('2024-02-10 公历转换为农历正月初一',() => {
  const date = SolarDay.fromYmd(2024,2,10);
  const lunar = date.getLunarDay();
  assert.equal(lunar.getYear(),2024);
  assert.equal(lunar.getLunarMonth().getMonthValue(),1);
  assert.equal(lunar.getDay(),1);
  assert.equal(lookupTraditionalStar(1,1),'室宿');
});

test('闰二月保持 signed month -2；XLSX 延用二月专列',() => {
  const leap = LunarDay.fromYmd(2023,-2,1);
  assert.equal(leap.getLunarMonth().getMonthValue(),-2);
  assert.equal(leap.getSolarDay().toString(),'2023年3月22日');
  assert.equal(lookupTraditionalStar(-2,1),'奎宿');
});

test('每日建除、黄黑道、节气由 tyme4ts 计算',() => {
  const d = SolarDay.fromYmd(2024,2,10);
  const cycle = d.getSixtyCycleDay();
  assert.ok(cycle.getDuty().getName().length > 0);
  assert.ok(cycle.getTwelveStar().getEcliptic().getName().length > 0);
  assert.ok(d.getTermDay().getSolarTerm().getName().length > 0);
});

test('tyme4ts 真实日干支与卦象连续 120 天对应并自动循环', () => {
  const first = SolarDay.fromYmd(2024, 2, 10).getSixtyCycleDay().getSixtyCycle().getName();
  const startIndex = DAY_CYCLES.indexOf(first);
  assert.ok(startIndex >= 0);
  for (let offset = 0; offset < 120; offset++) {
    const date = new Date(Date.UTC(2024, 1, 10 + offset));
    const cycle = SolarDay.fromYmd(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate())
      .getSixtyCycleDay().getSixtyCycle().getName();
    const index = (startIndex + offset) % 60;
    assert.equal(cycle, DAY_CYCLES[index]);
    assert.equal(lookupDayGua(cycle)?.index, index + 1);
  }
});
