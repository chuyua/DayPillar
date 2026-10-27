import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, statSync} from 'node:fs';
import {join} from 'node:path';

test('GitHub Pages output has a project-relative base and intact hashed assets', () => {
  const html = readFileSync('dist/index.html', 'utf8');
  assert.match(html, /<html[^>]+lang="zh-CN"/);
  const assets = [...html.matchAll(/(?:src|href)="(\/DayPillar\/assets\/[^"]+)"/g)];
  assert.ok(assets.length >= 2, 'The built HTML must reference JS and CSS under /DayPillar/');
  for (const [, asset] of assets) {
    assert.ok(statSync(join('dist', asset.slice('/DayPillar/'.length))).isFile(), `Missing ${asset}`);
  }
  const scripts = assets.filter(([, asset]) => asset.endsWith('.js'));
  assert.ok(scripts.length, 'Expected JavaScript bundle');
  const js = scripts.map(([, asset]) =>
    readFileSync(join('dist', asset.slice('/DayPillar/'.length)), 'utf8')).join('\n');
  assert.ok(js.includes('天罡'), '甲子日的对应名称必须编入首页');
  assert.ok(js.includes('day-gua'), '每个日历格必须显示对应卦名与名称');
  assert.ok(js.includes('gua-highlight'), '右侧日期详情必须显示日干支对应卦象');
  assert.ok(js.includes('mode-button'), '必须保留简洁/详细视图切换');
  assert.ok(js.includes('detail-backdrop'), '移动端必须提供可关闭的日期详情面板');
  assert.ok(js.includes('ArrowLeft'), '必须支持方向键调整选中日期');
  for (const removed of ['gua-catalog', 'catalog-content', 'gua-search', 'Tyme 值日体系', '星宿 · 双口径']) {
    assert.ok(!js.includes(removed), `不应继续显示被屏蔽的 Tyme 28 宿体系：${removed}`);
  }
  // tyme4ts 自带 28 宿字面量可能保留在第三方打包代码中，但应用不再调用和渲染该体系。
  const uiSource = readFileSync('src/main.ts','utf8');
  const calendarSource = readFileSync('src/calendar.ts','utf8');
  assert.ok(!uiSource.includes('廿八'));
  assert.ok(!uiSource.includes('star28'));
  assert.ok(!calendarSource.includes('getTwentyEightStar'));
  assert.ok(!calendarSource.includes('star28'));
  assert.ok(!uiSource.includes('catalog-view'));
  assert.ok(!uiSource.includes('renderCatalog'));
  assert.ok(!uiSource.includes('gua-search'));
  assert.match(uiSource, /day-gua-name/);
  assert.match(uiSource, /day-ying/);
  const cssSource = readFileSync('src/style.css','utf8');
  for (const selector of ['.intro{', '.tabs{', '.tab{', '.catalog-grid{']) {
    assert.ok(!cssSource.includes(selector), `Unused selector must be removed: ${selector}`);
  }
  assert.match(uiSource, /if \(changedMonth\) renderCalendar\(\)/);
  assert.match(uiSource, /updateSelectedDay\(previous\)/);
  assert.match(uiSource, /monthCells\.find\(/);
  assert.doesNotMatch(uiSource, /role="row"/);
  assert.doesNotMatch(html, /二十八宿轮值/);
  assert.doesNotMatch(html, /\/src\/main\.ts/);
});
