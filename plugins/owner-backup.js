import { existsSync, readdirSync, statSync, copyFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

const BACKUP_DIR = join(process.cwd(), 'backup');

const handler = async (m, { conn, usedPrefix }) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es');
  const t = _tr?.plugins?.owner_backup || {};

  try {
    const backupConfig = join(BACKUP_DIR, 'config.js');
    if (!existsSync(backupConfig)) {
      await conn.reply(m.chat, (t.no_backup_config || '❌ No se encontró archivo backup/config.js'), m);
      return;
    }

    try {
      await import(backupConfig);
    } catch {
      await conn.reply(m.chat, (t.error_load_config || '❌ Error al cargar backup/config.js'), m);
      return;
    }

    const lidOwners = global.lidOwners || [];
    const ownerNumbers = (global.owner || []).map(o => o[0]);
    const allOwners = [...lidOwners, ...ownerNumbers].map(o => o.replace(/[^0-9]/g, ''));
    const sender = m.sender.replace(/[^0-9]/g, '');

    if (!allOwners.includes(sender)) {
      await conn.reply(m.chat, (t.sin_permisos || '🚫 No tienes permisos para restaurar el backup.'), m);
      return;
    }

    await conn.reply(m.chat, (t.iniciando || '⏳ Iniciando restauración de backup...'), m);
    await restoreBackup(BACKUP_DIR, process.cwd());
    await conn.sendButton(
      m.chat,
      (t.exito || '✅ Backup restaurado con éxito.\nPuedes eliminar la carpeta backup usando el botón:'),
      'LunaBot V6',
      null,
      [
        [(t.btn_eliminar_backup || '🗑 Eliminar Backup'), `${usedPrefix}eliminarbackup`]
      ],
      null,
      null,
      m
    );


  } catch (e) {
    await conn.reply(m.chat, (t.error_restaurar?.replace('{error}', e.message || e) || '❌ Error al restaurar backup:\n' + (e.message || e)), m);
  }
};

async function restoreBackup(srcDir, destDir) {
  for (const item of readdirSync(srcDir)) {
    if (item.includes('.npm') || item.includes('.cache') || item.includes('tmp')) continue;
    const srcPath = join(srcDir, item);
    const destPath = join(destDir, item);
    const stats = statSync(srcPath);
    if (stats.isDirectory()) {
      if (!existsSync(destPath)) mkdirSync(destPath, { recursive: true });
      await restoreBackup(srcPath, destPath);
    } else {
      const destFolder = dirname(destPath);
      if (!existsSync(destFolder)) mkdirSync(destFolder, { recursive: true });
      copyFileSync(srcPath, destPath);
    }
  }
}

handler.command = /^(restaurar)$/i;
handler.rowner = false;
export default handler;
