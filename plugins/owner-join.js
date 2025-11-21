const linkRegex = /chat.whatsapp.com\/([0-9A-Za-z]{20,24})/i;
let enviando = false;
let pendingRequests = new Map();
const REQUEST_EXPIRY = 24 * 60 * 60 * 1000;

const USER_LIMIT_WINDOW = 12 * 60 * 60 * 1000;
const MAX_REQUESTS_PER_USER = 3;
const userRequestStats = new Map();

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

const canUserRequest = (sender) => {
  const now = Date.now();
  const current = userRequestStats.get(sender) || { count: 0, first: now };
  if (now - current.first > USER_LIMIT_WINDOW) {
    userRequestStats.set(sender, { count: 1, first: now });
    return true;
  }
  if (current.count >= MAX_REQUESTS_PER_USER) return false;
  current.count += 1;
  userRequestStats.set(sender, current);
  return true;
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
      await m.reply(
        `✅ Bot unido al grupo\n\n` +
        `👤 Usuario: ${request.userNumber}\n` +
        `🆔 ID: ${requestId}\n\n` +
        `ℹ️ Recuerda usar el bot de forma responsable y sin spam.`
      );
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
    const motivo = args?.slice(1).join(' ') || 'No cumple con las políticas de uso.';

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
    await m.reply(
      `❌ Solicitud rechazada\n\n` +
      `👤 Usuario: ${request.userNumber}\n` +
      `📝 Motivo: ${motivo}\n\n` +
      `ℹ️ El bot evita unirse a grupos que puedan usarse para spam o actividades indebidas.`
    );
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
        await m.reply(
          '✅ Me uní al grupo exitosamente.\n\n' +
          'ℹ️ Usa el bot de forma responsable y evita el spam para proteger la cuenta.'
        );
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
      const sender = m.sender;
      if (!canUserRequest(sender)) {
        enviando = false;
        return m.reply(
          '⚠️ Has enviado demasiadas solicitudes en poco tiempo.\n\n' +
          'Intenta de nuevo más tarde. Esto ayuda a evitar abuso y proteger la cuenta del bot.'
        );
      }

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
      await m.reply(
        `📋 Solicitud enviada a revisión.\n\n` +
        `🆔 ID: *${requestId}*\n\n` +
        `⏰ El administrador revisará tu solicitud.\n` +
        `ℹ️ El bot solo se une a grupos que respetan las normas y no se usan para spam.`
      );
      
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
          `❌ ${usedPrefix}denegar ${requestId}\n\n` +
          `ℹ️ Revisa que el grupo no se use para spam ni actividades que puedan infringir las políticas de WhatsApp.`;

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
