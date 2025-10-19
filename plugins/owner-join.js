const linkRegex = /chat.whatsapp.com\/([0-9A-Za-z]{20,24})/i;
let enviando = false;
let pendingRequests = new Map();
const REQUEST_EXPIRY = 24 * 60 * 60 * 1000;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const generateRequestId = () => {
  let id;
  do {
    id = Math.floor(1000 + Math.random() * 9000).toString();
  } while (pendingRequests.has(id));
  return id;
};

const cleanupRequests = () => {
  const now = Date.now();
  for (const [id, data] of pendingRequests.entries()) {
    if (now - data.timestamp > REQUEST_EXPIRY) pendingRequests.delete(id);
  }
};

const handler = async (m, {conn, text, isMods, isOwner, isPrems, usedPrefix, command}) => {
  
  if (m.type === 'protocolMessage' || m.type === 'protocol') return;
  if (m.messageStubType === 20 || m.messageStubType === 21) return;
  if (m.mtype === 'templateButtonReplyMessage') await delay(3000);

  if (command === 'aceptar' || command === 'aprobar') {
    if (!isOwner) return m.reply('❌ Solo propietarios pueden aprobar solicitudes.');
    
    const requestId = text?.trim();
    if (!requestId || !/^\d{4}$/.test(requestId)) {
      return m.reply('❌ Uso: /aceptar 1234');
    }

    cleanupRequests();
    if (!pendingRequests.has(requestId)) {
      return m.reply('❌ Solicitud no encontrada o expirada.');
    }

    const request = pendingRequests.get(requestId);
    
    try {
      await delay(5000);
      await conn.groupAcceptInvite(request.code);
      await conn.sendMessage(m.chat, {react: {text: '✅', key: m.key}});
      await delay(2000);
      await m.reply(`✅ Bot unido al grupo\n\n👤 Usuario: ${request.userNumber}\n🆔 ID: ${requestId}`);
      pendingRequests.delete(requestId);
    } catch (error) {
      await conn.sendMessage(m.chat, {react: {text: '❌', key: m.key}});
      await delay(2000);
      let msg = '❌ Error al unirse al grupo.\n\n';
      if (error.data === 401 || error.message?.includes('not-authorized')) {
        msg += '⚠️ Enlace inválido o expirado.';
      } else if (error.message?.includes('Connection Closed')) {
        msg += '⚠️ Conexión perdida. Intenta después.';
      } else {
        msg += `⚠️ ${error.message || 'Error desconocido'}`;
      }
      await m.reply(msg);
    }
    return;
  }

  if (command === 'denegar' || command === 'rechazar') {
    if (!isOwner) return m.reply('❌ Solo propietarios pueden rechazar solicitudes.');
    
    const args = text?.trim().split(' ');
    const requestId = args?.[0];
    const motivo = args?.slice(1).join(' ') || 'No cumple con las políticas';

    if (!requestId || !/^\d{4}$/.test(requestId)) {
      return m.reply('❌ Uso: /denegar 1234 [motivo]');
    }

    cleanupRequests();
    if (!pendingRequests.has(requestId)) {
      return m.reply('❌ Solicitud no encontrada o expirada.');
    }

    const request = pendingRequests.get(requestId);
    
    await conn.sendMessage(m.chat, {react: {text: '❌', key: m.key}});
    await delay(2000);
    await m.reply(`❌ Solicitud rechazada\n\n👤 Usuario: ${request.userNumber}\n📝 Motivo: ${motivo}`);
    pendingRequests.delete(requestId);
    return;
  }

  if (enviando) return m.reply('⏳ Procesando otra solicitud, espera...');
  enviando = true;

  try {
    const link = text?.trim();
    if (!link || !link.match(linkRegex)) {
      enviando = false;
      return m.reply('❌ Envía un enlace válido de grupo de WhatsApp.');
    }

    const [_, code] = link.match(linkRegex) || [];
    if (!code) {
      enviando = false;
      return m.reply('❌ Enlace inválido.');
    }

    if (isPrems || isMods || isOwner || m.fromMe) {
      await delay(5000);
      try {
        await conn.groupAcceptInvite(code);
        await conn.sendMessage(m.chat, {react: {text: '✅', key: m.key}});
        await delay(2000);
        await m.reply('✅ Me uní al grupo exitosamente.');
      } catch (error) {
        await conn.sendMessage(m.chat, {react: {text: '❌', key: m.key}});
        await delay(2000);
        let msg = '❌ No pude unirme al grupo.\n\n';
        if (error.data === 401 || error.message?.includes('not-authorized')) {
          msg += '⚠️ Enlace inválido o expirado.';
        } else if (error.message?.includes('Connection Closed')) {
          msg += '⚠️ Conexión perdida. Intenta después.';
        } else {
          msg += `⚠️ ${error.message || 'Error desconocido'}`;
        }
        throw new Error(msg);
      }
    } else {
      cleanupRequests();
      
      const requestId = generateRequestId();
      const senderNumber = m.sender.split('@')[0];
      
      pendingRequests.set(requestId, {
        userId: m.sender,
        userNumber: senderNumber,
        link: link,
        code: code,
        timestamp: Date.now()
      });

      await conn.sendMessage(m.chat, {react: {text: '📋', key: m.key}});
      await delay(2000);
      await m.reply(`📋 Solicitud enviada a revisión.\n\n🆔 ID: *${requestId}*\n\n⏰ El administrador revisará tu solicitud.`);
      
      await delay(6000);

      const mainOwner = '5493483466763@s.whatsapp.net';
      
      try {
        const msg = `🔔 *Nueva Solicitud de Grupo*\n\n` +
          `👤 @${senderNumber}\n` +
          `📱 ${senderNumber}\n` +
          `🔗 ${link}\n` +
          `🆔 *${requestId}*\n` +
          `⏰ ${new Date().toLocaleString()}\n\n` +
          `_Comandos:_\n` +
          `✅ ${usedPrefix}aceptar ${requestId}\n` +
          `❌ ${usedPrefix}denegar ${requestId}`;

        await conn.sendMessage(mainOwner, {
          text: msg,
          mentions: [m.sender]
        });
        
      } catch (error) {
        console.error('Error notificando owner:', error.message);
      }
    }
  } catch (error) {
    console.error('Error en join:', error);
    await m.reply(error.message || '❌ Ocurrió un error al procesar la solicitud.');
  } finally {
    enviando = false;
  }
};

handler.help = ['join [link]', 'aceptar [id]', 'denegar [id]'];
handler.tags = ['owner'];
handler.command = /^(join|nuevogrupo|aceptar|aprobar|denegar|rechazar)$/i;
handler.private = true;

export default handler;