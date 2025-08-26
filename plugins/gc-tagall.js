import * as fs from 'fs';

// Configuración de seguridad
const SECURITY_CONFIG = {
  MAX_MENTIONS_PER_BATCH: 8, // Máximo 8 menciones por mensaje
  BATCH_DELAY: 3000, // 3 segundos entre lotes
  MAX_TOTAL_MENTIONS: 50, // Máximo 50 menciones totales
  COOLDOWN_TIME: 60000, // 1 minuto de cooldown
  MAX_MESSAGE_LENGTH: 1000 // Límite de caracteres por mensaje
};

// Cache para cooldowns por grupo
const groupCooldowns = new Map();
const activeOperations = new Set(); // Para evitar operaciones concurrentes

const handler = async (m, {isOwner, isAdmin, conn, text, participants, args, command, usedPrefix}) => {
  try {
    // Verificar prefijo inválido
    if (usedPrefix == 'a' || usedPrefix == 'A') return;
    
    // Verificar permisos
    if (!(isAdmin || isOwner)) {
      global.dfail('admin', m, conn);
      throw false;
    }

    // Verificar si ya hay una operación en progreso en este grupo
    const chatId = m.chat;
    if (activeOperations.has(chatId)) {
      await conn.sendMessage(m.chat, {
        text: '⏳ *Ya hay una invocación en progreso en este grupo.*\n\n_Espera a que termine antes de usar el comando nuevamente._'
      }, {quoted: m});
      return;
    }

    // Verificar cooldown del grupo
    const now = Date.now();
    const lastUsed = groupCooldowns.get(chatId) || 0;
    
    if (now - lastUsed < SECURITY_CONFIG.COOLDOWN_TIME && !isOwner) {
      const remainingTime = Math.ceil((SECURITY_CONFIG.COOLDOWN_TIME - (now - lastUsed)) / 1000);
      await conn.sendMessage(m.chat, {
        text: `⏳ *Cooldown activo*\n\n_Espera ${remainingTime} segundos antes de usar este comando nuevamente._\n\n💡 *Esto mantiene el bot seguro y evita baneos.*`
      }, {quoted: m});
      return;
    }

    // Marcar operación como activa
    activeOperations.add(chatId);
    groupCooldowns.set(chatId, now);

    // Obtener configuración de idioma de manera segura
    let tradutor;
    try {
      const datas = global;
      const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje || 'es';
      const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
      tradutor = _translate.plugins.gc_tagall;
    } catch {
      // Fallback a textos en español si no se puede cargar el idioma
      tradutor = {
        texto1: [
          'Mensaje:',
          '『 INVOCANDO A TODOS 』',
          'Participantes:'
        ]
      };
    }

    // Validar y preparar participantes
    if (!participants || participants.length === 0) {
      await conn.sendMessage(m.chat, {
        text: '❌ *No hay participantes en este grupo para invocar.*'
      }, {quoted: m});
      activeOperations.delete(chatId);
      return;
    }

    // Filtrar y limitar participantes
    const validParticipants = participants
      .filter(member => member.id !== conn.user.jid) // Excluir al bot
      .slice(0, SECURITY_CONFIG.MAX_TOTAL_MENTIONS); // Limitar cantidad total

    if (validParticipants.length === 0) {
      await conn.sendMessage(m.chat, {
        text: '❌ *No hay participantes válidos para invocar.*'
      }, {quoted: m});
      activeOperations.delete(chatId);
      return;
    }

    // Preparar mensaje
    const pesan = args.join(' ').substring(0, SECURITY_CONFIG.MAX_MESSAGE_LENGTH) || 'Invocación general';
    const oi = `${tradutor.texto1[0]} ${pesan}`;
    
    // Enviar mensaje inicial
    await conn.sendMessage(m.chat, {
      text: `📢 *${tradutor.texto1[1]}*\n\n💬 *${oi}*\n\n⏳ _Procesando menciones de forma segura..._`
    }, {quoted: m});

    // Dividir participantes en lotes seguros
    const batches = [];
    for (let i = 0; i < validParticipants.length; i += SECURITY_CONFIG.MAX_MENTIONS_PER_BATCH) {
      batches.push(validParticipants.slice(i, i + SECURITY_CONFIG.MAX_MENTIONS_PER_BATCH));
    }

    // Enviar lotes con delay
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const batchNumber = i + 1;
      const totalBatches = batches.length;
      
      let teks = `📋 *${tradutor.texto1[2]}* (${batchNumber}/${totalBatches})\n\n`;
      
      // Agregar participantes del lote actual
      for (const mem of batch) {
        teks += `┣➥ @${mem.id.split('@')[0]}\n`;
      }
      
      teks += `*└* Luna-Bot - Sistema Seguro\n\n`;
      
      // Si no es el último lote, indicar que hay más
      if (i < batches.length - 1) {
        teks += `⏳ _Cargando más participantes..._`;
      } else {
        teks += `✅ _Invocación completada exitosamente_`;
      }

      try {
        await conn.sendMessage(m.chat, {
          text: teks, 
          mentions: batch.map((a) => a.id)
        }, {quoted: m});
        
        // Delay entre lotes (excepto en el último)
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, SECURITY_CONFIG.BATCH_DELAY));
        }
        
      } catch (error) {
        console.error(`Error enviando lote ${batchNumber}:`, error);
        
        // Continuar con el siguiente lote en caso de error
        await conn.sendMessage(m.chat, {
          text: `⚠️ *Error en lote ${batchNumber}*\n\n_Continuando con los siguientes participantes..._`
        });
      }
    }

    // Mensaje final de confirmación
    await conn.sendMessage(m.chat, {
      text: `✅ *Invocación completada*\n\n👥 *Participantes procesados:* ${validParticipants.length}\n📦 *Lotes enviados:* ${batches.length}\n\n💡 _Sistema de seguridad activo para prevenir baneos_`
    });

  } catch (error) {
    console.error('Error en gc-tagall:', error);
    
    // Mensaje de error seguro
    try {
      await conn.sendMessage(m.chat, {
        text: '❌ *Error en la invocación*\n\n_Por favor, intenta nuevamente en unos momentos._\n\n🛡️ _El sistema se mantiene en modo seguro._'
      }, {quoted: m});
    } catch (fallbackError) {
      console.error('Error en fallback de gc-tagall:', fallbackError);
    }
    
  } finally {
    // Liberar la operación
    activeOperations.delete(m.chat);
  }
};

// Limpieza automática de datos cada 15 minutos
setInterval(() => {
  const now = Date.now();
  
  // Limpiar cooldowns expirados
  for (const [chatId, lastUsed] of groupCooldowns.entries()) {
    if (now - lastUsed > 900000) { // 15 minutos
      groupCooldowns.delete(chatId);
    }
  }
  
  // Limpiar operaciones colgadas (más de 5 minutos)
  // En caso de que algo falle y no se libere correctamente
  for (const chatId of activeOperations) {
    // Esto es un safety check - normalmente las operaciones deberían liberarse en el finally
    setTimeout(() => {
      if (activeOperations.has(chatId)) {
        activeOperations.delete(chatId);
      }
    }, 300000); // 5 minutos
  }
}, 900000);

handler.help = ['tagall <mensaje>', 'invocar <mensaje>'];
handler.tags = ['group'];
handler.command = /^(tagall|invocar|invocacion|todos|invocación)$/i;
handler.admin = true;
handler.group = true;

export default handler;