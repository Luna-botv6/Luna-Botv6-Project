import { readdirSync, unlinkSync, existsSync, promises as fs, rmSync, readFileSync, statSync } from 'fs';
import path from 'path';

// Cache para evitar spam del comando
const userCooldown = new Map();
const COOLDOWN_TIME = 30000; // 30 segundos entre usos por usuario

const handler = async (m, { conn, usedPrefix }) => {
  const datas = global;
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje;
  const _translate = JSON.parse(readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.fix_esperando_mensage;

  if (global.conn.user.jid !== conn.user.jid) {
    return conn.sendMessage(m.chat, {text: tradutor.texto1}, {quoted: m});
  }

 
  const userId = m.sender;
  const now = Date.now();
  const lastUsed = userCooldown.get(userId);
  
  if (lastUsed && (now - lastUsed) < COOLDOWN_TIME) {
    const remainingTime = Math.ceil((COOLDOWN_TIME - (now - lastUsed)) / 1000);
    return conn.sendMessage(m.chat, {
      text: `⏳ Espera ${remainingTime} segundos antes de usar este comando nuevamente.`
    }, {quoted: m});
  }

  userCooldown.set(userId, now);

  const sessionPath = './MysticSession/';
  
  if (!existsSync(sessionPath)) {
    return conn.sendMessage(m.chat, {text: '📁 La carpeta de sesión no existe.'}, {quoted: m});
  }

  try {

    await conn.sendMessage(m.chat, {text: '🧹 Iniciando limpieza de archivos de sesión...'}, {quoted: m});

    const files = await fs.readdir(sessionPath);
    
    const filesToDelete = files.filter(file => {
      // No eliminar archivos críticos
      if (file === 'creds.json' || file === 'app-state-sync-version-critical_block.json') {
        return false;
      }
      
      // Eliminar archivos específicos de claves y estados
      return (
        file.startsWith('pre-key-') ||
        file.startsWith('sender-key-') ||
        file.startsWith('app-state-sync-key-') ||
        file.startsWith('session-') ||
        file.endsWith('.json')
      );
    });

    if (filesToDelete.length === 0) {
      return conn.sendMessage(m.chat, {text: '✅ No se encontraron archivos para limpiar.'}, {quoted: m});
    }

    let deletedCount = 0;
    const batchSize = 10; // Procesar archivos en lotes pequeños
    const delay = 100; // Pequeña pausa entre lotes (100ms)

    // Procesar archivos en lotes para evitar sobrecarga
    for (let i = 0; i < filesToDelete.length; i += batchSize) {
      const batch = filesToDelete.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (file) => {
        try {
          const filePath = path.join(sessionPath, file);
          await fs.unlink(filePath);
          deletedCount++;
        } catch (err) {
          console.error(`Error eliminando ${file}:`, err.message);
        }
      }));

      // Pausa pequeña entre lotes para no sobrecargar el sistema
      if (i + batchSize < filesToDelete.length) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // Limpiar archivos antiguos (más de 1 hora)
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    const allFiles = await fs.readdir(sessionPath);
    
    for (const file of allFiles) {
      if (file === 'creds.json') continue;
      
      try {
        const filePath = path.join(sessionPath, file);
        const stats = await fs.stat(filePath);
        
        if (stats.isFile() && stats.mtimeMs < oneHourAgo) {
          await fs.unlink(filePath);
          deletedCount++;
        }
      } catch (err) {
        // Ignorar errores de archivos que ya no existen
      }
    }

    // Pausa antes del resultado (2 segundos)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Enviar resultado
    if (deletedCount > 0) {
      await conn.sendMessage(m.chat, {
        text: `✅ Limpieza completada.\n🗑️ Archivos eliminados: ${deletedCount}\n📁 Archivo creds.json preservado.`
      }, {quoted: m});
    } else {
      await conn.sendMessage(m.chat, {text: '✅ No se eliminaron archivos.'}, {quoted: m});
    }

    // Pausa antes del mensaje de reinicio (3 segundos)
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    await conn.sendMessage(m.chat, {
      text: `🔄 Para aplicar los cambios, usa:\n${usedPrefix}s`
    }, {quoted: m});

  } catch (err) {
    console.error('Error en limpieza de sesión:', err);
    await conn.sendMessage(m.chat, {
      text: '❌ Error durante la limpieza. Revisa los logs para más detalles.'
    }, {quoted: m});
  }
};

handler.help = ['fixmsgespera'];
handler.tags = ['fix'];
handler.command = /^(fixmsgespera|ds)$/i;
handler.rowner = false; // Cambia a true si quieres que solo el owner pueda usarlo
handler.owner = false;
handler.mods = false;
handler.premium = false;
handler.group = false;
handler.private = false;
handler.admin = false;
handler.botAdmin = false;
handler.fail = null;

export default handler;