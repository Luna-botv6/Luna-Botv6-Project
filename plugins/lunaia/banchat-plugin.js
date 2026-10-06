import { getConfig, setConfig } from '../../lib/funcConfig.js';
import { isProtectedOwner } from '../../lib/funcion/ownerGuard.js';

const BOT = () => global.BotName || 'Luna';

export function isBanned(chatId) {
  return getConfig(chatId)?.isBanned === true;
}

const BAN_TRIGGERS = ['banea este chat', 'banea el chat', 'banea este grupo', 'banchat', 'ban chat', 'ban este grupo'];
const UNBAN_TRIGGERS = ['desbanea este chat', 'desbanea el chat', 'desbanea este grupo', 'unbanchat', 'unban chat', 'unban este grupo'];

// Mismo filtro que menu-plugin.js y banuser-plugin.js: si la frase tiene
// pinta de "¿cómo hago X?" en vez de un pedido directo de banear, se deja
// pasar al sistema de ayuda en vez de disparar el plugin igual.
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

async function handle(text, { conn, msg, jid }) {
  const senderId = msg.key.participant || msg.key.remoteJid;
  const senderTag = '@' + senderId.split('@')[0];

  const reply = (body) => conn.sendMessage(jid, {
    text: `🌙 *${BOT()}*\n\n${body}`,
    mentions: [senderId]
  }, { quoted: msg });

  const isOwner = isProtectedOwner(senderId, null, conn);

  if (!isOwner) return reply(`${senderTag} solo el owner puede banear o desbanear chats 🔐`);

  if (isBanIntent(text)) {
    setConfig(jid, { isBanned: true });
    return reply(`🚫 Chat baneado. El bot ya no va a responder en este grupo.\n\n_Para desbanearlo:_ @${BOT()} desbanea este chat`);
  } else {
    setConfig(jid, { isBanned: false });
    return reply('✅ Chat desbaneado. El bot vuelve a funcionar normalmente 😊');
  }
}

export default {
  canHandle,
  handle,
  name: 'banchat',
  description: 'Banea o desbanea un chat (solo owner)'
};