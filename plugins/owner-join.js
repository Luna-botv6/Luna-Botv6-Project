const linkRegex = /chat\.whatsapp\.com\/([0-9A-Za-z]{20,24})/i;


let joinQueue = Promise.resolve();

const pendingRequests = new Map();
const REQUEST_EXPIRY = 24 * 60 * 60 * 1000;

const USER_LIMIT_WINDOW = 12 * 60 * 60 * 1000;
const MAX_REQUESTS_PER_USER = 3;
const userRequestStats = new Map();


const JOIN_COOLDOWN = 15_000;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const generateRequestId = () => {
  let id;
  do { id = Math.floor(1000 + Math.random() * 9000).toString(); }
  while (pendingRequests.has(id));
  return id;
};

const cleanupRequests = () => {
  const now = Date.now();
  for (const [id, data] of pendingRequests.entries())
    if (now - data.timestamp > REQUEST_EXPIRY) pendingRequests.delete(id);
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


const getGroupPreview = async (conn, code) => {
  try {
    const info = await conn.groupGetInviteInfo(code);
    return info; 
  } catch {
    return null;
  }
};


const enqueueJoin = (conn, code) =>
  (joinQueue = joinQueue
    .then(() => delay(JOIN_COOLDOWN))
    .then(() => conn.groupAcceptInvite(code)));

// ────────────────────────────────────────────────────────────────────────────
const handler = async (m, { conn, text, isMods, isOwner, isPrems, usedPrefix, command }) => {
  if (m.type === 'protocolMessage' || m.type === 'protocol') return;
  if (m.messageStubType === 20 || m.messageStubType === 21) return;

 
  if (command === 'aceptar' || command === 'aprobar') {
    if (!isOwner) return m.reply('❌ Solo propietarios pueden aprobar solicitudes.');

    const requestId = text?.trim();
    if (!requestId || !/^\d{4}$/.test(requestId))
      return m.reply('❌ Uso: /aceptar 1234');

    cleanupRequests();
    if (!pendingRequests.has(requestId))
      return m.reply('❌ Solicitud no encontrada o expirada.');

    const request = pendingRequests.get(requestId);
    pendingRequests.delete(requestId); 

    await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

    
    const preview = await getGroupPreview(conn, request.code);
    if (!preview) {
      return m.reply(
        `❌ No se pudo obtener info del grupo.\n\n` +
        `El enlace puede estar expirado o el grupo cerrado.\n` +
        `🆔 ID cancelada: ${requestId}`
      );
    }

    try {
      
      await enqueueJoin(conn, request.code);

      await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
      await m.reply(
        `✅ *Bot unido al grupo*\n\n` +
        `📌 Nombre: ${preview.subject || 'Desconocido'}\n` +
        `👥 Miembros: ${preview.size || '?'}\n` +
        `👤 Solicitante: ${request.userNumber}\n` +
        `🆔 ID: ${requestId}\n\n` +
        `ℹ️ Recuerda no usar el bot para spam.`
      );
    } catch (error) {
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
      const reason =
        error.data === 401 || error.message?.includes('not-authorized')
          ? '⚠️ Enlace inválido o expirado.'
          : error.message?.includes('Connection Closed')
          ? '⚠️ Conexión perdida. Intenta después.'
          : `⚠️ ${error.message || 'Error desconocido'}`;
      await m.reply(`❌ No pude unirme al grupo.\n\n${reason}`);
    }
    return;
  }

  
  if (command === 'denegar' || command === 'rechazar') {
    if (!isOwner) return m.reply('❌ Solo propietarios pueden rechazar solicitudes.');

    const args = text?.trim().split(' ');
    const requestId = args?.[0];
    const motivo = args?.slice(1).join(' ') || 'No cumple con las políticas de uso.';

    if (!requestId || !/^\d{4}$/.test(requestId))
      return m.reply('❌ Uso: /denegar 1234 [motivo]');

    cleanupRequests();
    if (!pendingRequests.has(requestId))
      return m.reply('❌ Solicitud no encontrada o expirada.');

    const request = pendingRequests.get(requestId);
    pendingRequests.delete(requestId);

    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
    await m.reply(
      `❌ *Solicitud rechazada*\n\n` +
      `👤 Usuario: ${request.userNumber}\n` +
      `📝 Motivo: ${motivo}`
    );
    return;
  }

  
  const link = text?.trim();
  const match = link?.match(linkRegex);
  if (!link || !match) return m.reply('❌ Envía un enlace válido de grupo de WhatsApp.');

  const [, code] = match;


  const preview = await getGroupPreview(conn, code);
  if (!preview) {
    return m.reply(
      '❌ No se pudo verificar el grupo.\n\n' +
      'El enlace puede ser inválido, estar expirado o el grupo no aceptar más miembros.'
    );
  }

  const previewText =
    `📌 *${preview.subject || 'Sin nombre'}*\n` +
    `👥 Miembros: ${preview.size || '?'}\n` +
    (preview.desc ? `📝 ${preview.desc.slice(0, 80)}...\n` : '');

  
  if (isPrems || isMods || isOwner || m.fromMe) {
    await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });
    try {
      await enqueueJoin(conn, code);
      await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
      await m.reply(`✅ Me uní al grupo.\n\n${previewText}\nUsa el bot con responsabilidad.`);
    } catch (error) {
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
      const reason =
        error.data === 401 || error.message?.includes('not-authorized')
          ? '⚠️ Enlace inválido o expirado.'
          : `⚠️ ${error.message || 'Error desconocido'}`;
      await m.reply(`❌ No pude unirme.\n\n${reason}`);
    }
    return;
  }


  if (!canUserRequest(m.sender)) {
    return m.reply(
      '⚠️ Has enviado demasiadas solicitudes en poco tiempo.\n\n' +
      'Intenta de nuevo más tarde.'
    );
  }

  cleanupRequests();
  const requestId = generateRequestId();
  const senderNumber = m.sender.split('@')[0];

  pendingRequests.set(requestId, {
    userId: m.sender,
    userNumber: senderNumber,
    link,
    code,
    timestamp: Date.now(),
  });

  await conn.sendMessage(m.chat, { react: { text: '📋', key: m.key } });
  await m.reply(
    `📋 *Solicitud enviada a revisión*\n\n` +
    `${previewText}\n` +
    `🆔 ID: *${requestId}*\n` +
    `⏰ El administrador revisará tu solicitud.`
  );

  
  const ownerMsg =
    `🔔 *Nueva Solicitud de Grupo*\n\n` +
    `👤 @${senderNumber}\n` +
    `🔗 ${link}\n` +
    `${previewText}\n` +
    `🆔 *${requestId}*\n` +
    `⏰ ${new Date().toLocaleString()}\n\n` +
    `_Comandos:_\n` +
    `✅ ${usedPrefix}aceptar ${requestId}\n` +
    `❌ ${usedPrefix}denegar ${requestId}`;

  const owners = (global.owner || [])
    .map(([num]) => String(num).replace(/[^0-9]/g, ''))
    .filter(num => num.length >= 10);

  for (const ownerNum of owners) {
    try {
      const jid = `${ownerNum}@s.whatsapp.net`;
      await Promise.race([
        conn.sendMessage(jid, { text: ownerMsg, mentions: [m.sender] }),
        delay(5000).then(() => { throw new Error('Timeout'); }),
      ]);
    } catch (err) {
      console.error(`Error notificando owner ${ownerNum}:`, err.message);
    }
    await delay(3000);
  }
};

handler.help = ['join [link]', 'aceptar [id]', 'denegar [id]'];
handler.tags = ['owner'];
handler.command = /^(join|nuevogrupo|aceptar|aprobar|denegar|rechazar)$/i;
handler.private = true;

export default handler;
