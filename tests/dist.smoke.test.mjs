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
  assert.ok(js.includes('gua-catalog'), '卦象映射应直接在首页，而非独立分页');
  for (const removed of ['Tyme 值日体系', '廿八', '星宿 · 双口径']) {
    assert.ok(!js.includes(removed), `不应继续显示被屏蔽的 Tyme 28 宿体系：${removed}`);
  }
  assert.doesNotMatch(html, /\/src\/main\.ts/);
});
