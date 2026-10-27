/** 有界 LRU：命中时更新最近使用顺序，异常计算不污染缓存。 */
export function boundedCacheGet(cache, key, limit, compute) {
  if (cache.has(key)) {
    const value = cache.get(key);
    cache.delete(key);
    cache.set(key, value);
    return value;
  }
  const value = compute();
  cache.set(key, value);
  if (cache.size > limit) cache.delete(cache.keys().next().value);
  return value;
}
