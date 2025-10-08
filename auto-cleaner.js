import { readdir, unlink, stat } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import chalk from 'chalk';
import { 
  shouldAutoClean, 
  updateLastCleanTime, 
  getAutoCleanConfig,
  getTimeUntilNextClean 
} from './lib/cleaner-config.js';

const CONFIG = {
  SESSION_DIR: './MysticSession',
  BATCH_SIZE: 20,
  BATCH_DELAY: 150,
  OLD_FILES_THRESHOLD: 3600000,
  PROTECTED_FILES: new Set(['creds.json']),
  KEY_PREFIXES: ['pre-key-', 'sender-key-', 'app-state-sync-key-'],
  CHECK_INTERVAL: 1800000
};

let isRunning = false;
let cleanupInterval = null;

async function deleteFilesInBatches(dir, fileFilter, batchSize = CONFIG.BATCH_SIZE, delay = CONFIG.BATCH_DELAY) {
  if (!existsSync(dir)) return 0;

  const files = await readdir(dir);
  const targets = [];

  for (const file of files) {
    try {
      if (await fileFilter(file)) targets.push(file);
    } catch {}
  }

  if (targets.length === 0) return 0;

  let deleted = 0;

  for (let i = 0; i < targets.length; i += batchSize) {
    const batch = targets.slice(i, i + batchSize);
    
    const results = await Promise.allSettled(
      batch.map(file => unlink(join(dir, file)))
    );
    
    deleted += results.filter(r => r.status === 'fulfilled').length;
    
    if (i + batchSize < targets.length) {
      await new Promise(resolve => setImmediate(resolve));
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  if (deleted > 0) {
    console.log(chalk.green(`🗑️  [auto-cleaner] ${deleted} archivos eliminados`));
  }

  return deleted;
}

async function purgeSessionKeys() {
  return await deleteFilesInBatches(
    CONFIG.SESSION_DIR,
    async file => CONFIG.KEY_PREFIXES.some(prefix => file.startsWith(prefix))
  );
}

async function purgeOldFiles() {
  if (!existsSync(CONFIG.SESSION_DIR)) return 0;
  
  const threshold = Date.now() - CONFIG.OLD_FILES_THRESHOLD;
  
  return await deleteFilesInBatches(
    CONFIG.SESSION_DIR,
    async file => {
      if (CONFIG.PROTECTED_FILES.has(file)) return false;
      
      try {
        const stats = await stat(join(CONFIG.SESSION_DIR, file));
        return stats.isFile() && stats.mtimeMs < threshold;
      } catch {
        return false;
      }
    }
  );
}

async function performAutoClean() {
  if (isRunning) {
    console.log(chalk.yellow('⚠️  [auto-cleaner] Ya en ejecución'));
    return;
  }

  isRunning = true;

  try {
    console.log(chalk.cyan('🤖 [auto-cleaner] Iniciando limpieza en segundo plano...'));
    
    const startTime = Date.now();
    
    const keysDeleted = await purgeSessionKeys();
    await new Promise(resolve => setImmediate(resolve));
    
    const oldFilesDeleted = await purgeOldFiles();
    
    updateLastCleanTime();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const total = keysDeleted + oldFilesDeleted;
    
    if (total > 0) {
      const config = getAutoCleanConfig();
      const nextClean = new Date(Date.now() + (config.intervalHours * 3600000));
      console.log(chalk.green(`✅ [auto-cleaner] ${total} archivos eliminados en ${duration}s`));
      console.log(chalk.cyan(`⏰ [auto-cleaner] Próxima limpieza: ${nextClean.toLocaleString()}`));
    }
  } catch (error) {
    console.error(chalk.red(`❌ [auto-cleaner] Error: ${error.message}`));
  } finally {
    isRunning = false;
  }
}

export function checkAutoClean() {
  if (shouldAutoClean()) {
    setImmediate(() => performAutoClean());
  }
}

export function startAutoCleanService() {
  if (cleanupInterval) {
    console.log(chalk.yellow('⚠️  [auto-cleaner] Servicio ya iniciado'));
    return;
  }

  console.log(chalk.cyan.bold('🚀 [auto-cleaner] Servicio iniciado'));
  
  setImmediate(() => checkAutoClean());
  
  cleanupInterval = setInterval(() => {
    checkAutoClean();
  }, CONFIG.CHECK_INTERVAL);
  
  cleanupInterval.unref();
}

export function stopAutoCleanService() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
    console.log(chalk.yellow('🛑 [auto-cleaner] Servicio detenido'));
  }
}

export function getNextAutoCleanTime() {
  const config = getAutoCleanConfig();
  if (!config.enabled || !config.lastCleanTime) return null;
  
  return new Date(config.lastCleanTime + (config.intervalHours * 3600000));
}

export function getCleanupStatus() {
  const config = getAutoCleanConfig();
  const timeUntil = getTimeUntilNextClean();
  
  return {
    isRunning,
    autoCleanEnabled: config.enabled,
    intervalHours: config.intervalHours,
    lastCleanTime: config.lastCleanTime ? new Date(config.lastCleanTime) : null,
    nextCleanTime: getNextAutoCleanTime(),
    minutesUntilNextClean: timeUntil ? Math.ceil(timeUntil / 60000) : null
  };
}