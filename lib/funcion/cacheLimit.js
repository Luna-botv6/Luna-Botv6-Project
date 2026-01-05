export function limitCache(cache, maxSize = 50) {
  if (!cache || typeof cache.size !== 'number') return;
  if (cache.size <= maxSize) return;
  
  const toDelete = Math.floor(cache.size * 0.4);
  const iterator = cache.keys();
  
  for (let i = 0; i < toDelete; i++) {
    const key = iterator.next().value;
    if (key !== undefined) cache.delete(key);
  }
}