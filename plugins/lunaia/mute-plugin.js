import { muteUser, unmuteUser, isUserMuted } from '../gc-mute.js';
import { isProtectedOwner } from '../../lib/funcion/ownerGuard.js';

const BOT = () => global.BotName || 'Luna';

const NUM_WORDS = {
  uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7,
  ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, quince: 15, veinte: 20,
  treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60
};

// "callate"/"callalo" son bastante comunes como insulto directo entre
// personas discutiendo en el grupo, sin ninguna intención de invocar al
// bot. El resto de los triggers son específicos de esta acción, así que
// solo esos dos van a nivel "weak" (mensaje corto).
const STRONG_MUTE_TRIGGERS = ['mutea', 'mutear', 'mute al', 'mute a', 'silencia', 'silenciar', 'silencialo', 'mutealo', 'que se calle', 'hace callar'];
const WEAK_MUTE_TRIGGERS = ['callate', 'callalo'];
const MAX_WORDS_FOR_WEAK_MATCH = 4;

const UNMUTE_TRIGGERS = ['desmutea', 'desmutear', 'desilensia', 'dessilencia', 'dessilenciar', 'desilencia', 'unmute', 'ya puede hablar', 'dejalo hablar', 'quitale el mute', 'quitarle el mute'];

function normalize(text) {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[¿¡?!]/g, '').trim();
}

function parseTime(text) {
  let normalized = normalize(text);
  for (const [word, num] of Object.entries(NUM_WORDS)) {
    normalized = normalized.replace(new RegExp(`\\b${word}\\b`, 'g'), String(num));
  }

  const hoursMatch = normalized.match(/(\d+)\s*h(?:ora)?s?/);
  const minsMatch = normalized.match(/(\d+)\s*min(?:uto)?s?/);
  const ambiguousMatch = normalized.match(/(?:por\s+)(\d+)(?:\s*$)/);

  const hours = hoursMatch ? parseInt(hoursMatch[1]) : null;
  const mins = minsMatch ? parseInt(minsMatch[1]) : null;

  if (hours !== null && hours <= 720) return { minutes: hours * 60, unit: 'horas', value: String(hours) };
  if (mins !== null && mins <= 9999) return { minutes: mins, unit: 'minutos', value: String(mins) };
  if (ambiguousMatch && parseInt(ambiguousMatch[1]) <= 9999) return { minutes: null, ambiguous: true, value: ambiguousMatch[1] };
  return null;
}

function canHandle(text) {
  const normalized = normalize(text);
  if (UNMUTE_TRIGGERS.some(k => normalized.includes(k))) return true;
  if (STRONG_MUTE_TRIGGERS.some(k => normalized.includes(k))) return true;

  const wordCount = normalized.split(/\s+/).filter(Boolean).length;
  if (wordCount > MAX_WORDS_FOR_WEAK_MATCH) return false;
  return WEAK_MUTE_TRIGGERS.some(k => normalized.includes(k));
}

function isMuteIntent(text) {
  const normalized = normalize(text);
  if (UNMUTE_TRIGGERS.some(k => normalized.includes(k))) return false;
  return STRONG_MUTE_TRIGGERS.some(k => normalized.includes(k)) || WEAK_MUTE_TRIGGERS.some(k => normalized.includes(k));
}

async function handle(text, { conn, msg, jid, mentionedJids, groupData }) {
  const senderId = msg.key.participant || msg.key.remoteJid;
  const senderTag = '@' + senderId.split('@')[0];
  const { participants, isAdmin, isBotAdmin, isOwner } = groupData;

  const reply = (body, extraMentions = []) => conn.sendMessage(jid, {
    text: `🌙 *${BOT()}*\n\n${body}`,
    mentions: [senderId, ...extraMentions]
  }, { quoted: msg });

  if (!isBotAdmin) return reply(`${senderTag} necesito ser administrador para silenciar usuarios 😅`);
  if (!isAdmin && !isOwner) return reply(`${senderTag} solo los admins pueden silenciar usuarios 😅`);

  const targetRaw = mentionedJids?.[0];
  if (!targetRaw) {
    return reply(`${senderTag} ¿a quién querés ${isMuteIntent(text) ? 'silenciar' : 'dessilenciar'}? Mencionalo con @ 😊`);
  }
  const targetTag = '@' + targetRaw.split('@')[0];

  if (!isMuteIntent(text)) {
    const unmuted = await unmuteUser({ chat: jid, user: targetRaw, participants });
    if (!unmuted) return reply(`${senderTag} ${targetTag} no está silenciado 😅`, [targetRaw]);
    return reply(`🔊 Listo, ${targetTag} ya puede volver a escribir 😊`, [targetRaw]);
  }

  const isTargetOwner = isProtectedOwner(targetRaw, null, conn);

  if (isTargetOwner) {
    const ownerReplies = [
      `jajaja ni en sueños, ${senderTag} 😂 ese es mi creador, ¿querés que te mute a *vos*?`,
      `${senderTag} eso no va a pasar 💀 si seguís insistiendo el próximo muteado sos vos`,
      `intentar mutear al owner... muy valiente ${senderTag} 😭 pero no gracias`,
      `${senderTag} ¿en serio? ese es mi jefe, mejor ni lo intentes 😅`,
      `negativo ${senderTag}, el owner tiene inmunidad total 🛡️ pero yo no tengo inmunidad para mutearte a vos 👀`
    ];
    return reply(ownerReplies[Math.floor(Math.random() * ownerReplies.length)], [targetRaw]);
  }

  if (isUserMuted(jid, targetRaw)) return reply(`${senderTag} ${targetTag} ya está silenciado 😅`, [targetRaw]);

  const parsedTime = parseTime(text);
  if (parsedTime?.ambiguous) {
    return reply(
      `${senderTag} mencionaste *${parsedTime.value}* pero no dijiste si son minutos u horas 🤔\n\n` +
      `Ejemplo:\n• _mutea a ${targetTag} por ${parsedTime.value} minutos_\n` +
      `• _mutea a ${targetTag} por ${parsedTime.value} horas_`
    );
  }

  const muteResult = await muteUser({ conn, chat: jid, user: targetRaw, mutedBy: senderId, minutes: parsedTime?.minutes || null, participants });
  const durationText = parsedTime?.minutes
    ? `por *${muteResult.duration}* ⏳`
    : `sin horario de desmuteo ⏳\n\n_Si querés ponerle tiempo decime:\n"mutea a ${targetTag} por X minutos/horas"_`;

  return reply(`🔇 ${senderTag} silenció a ${targetTag} ${durationText}`, [targetRaw]);
}

export default {
  canHandle,
  handle,
  name: 'mute',
  description: 'Silencia o dessilencia usuarios desde la IA 🔇'
};