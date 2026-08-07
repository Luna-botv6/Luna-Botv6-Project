import fs from 'fs';
import path from 'path';
const linkRegex = /chat\.whatsapp\.com\/([0-9A-Za-z]{20,24})/i;
const dbFile = path.join(process.cwd(), 'database', 'join_requests.json');
const activeNotifying = new Set();
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
function loadRequests() {
  try {
    if (!fs.existsSync(dbFile)) return {};
    const data = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
    const now = Date.now();
    const expiryWindow = 10 * 60 * 1000;
    let modified = false;
    for (const id in data) {
      if (now - data[id].timestamp > expiryWindow) {
        delete data[id];
        modified = true;
      }
    }
    if (modified) saveRequests(data);
    return data;
  } catch (e) {
    return {};
  }
}
function saveRequests(data) {
  try {
    const dir = path.dirname(dbFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const tmpFile = dbFile + '.tmp';
    fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmpFile, dbFile);
  } catch (e) {}
}
function removeRequest(id) {
  const requests = loadRequests();
  if (requests[id]) {
    delete requests[id];
    saveRequests(requests);
  }
}
function generateRequestId(requests) {
  let id;
  do {
    id = Math.floor(1000 + Math.random() * 9000).toString();
  } while (requests[id]);
  return id;
}
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
function buildNoticeText(id, req) {
  return (
    `👋 *Hola Creador/a!*\n\n` +
    `He notado que alguien solicitó unirme a su grupo:\n` +
    `🆔 ID: *${id}*\n` +
    `👤 Solicitante: @${req.userNumber}\n` +
    `🔗 Link: ${req.link}\n` +
    `⏳ Tiempo: ${req.time} ${req.unit}${req.time > 1 ? 's' : ''}\n\n` +
    `ℹ️ Si deseas que el bot esté en ese grupo, ingresa al enlace y añádelo manualmente.`
  );
}
const handler = async (m, { conn, text, isMods, isOwner, isPrems, usedPrefix, command }) => {
  if (m.type === 'protocolMessage' || m.type === 'protocol') return;
  if (m.messageStubType === 20 || m.messageStubType === 21) return;
  const cmd = command.toLowerCase();
  if (cmd === 'listajoin' || cmd === 'solicitudesjoin' || cmd === 'requestsjoin') {
    if (!isOwner) return;
    const requests = loadRequests();
    const keys = Object.keys(requests);
    if (keys.length === 0) {
      return m.reply('📋 *No hay solicitudes de grupo pendientes.*');
    }
    const pendingId = keys[0];
    const req = requests[pendingId];
    return m.reply(buildNoticeText(pendingId, req), null, { mentions: [req.userId] });
  }
  const link = (m.quoted?.text || text)?.trim();
  const match = link?.match(linkRegex);
  if (!link || !match) {
    if (isOwner) return m.reply('❌ Envía un enlace válido de grupo de WhatsApp.');
    return;
  }
  const [, code] = match;
  const { time, unit } = parseTime(text);
  if (isPrems || isMods || isOwner || m.fromMe) {
    await m.reply(
      '📋 *Información de Grupo*\n\n' +
      `🔗 Link: ${link}\n` +
      `⏳ Tiempo: *${time} ${unit}${time > 1 ? 's' : ''}*\n\n` +
      'ℹ️ Para unir al bot, ingresa al enlace del grupo y añádelo manualmente.'
    );
    return;
  }
  const requests = loadRequests();
  const requestId = generateRequestId(requests);
  const senderNumber = m.sender.split('@')[0];
  requests[requestId] = {
    id: requestId,
    userId: m.sender,
    userNumber: senderNumber,
    link,
    code,
    time,
    unit,
    timestamp: Date.now()
  };
  saveRequests(requests);
  await delay(10000);
  try {
    await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });
  } catch (e) {}
};
handler.before = async function (m, { conn, isOwner, usedPrefix }) {
  if (m.isGroup || !isOwner || !m.text) return false;
  const requests = loadRequests();
  const keys = Object.keys(requests);
  if (keys.length === 0) return false;
  const pendingId = keys[0];
  if (activeNotifying.has(pendingId)) return false;
  activeNotifying.add(pendingId);
  const req = requests[pendingId];
  const isCommand = usedPrefix ? m.text.startsWith(usedPrefix) : false;
  const noticeDelay = isCommand ? 15000 : 10000;
  setTimeout(async () => {
    try {
      const sentMsg = await conn.sendMessage(m.chat, {
        text: buildNoticeText(pendingId, req)
      });
      if (sentMsg?.key) {
        setTimeout(async () => {
          try {
            await conn.sendMessage(m.chat, { delete: sentMsg.key });
          } catch (err) {}
          removeRequest(pendingId);
          activeNotifying.delete(pendingId);
        }, 30000);
      } else {
        removeRequest(pendingId);
        activeNotifying.delete(pendingId);
      }
    } catch (err) {
      removeRequest(pendingId);
      activeNotifying.delete(pendingId);
    }
  }, noticeDelay);
  return false;
};
handler.help = ['join [link] [tiempo]', 'listajoin'];
handler.tags = ['owner'];
handler.command = /^(join|unete|nuevogrupo|unir|unite|unirse|entra|entrar|listajoin|solicitudesjoin|requestsjoin)$/i;
export default handler;