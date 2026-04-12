const linkRegex = /chat\.whatsapp\.com\/([0-9A-Za-z]{20,24})/i;

let joinQueue = Promise.resolve();

const pendingRequests = new Map();
const REQUEST_EXPIRY = 24 * 60 * 60 * 1000;

const USER_LIMIT_WINDOW = 12 * 60 * 60 * 1000;
const MAX_REQUESTS_PER_USER = 3;
const userRequestStats = new Map();

const JOIN_COOLDOWN = 3_000;

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

const parseTime = (text) => {
  const match = text?.match(/(\d+)\s*(minuto|hora|día|dias)/i);
  if (!match) return { time: 60, unit: 'minuto', timeInMs: 60 * 60 * 1000 };
  const time = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  let timeInMs;
  if (unit.includes('minuto')) timeInMs = time * 60 * 1000;
  else if (unit.includes('hora')) timeInMs = time * 60 * 60 * 1000;
  else timeInMs = time * 24 * 60 * 60 * 1000;
  return { time, unit, timeInMs };
};

const getJoinError = (error) => {
  if (!error) return '⚠️ Error desconocido.';
  const msg = (error.message || '').toLowerCase();
  const code = error.data ?? error.output?.statusCode ?? error.status;
  if (code === 401 || msg.includes('not-authorized') || msg.includes('forbidden'))
    return '⚠️ Enlace inválido o expirado.';
  if (msg.includes('connection closed') || msg.includes('connection lost'))
    return '⚠️ Conexión perdida. Intenta después.';
  if (msg.includes('already a participant') || msg.includes('already-participant'))
    return '⚠️ El bot ya es miembro de ese grupo.';
  return `⚠️ ${error.message || 'Error desconocido'}`;
};

const doJoin = (conn, code) =>
  (joinQueue = joinQueue
    .then(() => delay(JOIN_COOLDOWN))
    .then(() => conn.groupAcceptInvite(code)));

const sendWelcomeMessage = async (conn, groupId, senderNumber, time, unit) => {
  try {
    const meta = await conn.groupMetadata(groupId);
    const name = meta.subject || 'este grupo';
    const plural = time > 1 ? 's' : '';
    await conn.sendMessage(groupId, {
      text:
        `👋 *Hola a todos!*\n\n` +
        `Soy *${conn.user.name}*, fui invitado por *@${senderNumber.split('@')[0]}*\n\n` +
        `Para ver el menú escribe *#help*\n\n` +
        `⏳ Saldré automáticamente después de: *${time} ${unit}${plural}*`,
      mentions: [senderNumber],
    });
  } catch (e) {
    console.error('[owner-join] sendWelcomeMessage error:', e?.message);
  }
};

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

    try {
      const groupId = await doJoin(conn, request.code);

      if (global.db?.data?.chats) {
        global.db.data.chats[groupId] = global.db.data.chats[groupId] || {};
        global.db.data.chats[groupId].expired = Date.now() + request.timeInMs;
      }

      await sendWelcomeMessage(conn, groupId, request.userId, request.time, request.unit);

      await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
      await m.reply(
        `✅ *Bot unido al grupo*\n\n` +
        `👤 Solicitante: ${request.userNumber}\n` +
        `⏳ Tiempo: ${request.time} ${request.unit}${request.time > 1 ? 's' : ''}\n` +
        `🆔 ID solicitud: ${requestId}\n\n` +
        `ℹ️ Recuerda no usar el bot para spam.`
      );
    } catch (error) {
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
      await m.reply(`❌ No pude unirme al grupo.\n\n${getJoinError(error)}`);
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

  const link = (m.quoted?.text || text)?.trim();
  const match = link?.match(linkRegex);
  if (!link || !match) return m.reply('❌ Envía un enlace válido de grupo de WhatsApp.');

  const [, code] = match;
  const { time, unit, timeInMs } = parseTime(text);

  if (isPrems || isMods || isOwner || m.fromMe) {
    await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });
    try {
      const groupId = await doJoin(conn, code);

      if (global.db?.data?.chats) {
        global.db.data.chats[groupId] = global.db.data.chats[groupId] || {};
        global.db.data.chats[groupId].expired = Date.now() + timeInMs;
      }

      await sendWelcomeMessage(conn, groupId, m.sender, time, unit);

      await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
      await m.reply(
        `✅ *Me uní al grupo exitosamente*\n\n` +
        `⏳ Tiempo: *${time} ${unit}${time > 1 ? 's' : ''}*\n\n` +
        `Usa el bot con responsabilidad.`
      );
    } catch (error) {
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
      await m.reply(`❌ No pude unirme.\n\n${getJoinError(error)}`);
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
    time,
    unit,
    timeInMs,
    timestamp: Date.now(),
  });

  await conn.sendMessage(m.chat, { react: { text: '📋', key: m.key } });
  await m.reply(
    `📋 *Solicitud enviada a revisión*\n\n` +
    `🔗 ${link}\n` +
    `⏳ Tiempo solicitado: *${time} ${unit}${time > 1 ? 's' : ''}*\n` +
    `🆔 ID: *${requestId}*\n\n` +
    `💌 El administrador revisará tu solicitud. Por favor ten paciencia.`
  );

  const ownerMsg =
    `🔔 *Nueva Solicitud de Grupo*\n\n` +
    `👤 @${senderNumber}\n` +
    `🔗 ${link}\n` +
    `⏳ Tiempo: ${time} ${unit}${time > 1 ? 's' : ''}\n` +
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

handler.help = ['join [link] [tiempo]', 'aceptar [id]', 'denegar [id]'];
handler.tags = ['owner'];
handler.command = /^(join|unete|nuevogrupo|unir|unite|unirse|entra|entrar|aceptar|aprobar|denegar|rechazar)$/i;
handler.private = true;

export default handler;
