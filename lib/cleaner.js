import { readdir, unlink } from 'fs/promises';
import { join } from 'path';
import fs from 'fs';
import chalk from 'chalk';

async function deleteFilesInBatches(dir, fileFilter, batchSize = 20, delay = 10) {
  if (!fs.existsSync(dir)) {
    console.log(chalk.cyanBright(`🧹 [cleaner] La carpeta ${dir} no existe, se omite.`));
    return 0;
  }

  try {
    const files = await readdir(dir);
    const targets = files.filter(fileFilter);
    if (targets.length === 0) {
      console.log(chalk.cyanBright(`🧹 [cleaner] No se encontraron archivos para eliminar en ${dir}`));
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

    console.log(chalk.cyanBright(`🗑️ [cleaner] Archivos eliminados en ${dir}: ${eliminados}`));
    return eliminados;
  } catch (err) {
    console.error(chalk.red(`❌ [cleaner] Error limpiando ${dir}: ${err.message}`));
    return 0;
  }
}

async function purgeSession() {
  console.log(chalk.cyanBright('✨ [cleaner] Iniciando limpieza de claves en MysticSession...'));
  return await deleteFilesInBatches('./MysticSession', file =>
    file.startsWith('pre-key-') ||
    file.startsWith('sender-key-') ||
    file.startsWith('app-state-sync-key-'));
}

async function purgeOldFiles() {
  const dir = './MysticSession';
  if (!fs.existsSync(dir)) return 0;
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  return await deleteFilesInBatches(dir, file => {
    const stats = fs.statSync(join(dir, file));
    return stats.isFile() && stats.mtimeMs < oneHourAgo && file !== 'creds.json';
  });
}

async function main() {
  console.log(chalk.cyanBright('🚀 [cleaner] Iniciando limpieza de MysticSession...'));
  await purgeSession();
  await purgeOldFiles();
  console.log(chalk.cyanBright('✅ [cleaner] Limpieza finalizada.'));
  process.exit(0);
}

main();