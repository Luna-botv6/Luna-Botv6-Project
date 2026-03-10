import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js';

const NUM_WORDS = {
  'cero':0,'uno':1,'una':1,'dos':2,'tres':3,'cuatro':4,'cinco':5,
  'seis':6,'siete':7,'ocho':8,'nueve':9,'diez':10,'once':11,'doce':12,
  'quince':15,'veinte':20,'treinta':30,'cuarenta':40,'cincuenta':50,'sesenta':60,
};

function normalizeText(text) {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[¿¡?!]/g, '').trim();
}

function parseTime(text) {
  let norm = normalizeText(text);
  for (const [w, n] of Object.entries(NUM_WORDS)) {
    norm = norm.replace(new RegExp('\\b' + w + '\\b', 'g'), String(n));
  }
  const horasMatch = norm.match(/(\d+)\s*h(?:ora)?s?/);
  const minsMatch  = norm.match(/(\d+)\s*m(?:in(?:uto)?s?)?/);
  if (horasMatch) return { minutes: parseInt(horasMatch[1]) * 60, unit: 'horas', value: horasMatch[1] };
  if (minsMatch)  return { minutes: parseInt(minsMatch[1]),         unit: 'minutos', value: minsMatch[1] };
  const numOnly = norm.match(/(?:por\s+)?(\d+)(?:\s*$)/);
  if (numOnly) return { minutes: null, ambiguous: true, value: numOnly[1] };
  return null;
}

function getMutesDB() {
  if (!global.db?.data) return {};
  if (!global.db.data.mutes) global.db.data.mutes = {};
  return global.db.data.mutes;
}

function formatDuration(minutes) {
  if (!minutes) return 'sin límite de tiempo';
  if (minutes < 60) return `${minutes} minuto${minutes !== 1 ? 's' : ''}`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  let str = `${h} hora${h !== 1 ? 's' : ''}`;
  if (m > 0) str += ` y ${m} minuto${m !== 1 ? 's' : ''}`;
  return str;
}

function scheduleUnmute(muteKey, minutes, conn, chat, user) {
  if (!minutes) return;
  setTimeout(async () => {
    const db = getMutesDB();
    if (db[muteKey]) {
      delete db[muteKey];
      await conn.sendMessage(chat, {
        text: `🔊 @${user.split('@')[0]} ya puede volver a escribir, se cumplió el tiempo de silencio.`,
        mentions: [user],
      });
    }
  }, minutes * 60 * 1000);
}

export async function muteUser({ conn, chat, user, mutedBy, minutes, participants }) {
  const db = getMutesDB();
  const muteKey = `${chat}_${user}`;
  const until = minutes ? Date.now() + minutes * 60 * 1000 : null;
  const entry = { mutedBy, mutedAt: Date.now(), until };
  db[muteKey] = entry;
  const pEntry = (participants || []).find(p => p.id === user);
  if (pEntry?.lid) db[`${chat}_${pEntry.lid}`] = entry;
  scheduleUnmute(muteKey, minutes, conn, chat, user);
  return { muteKey, until, duration: formatDuration(minutes) };
}

export async function unmuteUser({ chat, user, participants }) {
  const db = getMutesDB();
  let removed = false;
  // Delete JID key
  const jidKey = `${chat}_${user}`;
  if (db[jidKey]) { delete db[jidKey]; removed = true; }
  // Delete LID key via participants
  const pEntry = (participants || []).find(p => p.id === user || p.lid === user);
  if (pEntry?.lid) { const lidKey = `${chat}_${pEntry.lid}`; if (db[lidKey]) { delete db[lidKey]; removed = true; } }
  if (pEntry?.id)  { const idKey  = `${chat}_${pEntry.id}`;  if (db[idKey])  { delete db[idKey];  removed = true; } }
  // Also scan all keys for this group that contain the user number
  const userNum = user.replace(/[^0-9]/g, '');
  for (const key of Object.keys(db)) {
    if (key.startsWith(chat + '_') && key.replace(/[^0-9]/g, '').includes(userNum)) {
      delete db[key]; removed = true;
    }
  }
  return removed;
}

export function isUserMuted(chat, user) {
  const db = getMutesDB();
  const userNum = user.replace(/[^0-9]/g, '');
  for (const key of Object.keys(db)) {
    if (!key.startsWith(chat + '_')) continue;
    if (!key.replace(/[^0-9]/g, '').includes(userNum)) continue;
    const entry = db[key];
    if (!entry) continue;
    if (entry.until && Date.now() > entry.until) { delete db[key]; continue; }
    return true;
  }
  return false;
}

export function getMuteInfo(chat, user) {
  const db = getMutesDB();
  return db[`${chat}_${user}`] || null;
}

const MENU_MUTE = (prefix, cmd) =>
`🔇 *Silenciar usuario*

*Sin tiempo:*
${prefix}${cmd} @usuario

*Con tiempo:*
${prefix}${cmd} @usuario por 30 minutos
${prefix}${cmd} @usuario por 2 horas
${prefix}${cmd} @usuario 1h

_El usuario no podrá escribir en el grupo._`;

const handler = async (m, { conn, usedPrefix, isOwner, command }) => {
  try {
    if (!m.isGroup) return m.reply('*[⚠] Este comando solo funciona en grupos.*');

    const { participants, isAdmin, isBotAdmin } = await getGroupDataForPlugin(conn, m.chat, m.sender);

    if (!isBotAdmin) return m.reply('*[⚠] El bot debe ser administrador para usar este comando.*');
    if (!isAdmin && !isOwner) return m.reply('*[⚠] Solo los administradores pueden usar este comando.*');

    const resolveLid = (jid) => {
      if (!jid) return null;
      if (!jid.includes('@lid')) return jid;
      return participants.find(u => u.lid === jid)?.id || null;
    };

    const isMuteCmd   = /^(mute|silenciar)$/i.test(command);
    const isUnmuteCmd = /^(unmute|dessilenciar)$/i.test(command);

    let user = null;
    if (m.mentionedJid?.[0]) {
      user = resolveLid(m.mentionedJid[0]) || m.mentionedJid[0];
    } else if (m.quoted?.sender) {
      user = resolveLid(m.quoted.sender) || m.quoted.sender;
    } else if (m.text) {
      const num = m.text.replace(/[^0-9]/g, '');
      if (num.length >= 11 && num.length <= 15) user = num + '@s.whatsapp.net';
    }

    if (!user) {
      if (isMuteCmd) return m.reply(MENU_MUTE(usedPrefix, command), m.chat, { mentions: [] });
      return m.reply(`*Uso:* ${usedPrefix}${command} @usuario`);
    }

    const exists = participants.find(p => p.id === user);
    if (!exists) return m.reply('*[⚠] Ese usuario no está en el grupo.*');

    const adminTag = `@${m.sender.split('@')[0]}`;
    const userTag  = `@${user.split('@')[0]}`;

    if (isMuteCmd) {
      if (isUserMuted(m.chat, user)) return m.reply(`*[⚠] ${userTag} ya está silenciado.*`);

      const textSinMenciones = (m.text || '').replace(/@\d+/g, '').trim();
      const timeResult = parseTime(textSinMenciones);

      if (timeResult?.ambiguous) {
        return m.reply(
          `⚠️ Especificaste *${timeResult.value}* pero no dijiste si son minutos u horas.\n\n`
        + `Ejemplo:\n• _${usedPrefix}${command} @usuario por ${timeResult.value} minutos_\n`
        + `• _${usedPrefix}${command} @usuario por ${timeResult.value} horas_`
        );
      }

      const { duration } = await muteUser({
        conn, chat: m.chat, user, mutedBy: m.sender,
        minutes: timeResult?.minutes || null,
        participants,
      });

      const duracionStr = timeResult?.minutes ? duration : 'Sin limite de tiempo';

      await conn.sendMessage(m.chat, {
        text: '🔇 *Silencio activado*' + '\n\n' + '👤 Usuario: ' + userTag + '\n' + '👮 Por: ' + adminTag + '\n' + '⏳ Duracion: *' + duracionStr + '*',
        mentions: [m.sender, user],
      });

    } else if (isUnmuteCmd) {
      const removed = await unmuteUser({ chat: m.chat, user, participants });
      if (!removed) return m.reply(`*[⚠]* ${userTag} no está silenciado.`);
      await conn.sendMessage(m.chat, {
        text: `🔊 *Silencio desactivado*

👤 Usuario: ${userTag}
👮 Por: ${adminTag}

_Ya puede escribir en el grupo._`,
        mentions: [m.sender, user],
      });
    }

  } catch (e) {
    console.error('[ERROR MUTE]', e);
    await m.reply('*[⚠] Error al procesar el comando.*');
  }
};

handler.help = ['mute <@user> [por X minutos/horas]', 'unmute <@user>', 'silenciar <@user>', 'dessilenciar <@user>'];
handler.tags = ['group'];
handler.command = /^(mute|silenciar|unmute|dessilenciar)$/i;
handler.group = true;

export default handler;