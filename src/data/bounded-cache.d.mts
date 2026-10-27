export declare function boundedCacheGet<T>(
  cache: Map<string, T>, key: string, limit: number, compute: () => T
): T;
