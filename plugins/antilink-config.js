import { getConfig, setConfig } from '../lib/funcConfig.js';
import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js';
import { pendingSessions } from './reply-trigger.js';

const CATEGORIES = [
  { key: 'general',    label: 'Links generales (http/https/www)',     emoji: '🌐' },
  { key: 'whatsapp',   label: 'Grupos de WhatsApp',                   emoji: '💬' },
  { key: 'whchannel',  label: 'Canales de WhatsApp',                  emoji: '📢' },
  { key: 'facebook',   label: 'Facebook / FB',                        emoji: '📘' },
  { key: 'instagram',  label: 'Instagram',                            emoji: '📸' },
  { key: 'tiktok',     label: 'TikTok',                               emoji: '🎵' },
  { key: 'twitter',    label: 'Twitter / X',                          emoji: '🐦' },
  { key: 'youtube',    label: 'YouTube',                              emoji: '▶️' },
  { key: 'telegram',   label: 'Telegram',                             emoji: '✈️' },
  { key: 'discord',    label: 'Discord',                              emoji: '🎮' },
];

const DEFAULT_ANTILINK_CONFIG = Object.fromEntries(
  CATEGORIES.map(c => [c.key, true])
);

const SESSION_TIMEOUT = 60_000;

function getAntiLinkConfig(config) {
  return { ...DEFAULT_ANTILINK_CONFIG, ...(config.antiLinkConfig || {}) };
}

function buildMenu(alConfig) {
  const BOT = () => global.BotName || 'Luna';
  const allOn = CATEGORIES.every(c => alConfig[c.key]);

  let menu = `🔗 *${BOT()} — AntiLink Config*\n\n`;
  menu += `_Elige qué tipo de links bloquear en este grupo._\n\n`;

  CATEGORIES.forEach((cat, i) => {
    const estado = alConfig[cat.key] ? '✅' : '❌';
    menu += `> *${i + 1}.* ${cat.emoji} ${cat.label} → ${estado}\n`;
  });

  menu += `\n> *0.* ${allOn ? '🔴 Desactivar TODO' : '🟢 Activar TODO'}\n`;
  menu += `\n_Responde con el número o varios a la vez:_\n`;
  menu += `_Ejemplo: \`1 3 5\` o solo \`0\` para todo_\n`;
  menu += `_⏳ Tienes 60 segundos para responder_`;

  return menu;
}

const handler = async (m, { conn }) => {
  if (!m.isGroup) return;

  const groupData = await getGroupDataForPlugin(conn, m.chat, m.sender);
  if (!groupData.isAdmin && !groupData.isRAdmin) return;

  const config = getConfig(m.chat);
  if (!config.antiLink && !config.antiLink2) {
    await conn.sendMessage(m.chat, {
      text: `⚠️ El antilink no está activado en este grupo.\nActívalo primero con el comando correspondiente.`
    }, { quoted: m });
    return;
  }

  const alConfig = getAntiLinkConfig(config);

  if (pendingSessions.has(m.chat)) {
    clearTimeout(pendingSessions.get(m.chat).timer);
  }

  const timer = setTimeout(() => {
    pendingSessions.delete(m.chat);
  }, SESSION_TIMEOUT);

  pendingSessions.set(m.chat, { adminId: m.sender, timer, type: 'antilink' });

  await conn.sendMessage(m.chat, {
    text: buildMenu(alConfig)
  }, { quoted: m });
};

handler.before = async function (m, { conn }) {
  if (!m.isGroup || !m.text || !pendingSessions.has(m.chat)) return;

  const session = pendingSessions.get(m.chat);
  if (session.type !== 'antilink') return;
  if (m.sender !== session.adminId) return;

  const input = m.text.trim();
  const nums = [...new Set(input.split(/\s+/).map(Number).filter(n => !isNaN(n) && n >= 0 && n <= CATEGORIES.length))];
  if (nums.length === 0) return;

  clearTimeout(session.timer);
  pendingSessions.delete(m.chat);

  const config = getConfig(m.chat);
  const alConfig = getAntiLinkConfig(config);

  if (nums.includes(0)) {
    const allOn = CATEGORIES.every(c => alConfig[c.key]);
    CATEGORIES.forEach(c => { alConfig[c.key] = !allOn; });
  } else {
    nums.forEach(n => {
      const cat = CATEGORIES[n - 1];
      if (cat) alConfig[cat.key] = !alConfig[cat.key];
    });
  }

  setConfig(m.chat, { antiLinkConfig: alConfig });

  let reply = `✅ *Configuración actualizada*\n\n`;

  if (nums.includes(0)) {
    const newState = alConfig[CATEGORIES[0].key];
    reply += `> ${newState ? '🟢 Todas las categorías ACTIVADAS' : '🔴 Todas las categorías DESACTIVADAS'}`;
  } else {
    nums.forEach(n => {
      const cat = CATEGORIES[n - 1];
      if (cat) reply += `> ${alConfig[cat.key] ? '✅' : '❌'} ${cat.emoji} ${cat.label}\n`;
    });
  }

  await conn.sendMessage(m.chat, { text: reply }, { quoted: m });
};

handler.command = /^(alc|antilc|linkset)$/i;
handler.group = true;

export default handler;
