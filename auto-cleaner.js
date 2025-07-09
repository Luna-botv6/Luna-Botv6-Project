import { readdir, unlink } from 'fs/promises';
import { join } from 'path';
import fs from 'fs';
import chalk from 'chalk';
import { shouldAutoClean, updateLastCleanTime, getAutoCleanConfig } from './lib/cleaner-config.js';

// Función para eliminar archivos en lotes (igual que cleaner.js)
async function deleteFilesInBatches(dir, fileFilter, batchSize = 20, delay = 10) {
  if (!fs.existsSync(dir)) {
    console.log(chalk.cyanBright(`🧹 [auto-cleaner] La carpeta ${dir} no existe, se omite.`));
    return 0;
  }

  try {
    const files = await readdir(dir);
    const targets = files.filter(fileFilter);
    if (targets.length === 0) {
      console.log(chalk.cyanBright(`🧹 [auto-cleaner] No se encontraron archivos para eliminar en ${dir}`));
      return 0;
    }

    let eliminados = 0;
    for (let i = 0; i < targets.length; i += batchSize) {
      const batch = targets.slice(i, i + batchSize);
      await Promise.all(batch.map(async file => {
        const filePath = join(dir, file);
        await unlink(filePath);
        eliminados++;
      }));
      await new Promise(r => setTimeout(r, delay));
    }

    console.log(chalk.cyanBright(`🗑️ [auto-cleaner] Archivos eliminados en ${dir}: ${eliminados}`));
    return eliminados;
  } catch (err) {
    console.error(chalk.red(`❌ [auto-cleaner] Error limpiando ${dir}: ${err.message}`));
    return 0;
  }
}

// Limpiar archivos de sesión
async function purgeSession() {
  console.log(chalk.cyanBright('✨ [auto-cleaner] Iniciando limpieza automática de claves...'));
  return await deleteFilesInBatches('./MysticSession', file =>
    file.startsWith('pre-key-') ||
    file.startsWith('sender-key-') ||
    file.startsWith('app-state-sync-key-'));
}

// Limpiar archivos antiguos
async function purgeOldFiles() {
  const dir = './MysticSession';
  if (!fs.existsSync(dir)) return 0;
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  return await deleteFilesInBatches(dir, file => {
    const stats = fs.statSync(join(dir, file));
    return stats.isFile() && stats.mtimeMs < oneHourAgo && file !== 'creds.json';
  });
}

// Función principal de limpieza automática
async function performAutoClean() {
  try {
    console.log(chalk.cyanBright('🤖 [auto-cleaner] Ejecutando limpieza automática...'));
    await purgeSession();
    await purgeOldFiles();
    updateLastCleanTime();
    
    const config = getAutoCleanConfig();
    const nextClean = new Date(Date.now() + (config.intervalHours * 60 * 60 * 1000));
    console.log(chalk.cyanBright(`✅ [auto-cleaner] Limpieza automática completada. Próxima limpieza: ${nextClean.toLocaleString()}`));
  } catch (error) {
    console.error(chalk.red(`❌ [auto-cleaner] Error en limpieza automática: ${error.message}`));
  }
}

// Verificar y ejecutar limpieza automática si es necesario
export function checkAutoClean() {
  if (shouldAutoClean()) {
    performAutoClean();
  }
}

// Inicializar verificación periódica (cada 30 minutos)
export function startAutoCleanService() {
  console.log(chalk.cyanBright('🚀 [auto-cleaner] Servicio de limpieza automática iniciado'));
  
  // Verificar inmediatamente
  checkAutoClean();
  
  // Luego verificar cada 30 minutos
  setInterval(() => {
    checkAutoClean();
  }, 30 * 60 * 1000); // 30 minutos
}

// Función para obtener el estado del próximo auto-clean
export function getNextAutoCleanTime() {
  const config = getAutoCleanConfig();
  if (!config.enabled || !config.lastCleanTime) return null;
  
  return new Date(config.lastCleanTime + (config.intervalHours * 60 * 60 * 1000));
}