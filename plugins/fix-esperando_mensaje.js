import { promises as fs, existsSync } from 'fs';
import path from 'path';
import { getGroupDataForPlugin, clearGroupCache } from '../lib/funcion/pluginHelper.js';

const cooldowns = new Map();

const handler = async (m, { conn, usedPrefix }) => {
  try {
    if (!m.isGroup) {
      return m.reply('❌ Este comando solo funciona en grupos.');
    }

    const chatId = m.chat;
    const userId = m.sender;
    const now = Date.now();
    const cooldownTime = 30000;

    const { isAdmin } = await getGroupDataForPlugin(conn, chatId, userId);
    if (!isAdmin && global.conn.user.jid !== conn.user.jid) {
      return m.reply('⚠️ Solo administradores pueden usar este comando.');
    }

    const lastUsed = cooldowns.get(chatId);
    if (lastUsed && (now - lastUsed) < cooldownTime) {
      const remaining = Math.ceil((cooldownTime - (now - lastUsed)) / 1000);
      return m.reply(`⏰ Espera ${remaining}s antes de usar este comando en este grupo.`);
    }

    cooldowns.set(chatId, now);

    await m.reply('🔄 Resincronizando el grupo...');

    const sessionPath = './MysticSession/';
    
    if (!existsSync(sessionPath)) {
      return m.reply('❌ La carpeta de sesión no existe.');
    }

    const groupId = chatId.replace('@g.us', '').replace('@s.whatsapp.net', '');
    const files = await fs.readdir(sessionPath);
    
    const groupFiles = files.filter(file => 
      file.includes(groupId) || 
      (file.startsWith('sender-key-') && file.includes(groupId)) ||
      (file.startsWith('session-') && file.includes(groupId))
    );

    let deleted = 0;

    for (const file of groupFiles) {
      try {
        await fs.unlink(path.join(sessionPath, file));
        deleted++;
      } catch (err) {
        console.error(`Error eliminando ${file}:`, err.message);
      }
    }

    clearGroupCache(chatId);

    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      await conn.groupMetadata(chatId);
      const participants = await conn.groupParticipantsUpdate(chatId, [conn.user.jid], 'promote').catch(() => null);
    } catch (err) {
      console.log('Resincronización en proceso...');
    }

    await new Promise(resolve => setTimeout(resolve, 1500));

    if (deleted > 0) {
      await m.reply(`✅ Grupo resincronizado correctamente\n🗑️ Archivos de sesión limpiados: ${deleted}\n\n💡 El bot ahora debería responder normalmente en este grupo.`);
    } else {
      await m.reply(`✅ Grupo resincronizado\n📝 No se encontraron archivos de sesión para limpiar.\n\n💡 Intenta reiniciar el bot si el problema persiste:\n${usedPrefix}s`);
    }

  } catch (err) {
    console.error('Error en resincronización:', err);
    await m.reply('❌ Error durante la resincronización. Intenta reiniciar el bot.');
  }
};

handler.help = ['borrarchat', 'lchat'];
handler.tags = ['fix'];
handler.command = /^(borrarchat|lchat|Lchat|fixgrupo)$/i;
handler.group = true;

export default handler;
