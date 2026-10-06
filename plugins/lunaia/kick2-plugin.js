// Las keywords de este plugin son bastante genéricas ("elimina", "echa",
// "saca", "bota"...) y aparecen todo el tiempo en charla que no tiene nada
// que ver con expulsar a nadie ("sacame una foto", "echale sal", "bota la
// basura"). Por eso se dividen en dos niveles:
//
// - "strong": palabras que casi siempre significan expulsar a alguien
//   ("expulsa", "expulsar", "kickea"). No tienen límite de palabras.
// - "weak": verbos sueltos muy comunes ("elimina", "echa", "saca", "bota",
//   "echar", "sacar"). Solo cuentan si el mensaje es corto (para no
//   dispararse en medio de una frase larga sin relación), y se buscan con
//   límite de palabra (\b) para que "echale sal" no dispare por "echa".
import { isProtectedOwner } from '../../lib/funcion/ownerGuard.js';
const BOT = () => global.BotName || 'Luna';

const STRONG_KEYWORDS = ['expulsa', 'expulsar', 'kickea'];
const WEAK_KEYWORDS = ['elimina', 'echa', 'saca', 'bota', 'echar', 'sacar'];
const MAX_WORDS_FOR_WEAK_MATCH = 4;

function normalize(text) {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function canHandle(text) {
  const normalized = normalize(text);
  if (STRONG_KEYWORDS.some(k => normalized.includes(k))) return true;

  const wordCount = normalized.split(/\s+/).filter(Boolean).length;
  if (wordCount > MAX_WORDS_FOR_WEAK_MATCH) return false;

  // Los verbos débiles se buscan permitiendo el pronombre pegado
  // (sacalo, echalo, botalo) que es la forma más natural de decirlo,
  // pero no cualquier otra terminación (para no matchear "sacame",
  // "echale", "botando", etc.)
  return WEAK_KEYWORDS.some(k => new RegExp(`\\b${k}(lo|la|los|las)?\\b`).test(normalized));
}

function findParticipant(participants, rawId) {
  if (!rawId) return null;
  const digits = rawId.replace(/[^0-9]/g, '');
  let found = participants.find(p => p.id === rawId);
  if (found) return found;
  found = participants.find(p => p.lid === rawId);
  if (found) return found;
  return participants.find(p =>
    (p.id || '').replace(/[^0-9]/g, '') === digits ||
    (p.lid || '').replace(/[^0-9]/g, '') === digits
  ) || null;
}

async function handle(text, { conn, msg, jid, mentionedJids, groupData }) {
  const senderId = msg.key.participant || msg.key.remoteJid;
  const senderTag = '@' + senderId.split('@')[0];
  const { participants, isAdmin, isBotAdmin, isOwner } = groupData;

  const reply = (body, extraMentions = []) => conn.sendMessage(jid, {
    text: `🌙 *${BOT()}*\n\n${body}`,
    mentions: [senderId, ...extraMentions]
  }, { quoted: msg });

  if (!isBotAdmin) return reply(`${senderTag} necesito ser administrador para expulsar usuarios 😅`);
  if (!isAdmin && !isOwner) return reply(`${senderTag} solo los admins pueden expulsar usuarios 😅`);

  if (!global.db?.data?.settings?.[conn.user.jid]?.restrict) {
    return reply(`${senderTag} necesito que el owner habilite el modo restrict para usar esta funcion.\n\n_Usa: enable restrict_`);
  }

  const targetRaw = mentionedJids?.[0] || msg.quoted?.sender || null;
  if (!targetRaw) return reply(`${senderTag} a quien queres expulsar? Mencionald con @ 😊`);

  const target = findParticipant(participants, targetRaw);
  if (!target) return reply(`${senderTag} esa persona no esta en el grupo 🤔`);

  const targetId = target.id;
  const botDigits = (conn.user.jid || '').replace(/[^0-9]/g, '');
  if (targetId.replace(/[^0-9]/g, '') === botDigits) return reply('No puedo expulsarme a mi mismo 🤖');

  if (target.admin === 'admin' || target.admin === 'superadmin') {
    return reply(`${senderTag} no puedo expulsar a un admin 😅`);
  }

  const targetDigits = targetId.replace(/\D/g, '');
  if (isProtectedOwner(targetId, null, conn)) {
    return reply(`${senderTag} ese es el owner, ni lo intentes 😂🛡️`);
  }

  try {
    await conn.groupParticipantsUpdate(jid, [targetId], 'remove');
    const targetTag = '@' + targetId.split('@')[0];
    return reply(`✅ ${targetTag} fue expulsado del grupo.`, [targetId]);
  } catch {
    return reply(`${senderTag} no pude expulsarlo, puede que WhatsApp no lo permita en este momento 😔`);
  }
}

export default {
  canHandle,
  handle,
  name: 'kick2',
  description: 'Expulsa usuarios desde la IA'
};