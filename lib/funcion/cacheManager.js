import chalk from 'chalk';

const MAX_CACHE_SIZE = 150;

export function cleanupCache(cache, ttl, name = 'cache') {
  const now = Date.now();
  let cleaned = 0;
  const maxSize = MAX_CACHE_SIZE;
  
  if (cache.size > maxSize) {
    const deleteCount = cache.size - maxSize;
    const keys = Array.from(cache.keys()).slice(0, deleteCount);
    keys.forEach(key => cache.delete(key));
    cleaned += deleteCount;
  }
  
  for (const [key, value] of cache.entries()) {
    const timestamp = value?.timestamp || value;
    if ((now - timestamp) > ttl) {
      cache.delete(key);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    console.log(chalk.gray(`⚡ Limpieza de ${name}: ${cleaned} entradas eliminadas`));
  }
}

export function startCacheCleanupInterval(groupCache, recentMessages, recentParticipantEvents, translationsCache, customCommandsCache, processedVoiceMessages, CACHE_TTL, DUPLICATE_TIMEOUT) {
  return setInterval(() => {
    cleanupCache(groupCache, CACHE_TTL, 'groupCache');
    cleanupCache(recentMessages, DUPLICATE_TIMEOUT, 'recentMessages');
    cleanupCache(recentParticipantEvents, 3000, 'participantEvents');
    cleanupCache(translationsCache, 20 * 60 * 1000, 'translationsCache');
    cleanupCache(customCommandsCache, 30 * 60 * 1000, 'customCommandsCache');
    
    if (processedVoiceMessages.size > MAX_CACHE_SIZE / 2) {
      processedVoiceMessages.clear();
    }
  }, 30000);
}