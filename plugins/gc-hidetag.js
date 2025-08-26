import {generateWAMessageFromContent} from "@whiskeysockets/baileys";
import * as fs from 'fs';

// Configuración de seguridad
const SECURITY_CONFIG = {
  MAX_MENTIONS_PER_MESSAGE: 10, // Máximo 10 menciones por mensaje
  MESSAGE_DELAY: 2000, // 2 segundos entre mensajes
  MAX_RETRIES: 2, // Máximo 2 intentos
  COOLDOWN_TIME: 30000 // 30 segundos de cooldown entre usos
};

// Cache para cooldowns por grupo
const groupCooldowns = new Map();

const handler = async (m, {conn, text, participants, isOwner, isAdmin}) => {
  try {
    // Verificar cooldown del grupo
    const chatId = m.chat;
    const now = Date.now();
    const lastUsed = groupCooldowns.get(chatId) || 0;
    
    if (now - lastUsed < SECURITY_CONFIG.COOLDOWN_TIME && !isOwner) {
      await conn.sendMessage(m.chat, {
        text: '⏳ *Espera 30 segundos antes de usar este comando nuevamente.*\n\n_Esto ayuda a mantener el bot seguro._'
      }, {quoted: m});
      return;
    }

    // Actualizar cooldown
    groupCooldowns.set(chatId, now);

    // Validar participantes
    if (!participants || participants.length === 0) {
      await conn.sendMessage(m.chat, {
        text: '❌ *No hay participantes para mencionar.*'
      }, {quoted: m});
      return;
    }

    // Limitar menciones para seguridad
    const users = participants
      .map((u) => conn.decodeJid(u.id))
      .filter(id => id !== conn.user.jid) // Excluir al bot
      .slice(0, SECURITY_CONFIG.MAX_MENTIONS_PER_MESSAGE); // Limitar cantidad

    if (users.length === 0) {
      await conn.sendMessage(m.chat, {
        text: '❌ *No hay usuarios válidos para mencionar.*'
      }, {quoted: m});
      return;
    }

    const messageText = text || '*📢 Notificación del administrador*';
    
    // Intentar método seguro primero
    await sendSafeHideTag(conn, m, users, messageText);
    
  } catch (error) {
    console.error('Error en gc-hidetag:', error);
    
    // Fallback seguro sin menciones masivas
    try {
      await conn.sendMessage(m.chat, {
        text: `⚠️ *Mensaje del administrador:*\n\n${text || '*Notificación importante*'}\n\n_El sistema de menciones está en modo seguro._`
      }, {quoted: m});
    } catch (fallbackError) {
      console.error('Error en fallback de gc-hidetag:', fallbackError);
    }
  }
};

// Función para envío seguro
async function sendSafeHideTag(conn, m, users, messageText) {
  const quoted = m.quoted ? m.quoted : m;
  const mime = (quoted.msg || quoted).mimetype || '';
  const isMedia = /image|video|sticker|audio/.test(mime);
  
  try {
    if (isMedia && quoted.mtype === 'imageMessage') {
      const mediax = await quoted.download?.();
      if (mediax) {
        await conn.sendMessage(m.chat, {
          image: mediax, 
          mentions: users, 
          caption: messageText
        }, {quoted: m});
      }
    } else if (isMedia && quoted.mtype === 'videoMessage') {
      const mediax = await quoted.download?.();
      if (mediax) {
        await conn.sendMessage(m.chat, {
          video: mediax, 
          mentions: users, 
          mimetype: 'video/mp4', 
          caption: messageText
        }, {quoted: m});
      }
    } else if (isMedia && quoted.mtype === 'audioMessage') {
      const mediax = await quoted.download?.();
      if (mediax) {
        await conn.sendMessage(m.chat, {
          audio: mediax, 
          mentions: users, 
          mimetype: 'audio/mpeg', 
          fileName: `notification.mp3`
        }, {quoted: m});
      }
    } else if (isMedia && quoted.mtype === 'stickerMessage') {
      const mediax = await quoted.download?.();
      if (mediax) {
        await conn.sendMessage(m.chat, {
          sticker: mediax, 
          mentions: users
        }, {quoted: m});
      }
    } else {
      // Método de texto seguro (SIN caracteres invisibles sospechosos)
      await conn.sendMessage(m.chat, {
        text: `📢 *${messageText}*`,
        mentions: users
      }, {quoted: m});
    }
  } catch (error) {
    throw error;
  }
}

// Limpieza automática de cooldowns cada 10 minutos
setInterval(() => {
  const now = Date.now();
  for (const [chatId, lastUsed] of groupCooldowns.entries()) {
    if (now - lastUsed > 600000) { // 10 minutos
      groupCooldowns.delete(chatId);
    }
  }
}, 600000);

handler.command = /^(hidetag|notificar|notify)$/i;
handler.group = true;
handler.admin = true;

export default handler;