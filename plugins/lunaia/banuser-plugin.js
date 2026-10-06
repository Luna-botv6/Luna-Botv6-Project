import { isProtectedOwner } from '../../lib/funcion/ownerGuard.js';

const BOT = () => global.BotName || 'Luna';

const BAN_TRIGGERS = ['banea a', 'banear a', 'banea al', 'banea usuario', 'ban a', 'banealo', 'baneala'];
const UNBAN_TRIGGERS = ['desbanea a', 'desbanear a', 'desbanea al', 'desbanea usuario', 'unban a', 'desbanealo', 'desbaneala'];

// "¿cómo baneo a un usuario?" contiene "banear a" como substring exacta,
// así que sin este filtro dispara el plugin directo (preguntando "¿a quién
// querés banear?") en vez de dejar que el sistema de ayuda explique cómo
// se usa el comando. Mismo filtro que ya tiene menu-plugin.js.
const QUESTION_PATTERNS = [
  /\bcomo\b/, /\bdonde\b/, /\bcual es el comando\b/, /\bque comando\b/,
  /\bde que forma\b/, /\bde que manera\b/
];

function looksLikeHowToQuestion(text) {
  const normalized = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return QUESTION_PATTERNS.some(p => p.test(normalized));
}

function normalize(text) {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function canHandle(text) {
  if (looksLikeHowToQuestion(text)) return false;
  const normalized = normalize(text);
  return BAN_TRIGGERS.some(k => normalized.includes(k)) || UNBAN_TRIGGERS.some(k => normalized.includes(k));
}

function isBanIntent(text) {
  const normalized = normalize(text);
  if (UNBAN_TRIGGERS.some(k => normalized.includes(k))) return false;
  return BAN_TRIGGERS.some(k => normalized.includes(k));
}

function findParticipant(participants, rawId) {
  if (!rawId) return null;
  const digits = rawId.replace(/[^0-9]/g, '');
  return participants.find(p =>
    p.id === rawId ||
    p.lid === rawId ||
    (p.id || '').replace(/[^0-9]/g, '') === digits ||
    (p.lid || '').replace(/[^0-9]/g, '') === digits
  ) || null;
}

async function handle(text, { conn, msg, jid, mentionedJids, groupData }) {
  const senderId = msg.key.participant || msg.key.remoteJid;
  const senderTag = '@' + senderId.split('@')[0];
  const { participants } = groupData;

  const reply = (body, extraMentions = []) => conn.sendMessage(jid, {
    text: `🌙 *${BOT()}*\n\n${body}`,
    mentions: [senderId, ...extraMentions]
  }, { quoted: msg });

  const isOwner = isProtectedOwner(senderId, null, conn);

  if (!isOwner) return reply(`${senderTag} solo el owner puede banear usuarios 🔐`);

  const targetRaw = mentionedJids?.[0] || null;
  if (!targetRaw) {
    return reply(`${senderTag} ¿a quién querés ${isBanIntent(text) ? 'banear' : 'desbanear'}? Mencionalo con @ 😊`);
  }

  const found = findParticipant(participants, targetRaw);
  const targetId = found?.id || targetRaw;
  const targetDigits = targetId.replace(/\D/g, '');
  const targetTag = '@' + targetId.split('@')[0];
  const botDigits = (conn.user.jid || '').replace(/[^0-9]/g, '');

  if (targetDigits === botDigits) return reply('No me puedo banear a mí misma 🤖');

  if (isProtectedOwner(targetId, null, conn)) {
    const ownerReplies = [
      `${senderTag} ese es el owner, ni lo intentes 😂🛡️`,
      `jajaja no ${senderTag}, ese es mi creador. ¿Querés que te banee a *vos*? 👀`,
      `${senderTag} eso no va a pasar, el owner tiene inmunidad total 🛡️`
    ];
    return reply(ownerReplies[Math.floor(Math.random() * ownerReplies.length)]);
  }

  if (!global.db?.data?.users) global.db.data.users = {};
  if (!global.db.data.users[targetId]) global.db.data.users[targetId] = {};

  if (isBanIntent(text)) {
    if (global.db.data.users[targetId]?.banned) {
      return reply(
        `⚠️ ${targetTag} ya estaba baneado ${senderTag} 😅\n\n_Si querés desbanearlo decime:_\n@${BOT()} desbanea a ${targetTag}`,
        [targetId]
      );
    }
    global.db.data.users[targetId].banned = true;
    global.db.data.users[targetId].bannedBy = senderId;
    global.db.data.users[targetId].bannedAt = Date.now();
    global.db.data.users[targetId].bannedMessageCount = 0;
    return reply(
      `🚫 *Usuario baneado*\n\n👤 Usuario: ${targetTag}\n👮 Por: ${senderTag}\n\n_Este usuario ya no podrá usar los comandos del bot._\n_Para desbanearlo:_ @${BOT()} desbanea a ${targetTag}`,
      [targetId]
    );
  } else {
    if (!global.db.data.users[targetId]?.banned) {
      return reply(`🤔 ${targetTag} no estaba baneado ${senderTag}\n\n_No había nada que desbanear 😅_`, [targetId]);
    }
    global.db.data.users[targetId].banned = false;
    delete global.db.data.users[targetId].bannedBy;
    delete global.db.data.users[targetId].bannedAt;
    global.db.data.users[targetId].bannedMessageCount = 0;
    global.db.data.users[targetId].bannedMessageSent = false;
    return reply(
      `✅ *Usuario desbaneado*\n\n👤 Usuario: ${targetTag}\n👮 Por: ${senderTag}\n\n_${targetTag} ya puede volver a usar el bot normalmente 😊_`,
      [targetId]
    );
  }
}

export default {
  canHandle,
  handle,
  name: 'banuser',
  description: 'Banea o desbanea usuarios desde la IA (solo owner)'
};