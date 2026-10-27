import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {existsSync, readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';

const forbidden = /(?:^|\/)(?:reference\/|.*\.xlsx$|.*\.xls$|scripts-generate\.py$|xlsx-stars\.json$|daypillar-transfer|\.daypillar\.b64$|DATA_AUDIT\.md$)/i;

test('公开仓库不追踪机构内部原件、完整表格或转存包', () => {
  const listed = spawnSync('git', ['ls-files', '--cached', '-z'], {encoding: 'utf8'});
  assert.equal(listed.status, 0, listed.stderr);
  const tracked = listed.stdout.split('\0').filter(Boolean);
  assert.ok(tracked.length > 0, 'Git index is required to check tracked files');
  for (const path of tracked) {
    assert.ok(!forbidden.test(path), `Sensitive source was accidentally staged: ${path}`);
  }
  const publicSource = tracked.filter(p => /^(src|tests)\//.test(p) && !/\.xlsx?$/.test(p));
  for (const file of publicSource) {
    const text = readFileSync(file, 'utf8');
    assert.ok(!text.includes(['source','Sha256'].join('')), `Private source fingerprint leaked in ${file}`);
  }
});

test('Pages build does not contain XLSX or raw transport archives', () => {
  if (!existsSync('dist')) return;
  const walk = dir => readdirSync(dir, {withFileTypes: true}).flatMap(entry => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path.replaceAll('\\','/')];
  });
  for (const file of walk('dist')) assert.ok(!forbidden.test(file), `Sensitive Pages artifact: ${file}`);
});
