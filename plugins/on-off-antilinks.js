import fs from 'fs';
import { getConfig } from '../lib/funcConfig.js';
import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js';

const warnings = new Map();
const MAX_WARNINGS = 3;

function hasLink(text) {
  if (!text) return false;
  
  const patterns = [
    /https?:\/\/[^\s]+/gi,
    /www\.[^\s]+\.[a-z]{2,}/gi,
    /facebook\.com/gi,
    /fb\.com/gi,
    /instagram\.com/gi,
    /tiktok\.com/gi,
    /twitter\.com/gi,
    /x\.com/gi,
    /youtube\.com/gi,
    /youtu\.be/gi,
    /t\.me\//gi,
    /discord\.gg/gi
  ];
  
  return patterns.some(pattern => pattern.test(text));
}

function addWarning(chatId, userId) {
  if (!warnings.has(chatId)) {
    warnings.set(chatId, {});
  }
  const chatWarnings = warnings.get(chatId);
  chatWarnings[userId] = (chatWarnings[userId] || 0) + 1;
  return chatWarnings[userId];
}

function resetWarnings(chatId, userId) {
  const chatWarnings = warnings.get(chatId);
  if (chatWarnings?.[userId]) {
    delete chatWarnings[userId];
  }
}

async function getAdmins(conn, chatId) {
  try {
    const groupMetadata = await conn.groupMetadata(chatId);
    return groupMetadata.participants
      .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
      .map(p => p.id);
  } catch (e) {
    return [];
  }
}

const handler = async (m, { conn, isAdmin, isOwner }) => {
  try {
    if (!m.isGroup || !m.text) return;
    
    const config = getConfig(m.chat);
    if (!config.antiLink && !config.antiLink2) return;
    
    if (isAdmin || isOwner) return;
    
    if (!hasLink(m.text)) return;
    
    const groupData = await getGroupDataForPlugin(conn, m.chat, conn.user.jid);
    const isBotAdmin = groupData.isBotAdmin;
    
    const warningCount = addWarning(m.chat, m.sender);
    
    let messageDeleted = false;
    if (isBotAdmin) {
      try {
        await conn.sendMessage(m.chat, { delete: m.key });
        messageDeleted = true;
      } catch (error) {
        console.error('Error eliminando mensaje:', error.message);
      }
    }
    
    if (warningCount >= MAX_WARNINGS) {
      let userBanned = false;
      
      if (isBotAdmin) {
        try {
          await conn.groupParticipantsUpdate(m.chat, [m.sender], 'remove');
          userBanned = true;
        } catch (error) {
          console.error('Error baneando usuario:', error.message);
        }
      }
      
      if (userBanned) {
        const banMsg = `🚫 *USUARIO ELIMINADO POR SPAM DE ENLACES*

👤 *Usuario:* @${m.sender.split('@')[0]}  
📊 *Total advertencias:* ${warningCount}/${MAX_WARNINGS}
📋 *Motivo:* Envío repetido de enlaces no permitidos
⚡ *Acción:* Eliminación automática del grupo

✅ *El usuario ha sido removido exitosamente.*`;

        await conn.sendMessage(m.chat, {
          text: banMsg,
          mentions: [m.sender]
        });
        
        resetWarnings(m.chat, m.sender);
        
      } else {
        const admins = await getAdmins(conn, m.chat);
        
        const failMsg = `🚨 *ALERTA PARA ADMINISTRADORES*

👤 *Usuario:* @${m.sender.split('@')[0]}
📊 *Advertencias:* ${warningCount}/${MAX_WARNINGS}  
📋 *Motivo:* Spam de enlaces

❌ **NO SOY ADMINISTRADORA, NO PUEDO ELIMINAR AL USUARIO**

⚠️ *El usuario alcanzó el máximo de advertencias.*
📢 *Administradores, por favor eliminen manualmente al usuario.*`;

        await conn.sendMessage(m.chat, {
          text: failMsg,
          mentions: [m.sender, ...admins]
        });
      }
      
    } else {
      const remaining = MAX_WARNINGS - warningCount;
      
      if (!isBotAdmin) {
        const admins = await getAdmins(conn, m.chat);
        
        const warningMsg = `⚠️ *ADVERTENCIA ${warningCount}/${MAX_WARNINGS} - ENLACES NO PERMITIDOS*

👤 *Usuario:* @${m.sender.split('@')[0]}
🔗 *Motivo:* Envío de enlaces/links
⏰ *Advertencias restantes:* ${remaining}

${warningCount === MAX_WARNINGS - 1 ? 
  '🔥 **¡ÚLTIMA ADVERTENCIA!**\n⚡ *Próximo enlace = ELIMINACIÓN AUTOMÁTICA*' : 
  '⚡ *Sigue enviando enlaces y serás eliminado*'
}

❌ *NO SOY ADMINISTRADORA, NO PUDE BORRAR EL MENSAJE*
📢 *Pero el usuario fue advertido correctamente.*

🤝 *Por favor respeta las reglas del grupo.*`;

        await conn.sendMessage(m.chat, {
          text: warningMsg,
          mentions: [m.sender, ...admins]
        });
        
      } else {
        const warningMsg = `⚠️ *ADVERTENCIA ${warningCount}/${MAX_WARNINGS} - ENLACES NO PERMITIDOS*

👤 *Usuario:* @${m.sender.split('@')[0]}
🔗 *Motivo:* Envío de enlaces/links
⏰ *Advertencias restantes:* ${remaining}

${warningCount === MAX_WARNINGS - 1 ? 
  '🔥 **¡ÚLTIMA ADVERTENCIA!**\n⚡ *Próximo enlace = ELIMINACIÓN AUTOMÁTICA*' : 
  '⚡ *Sigue enviando enlaces y serás eliminado*'
}

🗑️ *Tu mensaje fue eliminado automáticamente*

🤝 *Por favor respeta las reglas del grupo.*`;

        await conn.sendMessage(m.chat, {
          text: warningMsg,
          mentions: [m.sender]
        });
      }
    }
    
  } catch (error) {
    console.error('ERROR en antilinks:', error);
    
    await conn.sendMessage(m.chat, {
      text: `❌ **ERROR EN SISTEMA ANTILINKS**\n\nError: ${error.message}\n\n🔧 *Contacta al administrador del bot.*`
    });
  }
};

handler.before = async function (m, extra) {
  return await handler(m, extra);
};

export default handler;