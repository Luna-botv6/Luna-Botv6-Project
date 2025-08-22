import fs from 'fs';
import { getConfig } from '../lib/funcConfig.js';

// Sistema de advertencias
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
  
  for (const pattern of patterns) {
    if (pattern.test(text)) {
      console.log('🔗 Link detectado con patrón:', pattern.source);
      return true;
    }
  }
  return false;
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

const handler = async (m, { conn, isAdmin, isOwner }) => {
  try {
    // Solo grupos y con texto
    if (!m.isGroup || !m.text) return;
    
    // Verificar configuración
    const config = getConfig(m.chat);
    if (!config.antiLink && !config.antiLink2) return;
    
    console.log('🔍 ANTILINKS: Verificando mensaje...');
    console.log('👤 De:', m.sender);
    console.log('📝 Texto:', m.text);
    console.log('👑 Es admin:', isAdmin);
    console.log('👨‍💼 Es owner:', isOwner);
    
    // No procesar admins ni owner
    if (isAdmin || isOwner) {
      console.log('✅ Usuario es admin/owner, ignorando');
      return;
    }
    
    // Verificar enlaces
    if (!hasLink(m.text)) {
      console.log('✅ No hay enlaces detectados');
      return;
    }
    
    console.log('🚨 ENLACE DETECTADO! Procesando...');
    
    // FORZAR PERMISOS - Si antilinks está activado, asumimos que el bot debe tener permisos
    const FORCE_PERMISSIONS = true;
    
    // Agregar advertencia
    const warningCount = addWarning(m.chat, m.sender);
    console.log(`📊 Advertencia ${warningCount}/${MAX_WARNINGS} para ${m.sender}`);
    
    // Intentar eliminar mensaje
    let messageDeleted = false;
    if (FORCE_PERMISSIONS) {
      try {
        console.log('🗑️ Intentando eliminar mensaje...');
        await conn.sendMessage(m.chat, { delete: m.key });
        messageDeleted = true;
        console.log('✅ Mensaje eliminado exitosamente');
      } catch (error) {
        console.log('❌ Error eliminando mensaje:', error.message);
        messageDeleted = false;
      }
    }
    
    if (warningCount >= MAX_WARNINGS) {
      console.log('🚫 Máximo de advertencias alcanzado, intentando banear...');
      
      // Intentar banear
      let userBanned = false;
      if (FORCE_PERMISSIONS) {
        try {
          await conn.groupParticipantsUpdate(m.chat, [m.sender], 'remove');
          userBanned = true;
          console.log('✅ Usuario baneado exitosamente');
        } catch (error) {
          console.log('❌ Error baneando usuario:', error.message);
          userBanned = false;
        }
      }
      
      if (userBanned) {
        // Mensaje de confirmación de baneo
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
        // Si no pudo banear, notificar a admins
        const failMsg = `🚨 *ERROR: NO SE PUDO ELIMINAR USUARIO*

👤 *Usuario:* @${m.sender.split('@')[0]}
📊 *Advertencias:* ${warningCount}/${MAX_WARNINGS}  
📋 *Motivo:* Spam de enlaces

❌ **EL BOT NECESITA PERMISOS DE ADMINISTRADOR**

🔧 *Solución:*
1️⃣ Hacer al bot administrador del grupo
2️⃣ Dar permisos de "Eliminar mensajes" y "Remover participantes"
3️⃣ O eliminar manualmente al usuario

⚠️ *Administradores, por favor actúen rápidamente.*`;

        await conn.sendMessage(m.chat, {
          text: failMsg,
          mentions: [m.sender]
        });
      }
      
    } else {
      // Enviar advertencia normal
      const remaining = MAX_WARNINGS - warningCount;
      
      let warningMsg = `⚠️ *ADVERTENCIA ${warningCount}/${MAX_WARNINGS} - ENLACES NO PERMITIDOS*

👤 *Usuario:* @${m.sender.split('@')[0]}
🔗 *Motivo:* Envío de enlaces/links
⏰ *Advertencias restantes:* ${remaining}

${warningCount === MAX_WARNINGS - 1 ? 
  '🔥 **¡ÚLTIMA ADVERTENCIA!**\n⚡ *Próximo enlace = ELIMINACIÓN AUTOMÁTICA*' : 
  '⚡ *Sigue enviando enlaces y serás eliminado*'
}

${messageDeleted ? 
  '🗑️ *Tu mensaje fue eliminado automáticamente*' : 
  '⚠️ *No pude eliminar tu mensaje - Bot necesita permisos de admin*'
}

🤝 *Por favor respeta las reglas del grupo.*`;

      await conn.sendMessage(m.chat, {
        text: warningMsg,
        mentions: [m.sender]
      });
      
      console.log(`✅ Advertencia ${warningCount}/${MAX_WARNINGS} enviada`);
    }
    
  } catch (error) {
    console.error('❌ ERROR CRÍTICO en antilinks:', error);
    
    // Mensaje de error para debug
    await conn.sendMessage(m.chat, {
      text: `❌ **ERROR EN SISTEMA ANTILINKS**\n\nError: ${error.message}\n\n🔧 *Contacta al administrador del bot.*`
    });
  }
};

handler.before = async function (m, extra) {
  return await handler(m, extra);
};

export default handler;