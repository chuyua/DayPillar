/**
 * 公开八卦二进制爻位：下爻 -> 上爻。只绘制六爻示意，不更改用户提供的卦名。
 * 数组输出顺序为上爻 -> 下爻，便于由上向下绘制。
 */
const TRIGRAMS = Object.freeze({
  '天': '111', '泽': '110', '火': '101', '雷': '100',
  '风': '011', '水': '010', '山': '001', '地': '000'
});
const PURE_GUA = Object.freeze({
  '乾': '天', '兑': '泽', '离': '火', '震': '雷',
  '巽': '风', '坎': '水', '艮': '山', '坤': '地'
});

export function getHexagramLines(name) {
  if (typeof name !== 'string') return null;
  const upper = name.includes('为') ? PURE_GUA[name[0]] : name[0];
  const lower = name.includes('为') ? upper : name[1];
  const top = TRIGRAMS[upper];
  const bottom = TRIGRAMS[lower];
  if (!top || !bottom) return null;
  return [...top].reverse().concat([...bottom].reverse()).map(line => line === '1');
}

export function renderHexagram(name) {
  const lines = getHexagramLines(name);
  if (!lines) return '';
  const shapes = lines.map((solid, index) => {
    const y = 4 + index * 12;
    return solid
      ? `<rect x="4" y="${y}" width="68" height="7" rx="1"/>`
      : `<rect x="4" y="${y}" width="28" height="7" rx="1"/><rect x="44" y="${y}" width="28" height="7" rx="1"/>`;
  }).join('');
  return `<svg class="hexagram-figure" viewBox="0 0 76 76" role="img" aria-label="六爻卦象图">${shapes}</svg>`;
}
