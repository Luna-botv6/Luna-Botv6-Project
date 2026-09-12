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

function buildMenu(audiosConfig, catalog, t) {
  const BOT = () => global.BotName || 'Luna';
  const allOn = catalog.every(c => audiosConfig[c.id] !== false);

  let menu = (t.titulo?.replace('{bot}', BOT()) || `🔊 *${BOT()} — Audios Config*`) + `\n\n`;
  menu += (t.descripcion || `_Elige qué audios activar o desactivar en este grupo._`) + `\n\n`;

  catalog.forEach((c, i) => {
    const estado = audiosConfig[c.id] !== false ? '✅' : '❌';
    const tag = c.custom ? ' 🆕' : '';
    menu += t.linea_item?.replace('{num}', i + 1).replace('{label}', c.label).replace('{tag}', tag).replace('{estado}', estado) || `> *${i + 1}.* ${c.label}${tag} → ${estado}\n`;
  });

  menu += (t.toggle_todo?.replace('{texto}', allOn ? (t.desactivar_todo || '🔴 Desactivar TODO') : (t.activar_todo || '🟢 Activar TODO')) || `\n> *0.* ${allOn ? '🔴 Desactivar TODO' : '🟢 Activar TODO'}`) + `\n`;
  menu += (t.responder_numeros || `\n_Responde con el número o varios a la vez:_`) + `\n`;
  menu += (t.ejemplo || `_Ejemplo: \`1 3 5\` o solo \`0\` para todo_`) + `\n`;
  menu += t.tiempo_respuesta || `_⏳ Tienes 60 segundos para responder_`;

  return menu;
}

const handler = async (m, { conn }) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es');
  const t = _tr?.plugins?.audios_config || {};
  if (!m.isGroup) return;

  const groupData = await getGroupDataForPlugin(conn, m.chat, m.sender);
  if (!groupData.isAdmin && !groupData.isRAdmin) return;

  const config = getConfig(m.chat) || {};
  const audiosEnabled = config.audios !== undefined ? config.audios : true;

  if (!audiosEnabled) {
    await conn.sendMessage(m.chat, {
      text: t.audios_off || `⚠️ Los audios no están activados en este grupo.\nActívalos primero con el comando correspondiente.`
    }, { quoted: m });
    return;
  }

  const audiosConfig = config.audiosConfig || {};
  const catalog = buildCatalog();

  if (catalog.length === 0) {
    await conn.sendMessage(m.chat, { text: t.sin_audios || '⚠️ No hay audios para configurar todavía.' }, { quoted: m });
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
    text: buildMenu(audiosConfig, catalog, t)
  }, { quoted: m });
};

handler.before = async function (m, { conn }) {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es');
  const t = _tr?.plugins?.audios_config || {};
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

  let reply = (t.actualizado || `✅ *Configuración actualizada*`) + `\n\n`;

  if (nums.includes(0)) {
    const newState = audiosConfig[catalog[0].id];
    reply += `> ${newState !== false ? (t.todo_activado || '🟢 Todos los audios ACTIVADOS') : (t.todo_desactivado || '🔴 Todos los audios DESACTIVADOS')}`;
  } else {
    nums.forEach(n => {
      const item = catalog[n - 1];
      if (item) reply += t.linea_estado?.replace('{estado}', audiosConfig[item.id] !== false ? '✅' : '❌').replace('{label}', item.label) || `> ${audiosConfig[item.id] !== false ? '✅' : '❌'} ${item.label}\n`;
    });
  }

  await conn.sendMessage(m.chat, { text: reply }, { quoted: m });
};

handler.command = /^(audioset|audiosconfig|audc)$/i;
handler.group = true;

export default handler;
