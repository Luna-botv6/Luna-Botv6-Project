import fs from 'fs';

const linkRegex = /chat\.whatsapp\.com\/([0-9A-Za-z]{20,24})/i;
let enviando = false;
let requestCount = new Map();
let pendingRequests = new Map();
const MAX_REQUESTS_PER_HOUR = 3;
const COOLDOWN_TIME = 60 * 60 * 1000;
const REQUEST_EXPIRY = 24 * 60 * 60 * 1000;

const cleanupRateLimit = () => {
  const now = Date.now();
  for (const [user, data] of requestCount.entries()) {
    if (now - data.lastReset > COOLDOWN_TIME) {
      requestCount.delete(user);
    }
  }
};

const cleanupPendingRequests = () => {
  const now = Date.now();
  for (const [requestId, data] of pendingRequests.entries()) {
    if (now - data.timestamp > REQUEST_EXPIRY) {
      pendingRequests.delete(requestId);
    }
  }
};

const checkRateLimit = (userId) => {
  const now = Date.now();
  const userKey = userId.split('@')[0];
  
  if (!requestCount.has(userKey)) {
    requestCount.set(userKey, { count: 1, lastReset: now });
    return true;
  }
  
  const userData = requestCount.get(userKey);
  
  if (now - userData.lastReset > COOLDOWN_TIME) {
    requestCount.set(userKey, { count: 1, lastReset: now });
    return true;
  }
  
  if (userData.count >= MAX_REQUESTS_PER_HOUR) {
    return false;
  }
  
  userData.count++;
  return true;
};

const validateGroupLink = (link) => {
  if (!link || typeof link !== 'string') return false;
  if (!linkRegex.test(link)) return false;
  if (!link.startsWith('https://chat.whatsapp.com/')) return false;
  return true;
};

const naturalDelay = () => {
  const delay = Math.random() * 2000 + 1000;
  return new Promise(resolve => setTimeout(resolve, delay));
};

const generateRequestId = () => {
  return `${Date.now()}${Math.random().toString(36).substr(2, 6)}`;
};

const handler = async (m, { conn, text, isMods, isOwner, isPrems, usedPrefix, command }) => {
  
  if (command === 'aceptargrupo' || command === 'acceptgroup') {
    if (!isOwner) {
      await conn.sendMessage(m.chat, { 
        text: "❌ Solo los propietarios pueden aprobar solicitudes." 
      }, { quoted: m });
      return;
    }

    const requestId = text?.trim();
    
    if (!requestId) {
      await conn.sendMessage(m.chat, { 
        text: "❌ Debes proporcionar el ID de la solicitud.\n\nEjemplo: /aceptargrupo 123456abc" 
      }, { quoted: m });
      return;
    }

    cleanupPendingRequests();

    if (!pendingRequests.has(requestId)) {
      await conn.sendMessage(m.chat, { 
        text: "❌ Solicitud no encontrada o ya fue procesada.\n\n💡 Las solicitudes expiran después de 24 horas." 
      }, { quoted: m });
      return;
    }

    const request = pendingRequests.get(requestId);

    try {
      await naturalDelay();
      await conn.groupAcceptInvite(request.code);
      
      await conn.sendMessage(m.chat, { 
        text: `✅ *Solicitud Aprobada*\n\n` +
          `Bot unido al grupo exitosamente.\n\n` +
          `👤 Usuario: ${request.userNumber}\n` +
          `🔗 Enlace: ${request.link}\n` +
          `🆔 ID: ${requestId}`
      }, { quoted: m });

      await naturalDelay();
      
      await conn.sendMessage(request.userId, {
        text: `✅ *Solicitud Aprobada*\n\n` +
          `¡Tu solicitud para que el bot se una al grupo ha sido aprobada!\n\n` +
          `El bot ya está en tu grupo. ¡Disfrútalo! 🎉\n\n` +
          `_Gracias por usar nuestro servicio._`
      });

      pendingRequests.delete(requestId);

    } catch (error) {
      console.error('Error al aprobar solicitud:', error);
      await conn.sendMessage(m.chat, { 
        text: `❌ Error al unirse al grupo: ${error.message}\n\nEl enlace podría ser inválido o haber expirado.` 
      }, { quoted: m });
    }
    return;
  }

  if (command === 'denegargrupo' || command === 'denygroup') {
    if (!isOwner) {
      await conn.sendMessage(m.chat, { 
        text: "❌ Solo los propietarios pueden rechazar solicitudes." 
      }, { quoted: m });
      return;
    }

    const args = text?.trim().split(' ');
    const requestId = args?.[0];
    const motivo = args?.slice(1).join(' ') || 'No cumple con las políticas del bot';

    if (!requestId) {
      await conn.sendMessage(m.chat, { 
        text: "❌ Debes proporcionar el ID de la solicitud.\n\nEjemplo: /denegargrupo 123456abc [motivo opcional]" 
      }, { quoted: m });
      return;
    }

    cleanupPendingRequests();

    if (!pendingRequests.has(requestId)) {
      await conn.sendMessage(m.chat, { 
        text: "❌ Solicitud no encontrada o ya fue procesada.\n\n💡 Las solicitudes expiran después de 24 horas." 
      }, { quoted: m });
      return;
    }

    const request = pendingRequests.get(requestId);

    try {
      await conn.sendMessage(m.chat, { 
        text: `❌ *Solicitud Rechazada*\n\n` +
          `👤 Usuario: ${request.userNumber}\n` +
          `🆔 ID: ${requestId}\n` +
          `📝 Motivo: ${motivo}`
      }, { quoted: m });

      await naturalDelay();
      
      await conn.sendMessage(request.userId, {
        text: `❌ *Solicitud Rechazada*\n\n` +
          `Lo sentimos, tu solicitud para que el bot se una al grupo ha sido rechazada.\n\n` +
          `📝 *Motivo:* ${motivo}\n\n` +
          `_Si tienes dudas, puedes contactar con el administrador del bot._`
      });

      pendingRequests.delete(requestId);

    } catch (error) {
      console.error('Error al rechazar solicitud:', error);
      await conn.sendMessage(m.chat, { 
        text: `⚠️ Solicitud marcada como rechazada, pero hubo un error al notificar al usuario.` 
      }, { quoted: m });
      pendingRequests.delete(requestId);
    }
    return;
  }

  const idioma = global.defaultLenguaje || 'es';
  
  let tradutor;
  try {
    const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
    tradutor = _translate.plugins.owner.join;
  } catch (error) {
    tradutor = {
      texto1: "❌ Por favor, proporciona un enlace válido de grupo de WhatsApp.",
      texto2: "✅ Me he unido al grupo exitosamente.",
      texto3: "📋 Tu solicitud ha sido enviada al administrador del bot para revisión.\n\n🆔 ID de solicitud: ",
      texto4: "⏳ Has excedido el límite de solicitudes (3 por hora). Intenta más tarde.",
      texto5: "❌ Ha ocurrido un error al procesar tu solicitud.",
      texto6: "🔒 Solicitud rechazada por políticas de seguridad."
    };
  }

  if (enviando) {
    await conn.sendMessage(m.chat, { 
      text: "⏳ Por favor espera, estoy procesando otra solicitud..." 
    }, { quoted: m });
    return;
  }

  cleanupRateLimit();
  cleanupPendingRequests();

  try {
    enviando = true;
    const link = text?.trim();

    if (!validateGroupLink(link)) {
      throw new Error(tradutor.texto1);
    }

    const [_, code] = link.match(linkRegex) || [];
    if (!code) {
      throw new Error(tradutor.texto1);
    }

    if (isPrems || isMods || isOwner || m.fromMe) {
      await naturalDelay();
      
      try {
        await conn.groupAcceptInvite(code);
        await conn.sendMessage(m.chat, { text: tradutor.texto2 }, { quoted: m });
      } catch (inviteError) {
        console.error('Error al aceptar invitación:', inviteError);
        throw new Error("❌ No pude unirme al grupo. El enlace podría ser inválido o haber expirado.");
      }
      
    } else {
      if (!checkRateLimit(m.sender)) {
        await conn.sendMessage(m.chat, { text: tradutor.texto4 }, { quoted: m });
        return;
      }

      const requestId = generateRequestId();
      const senderNumber = m.sender.split('@')[0];
      
      pendingRequests.set(requestId, {
        userId: m.sender,
        userNumber: senderNumber,
        link: link,
        code: code,
        timestamp: Date.now(),
        chat: m.chat
      });

      await conn.sendMessage(m.chat, { 
        text: tradutor.texto3 + `\`${requestId}\`` 
      }, { quoted: m });

      await naturalDelay();

      const dataArray = global.owner?.filter(([id]) => id) || [];
      
      if (dataArray.length > 0) {
        const notificationMessage = `🔔 *Nueva Solicitud de Grupo*\n\n` +
          `👤 Usuario: @${senderNumber}\n` +
          `📱 Número: ${senderNumber}\n` +
          `🔗 Enlace: ${link}\n` +
          `🆔 ID: \`${requestId}\`\n` +
          `⏰ Hora: ${new Date().toLocaleString()}\n\n` +
          `_Usa los botones para aprobar o rechazar:_`;

        for (const entry of dataArray) {
          try {
            const number = Array.isArray(entry) ? entry[0] : entry;
            await naturalDelay();
            
            await conn.sendMessage(number + '@s.whatsapp.net', {
              text: notificationMessage,
              mentions: [m.sender]
            }, { quoted: null });
            
            await conn.sendButton(
              number + '@s.whatsapp.net',
              '💡 Acciones disponibles:',
              'Sistema de Solicitudes',
              null,
              [
                ['✅ Aprobar Grupo', `${usedPrefix}aceptargrupo ${requestId}`],
                ['❌ Rechazar Grupo', `${usedPrefix}denegargrupo ${requestId}`]
              ],
              null,
              null
            );
          } catch (notifyError) {
            console.error('Error al notificar owner:', notifyError);
          }
        }
      }
    }

  } catch (err) {
    console.error('Error en handler join:', err);
    const errorMessage = err.message || tradutor.texto5;
    await conn.sendMessage(m.chat, { text: errorMessage }, { quoted: m });
  } finally {
    enviando = false;
  }
};

handler.help = ['join [chat.whatsapp.com]', 'aceptargrupo [id]', 'denegargrupo [id] [motivo]'];
handler.tags = ['premium', 'owner'];
handler.command = /^(join|nuevogrupo|aceptargrupo|acceptgroup|denegargrupo|denygroup)$/i;
handler.register = true;

export default handler;
