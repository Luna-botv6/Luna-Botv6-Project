import { promises as fs, existsSync } from 'fs';
import path from 'path';
import { getGroupDataForPlugin, clearGroupCache } from '../lib/funcion/pluginHelper.js';

const cooldowns = new Map();

const handler = async (m, { conn, usedPrefix }) => {
  try {
    const chatId = m.chat;
    const userId = m.sender;
    const now = Date.now();
    const cooldownTime = 30000;

    if (m.isGroup) {
      const { isAdmin } = await getGroupDataForPlugin(conn, chatId, userId);
      if (!isAdmin && global.conn.user.jid !== conn.user.jid) {
        return m.reply('⚠️ Solo administradores pueden usar este comando.');
      }
    }

    const lastUsed = cooldowns.get(chatId);
    if (lastUsed && (now - lastUsed) < cooldownTime) {
      const remaining = Math.ceil((cooldownTime - (now - lastUsed)) / 1000);
      return m.reply(`⏰ Espera ${remaining}s antes de usar este comando nuevamente.`);
    }

    cooldowns.set(chatId, now);

    const sessionPath = './MysticSession/';
    
    if (!existsSync(sessionPath)) {
      return m.reply('❌ La carpeta de sesión no existe.');
    }

    if (!m.isGroup) {
      await m.reply('🔄 Resincronizando chat privado...');
      
      try {
        clearGroupCache(chatId, conn);
        
        await conn.sendPresenceUpdate('available', chatId);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await conn.sendMessage(chatId, { text: '✅ Chat resincronizado\n\n💡 El bot debería responder ahora normalmente.\n\n📌 Si el problema persiste:\n1. Usa ' + usedPrefix + 's para reiniciar\n2. Elimina el chat y vuelve a escribir' });
        
      } catch (err) {
        console.error('Error resincronizando chat privado:', err);
        await m.reply('⚠️ Error al resincronizar. Intenta:\n1. ' + usedPrefix + 's (reiniciar)\n2. Eliminar y volver a abrir el chat');
      }
      
      return;
    }

    await m.reply('🔄 Resincronizando el grupo...');

    try {
      await conn.groupMetadata(chatId);
    } catch (err) {
      return m.reply('⚠️ El bot no puede acceder a este grupo.\n\n💡 Posibles soluciones:\n1. Asegúrate que el bot sea admin\n2. Saca y vuelve a agregar el bot\n3. Reinicia el bot: ' + usedPrefix + 's');
    }

    const groupId = chatId.replace('@g.us', '').replace('@s.whatsapp.net', '');
    const files = await fs.readdir(sessionPath);
    
    const patterns = [
      'sender-key-',
      'session-'
    ];
    
    const groupFiles = files.filter(file => {
      if (file === 'creds.json') return false;
      
      if (file.includes(groupId)) {
        return patterns.some(pattern => file.startsWith(pattern));
      }
      
      return false;
    });

    let deleted = 0;

    for (const file of groupFiles) {
      try {
        await fs.unlink(path.join(sessionPath, file));
        deleted++;
      } catch (err) {
        console.error(`Error eliminando ${file}:`, err.message);
      }
    }

    clearGroupCache(chatId, conn);

    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      const metadata = await conn.groupMetadata(chatId);
      
      await conn.sendPresenceUpdate('available', chatId);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const isBotAdmin = metadata.participants.find(
        p => conn.decodeJid(p.id) === conn.decodeJid(conn.user.jid)
      )?.admin;

      await new Promise(resolve => setTimeout(resolve, 1500));

      if (deleted > 0) {
        await m.reply(`✅ Grupo resincronizado correctamente\n🗑️ Archivos de sesión limpiados: ${deleted}\n👥 Participantes detectados: ${metadata.participants.length}\n🤖 Bot es admin: ${isBotAdmin ? 'Sí' : 'No'}\n\n💡 El bot ahora debería responder normalmente.\n\n📌 Si el problema persiste:\n1. ${usedPrefix}s (reiniciar bot)\n2. Saca y agrega el bot nuevamente`);
      } else {
        await m.reply(`✅ Grupo resincronizado\n📝 No se encontraron archivos corruptos\n👥 Participantes: ${metadata.participants.length}\n\n💡 El bot debería funcionar ahora.\n\n🔧 Si no funciona: ${usedPrefix}s`);
      }
    } catch (err) {
      console.error('Error resincronizando metadata:', err);
      await m.reply(`⚠️ Resincronización parcial completada\n🗑️ Archivos limpiados: ${deleted}\n\n💡 Reinicia el bot:\n${usedPrefix}s`);
    }

  } catch (err) {
    console.error('Error en resincronización:', err);
    await m.reply('❌ Error crítico. Reinicia el bot: ' + (usedPrefix || '/') + 's');
  }
};

handler.help = ['borrarchat', 'lchat', 'fixchat'];
handler.tags = ['fix'];
handler.command = /^(borrarchat|lchat|Lchat|fixgrupo|fixchat)$/i;

export default handler;