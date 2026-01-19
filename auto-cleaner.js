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
  BATCH_SIZE: 25,
  BATCH_DELAY: 100,
  OLD_FILES_THRESHOLD: 7200000,
  PROTECTED_FILES: new Set(['creds.json']),
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
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return deleted;
}

async function cleanOldFiles() {
  if (!existsSync(CONFIG.SESSION_DIR)) return 0;
  
  const threshold = Date.now() - CONFIG.OLD_FILES_THRESHOLD;
  
  return await deleteFilesInBatches(
    CONFIG.SESSION_DIR,
    async file => {
      if (CONFIG.PROTECTED_FILES.has(file)) return false;
      
      if (file.endsWith('.json')) return false;
      
      try {
        const stats = await stat(join(CONFIG.SESSION_DIR, file));
        
        if (!stats.isFile() || stats.mtimeMs >= threshold) return false;
        
        const tempPatterns = [
          'app-state-sync-version-',
          'baileys_store_'
        ];
        
        return tempPatterns.some(pattern => file.startsWith(pattern));
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

  if (global.conn?.user?.jid) {
    console.log(chalk.blue('ℹ️  [auto-cleaner] Bot activo - omitiendo limpieza automática'));
    return;
  }

  isRunning = true;

  try {
    console.log(chalk.cyan('🤖 [auto-cleaner] Iniciando limpieza de archivos antiguos...'));
    
    const startTime = Date.now();
    
    const oldFilesDeleted = await cleanOldFiles();
    
    updateLastCleanTime();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    if (oldFilesDeleted > 0) {
      const config = getAutoCleanConfig();
      const nextClean = new Date(Date.now() + (config.intervalHours * 3600000));
      console.log(chalk.green(`✅ [auto-cleaner] ${oldFilesDeleted} archivos temporales eliminados en ${duration}s`));
      console.log(chalk.cyan(`⏰ [auto-cleaner] Próxima limpieza: ${nextClean.toLocaleString()}`));
    } else {
      console.log(chalk.blue(`ℹ️  [auto-cleaner] No hay archivos temporales antiguos para limpiar`));
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

  console.log(chalk.cyan.bold('🚀 [auto-cleaner] Servicio iniciado (modo conservador)'));
  
  setTimeout(() => checkAutoClean(), 300000);
  
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

export async function forceCleanNow() {
  console.log(chalk.yellow('⚠️  [auto-cleaner] Limpieza manual forzada - úsala con precaución'));
  await performAutoClean();
}