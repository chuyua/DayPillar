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
  assert.doesNotMatch(html, /\/src\/main\.ts/);
});
