import { getConfig, setConfig } from '../lib/funcConfig.js';
import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js';
import { pendingSessions } from './reply-trigger.js';
import { AUDIOS_CATALOG } from './audios-globales.js';
import { getCustomAudios } from '../lib/funcion/audiosStore.js';

const SESSION_TIMEOUT = 60_000;

function buildCatalog() {
  const defaults = AUDIOS_CATALOG.map(e => ({ id: e.id, label: e.keywords[0], custom: false }));
  const customs = Object.entries(getCustomAudios()).map(([trigger, data]) => ({
    id: trigger,
    label: data.original || trigger,
    custom: true
  }));
  return [...defaults, ...customs];
}

function buildMenu(audiosConfig, catalog) {
  const BOT = () => global.BotName || 'Luna';
  const allOn = catalog.every(c => audiosConfig[c.id] !== false);

  let menu = `🔊 *${BOT()} — Audios Config*\n\n`;
  menu += `_Elige qué audios activar o desactivar en este grupo._\n\n`;

  catalog.forEach((c, i) => {
    const estado = audiosConfig[c.id] !== false ? '✅' : '❌';
    const tag = c.custom ? ' 🆕' : '';
    menu += `> *${i + 1}.* ${c.label}${tag} → ${estado}\n`;
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

  const config = getConfig(m.chat) || {};
  const audiosEnabled = config.audios !== undefined ? config.audios : true;

  if (!audiosEnabled) {
    await conn.sendMessage(m.chat, {
      text: `⚠️ Los audios no están activados en este grupo.\nActívalos primero con el comando correspondiente.`
    }, { quoted: m });
    return;
  }

  const audiosConfig = config.audiosConfig || {};
  const catalog = buildCatalog();

  if (catalog.length === 0) {
    await conn.sendMessage(m.chat, { text: '⚠️ No hay audios para configurar todavía.' }, { quoted: m });
    return;
  }

  if (pendingSessions.has(m.chat)) {
    clearTimeout(pendingSessions.get(m.chat).timer);
  }

  const timer = setTimeout(() => {
    pendingSessions.delete(m.chat);
  }, SESSION_TIMEOUT);

  pendingSessions.set(m.chat, { adminId: m.sender, timer, type: 'audiosConfig' });

  await conn.sendMessage(m.chat, {
    text: buildMenu(audiosConfig, catalog)
  }, { quoted: m });
};

handler.before = async function (m, { conn }) {
  if (!m.isGroup || !m.text || !pendingSessions.has(m.chat)) return;

  const session = pendingSessions.get(m.chat);
  if (session.type !== 'audiosConfig') return;
  if (m.sender !== session.adminId) return;

  const catalog = buildCatalog();
  const input = m.text.trim();
  const nums = [...new Set(input.split(/\s+/).map(Number).filter(n => !isNaN(n) && n >= 0 && n <= catalog.length))];
  if (nums.length === 0) return;

  clearTimeout(session.timer);
  pendingSessions.delete(m.chat);

  const config = getConfig(m.chat) || {};
  const audiosConfig = config.audiosConfig || {};

  if (nums.includes(0)) {
    const allOn = catalog.every(c => audiosConfig[c.id] !== false);
    catalog.forEach(c => { audiosConfig[c.id] = allOn ? false : true; });
  } else {
    nums.forEach(n => {
      const item = catalog[n - 1];
      if (item) audiosConfig[item.id] = audiosConfig[item.id] === false ? true : false;
    });
  }

  setConfig(m.chat, { audiosConfig });

  let reply = `✅ *Configuración actualizada*\n\n`;

  if (nums.includes(0)) {
    const newState = audiosConfig[catalog[0].id];
    reply += `> ${newState !== false ? '🟢 Todos los audios ACTIVADOS' : '🔴 Todos los audios DESACTIVADOS'}`;
  } else {
    nums.forEach(n => {
      const item = catalog[n - 1];
      if (item) reply += `> ${audiosConfig[item.id] !== false ? '✅' : '❌'} ${item.label}\n`;
    });
  }

  await conn.sendMessage(m.chat, { text: reply }, { quoted: m });
};

handler.command = /^(audioset|audiosconfig|audc)$/i;
handler.group = true;

export default handler;
