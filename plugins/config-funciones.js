import { setConfig, getConfig } from '../lib/funcConfig.js';
import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js';
import { setOwnerFunction } from '../lib/owner-funciones.js';
import fs from 'fs';

const configLocks = new Map();
const _translateCache = new Map();

function getTranslate(idioma) {
  const lang = idioma || global.defaultLenguaje || 'es';
  if (_translateCache.has(lang)) return _translateCache.get(lang);
  try {
    const parsed = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${lang}.json`, 'utf8'));
    _translateCache.set(lang, parsed);
    return parsed;
  } catch {
    if (lang !== 'es') {
      try {
        if (!_translateCache.has('es')) {
          const fallback = JSON.parse(fs.readFileSync('./src/lunaidiomas/es.json', 'utf8'));
          _translateCache.set('es', fallback);
        }
        return _translateCache.get('es') || {};
      } catch {}
    }
    return {};
  }
}

async function safeSetConfig(chatId, config) {
  if (configLocks.has(chatId)) await configLocks.get(chatId);
  const promise = setConfig(chatId, config);
  configLocks.set(chatId, promise);
  try { await promise; }
  finally { configLocks.delete(chatId); }
}

const CONFIG_MAP = {
  welcome:      { key: 'welcome',      group: true, admin: true },
  bye:          { key: 'bye',          group: true, admin: true },
  detect:       { key: 'detect',       group: true, admin: true },
  detect2:      { key: 'detect2',      group: true, admin: true },
  antidelete:   { key: 'antidelete',   group: true, admin: true },
  antilink:     { key: 'antiLink',     group: true, admin: true },
  antilink2:    { key: 'antiLink2',    group: true, admin: true },
  modoadmin:    { key: 'modoadmin',    group: true, admin: true },
  autosticker:  { key: 'autosticker',  group: true, admin: true },
  audios:       { key: 'audios',       group: true, admin: true },
  antitoxic:    { key: 'antiToxic',    group: true, admin: true },
  antiviewonce: { key: 'antiviewonce', group: true, admin: true },
  anti18:       { key: 'anti18',       group: true, admin: true },
  afk:          { key: 'afkAllowed',   group: true, admin: true },
  restrict:     { key: 'restrict',     bot: true,   owner: true },
  audios_bot:   { key: 'audios_bot',   bot: true,   owner: true },
  autoread:     { key: 'autoread2',    bot: true,   owner: true },
  anticall:     { key: 'antiCall',     bot: true,   owner: true },
  antispam:     { key: 'antispam',     bot: true,   owner: true },
  antiprivado:  { key: 'antiprivado',  file: true,  owner: true },
  modopublico:  { key: 'modopublico',  file: true,  owner: true },
  vierwimage:   { key: 'vierwimage',   file: true,  owner: true },
  modogrupos:   { key: 'modogrupos',   file: true,  owner: true }
};

async function getOwnerNumbers(conn) {
  const nums = [];
  const clean = (n) => n.toString().replace(/[^0-9]/g, '');
  if (global.owner?.length) {
    for (const o of global.owner) {
      const n = clean(Array.isArray(o) ? o[0] : o);
      if (n && !nums.includes(n)) nums.push(n);
    }
  }
  if (global.lidOwners?.length) {
    for (const o of global.lidOwners) {
      const n = clean(o);
      if (n && !nums.includes(n)) nums.push(n);
    }
  }
  return nums;
}

const handler = async (m, { conn, usedPrefix, command, args }) => {
  const idioma = global.db.data.users[m.sender]?.language || global.defaultLenguaje;
  const _translate = getTranslate(idioma);
  const t = _translate?.plugins?.config_handler;

  if (!t) return m.reply('❌ Error cargando configuración de idioma.');
  if (!conn?.user?.jid) return m.reply(t.sin_sesion || '❌ Sin sesión activa.');

  const realNum = m.sender.replace(/[^0-9]/g, '');
  const ownerNumbers = await getOwnerNumbers(conn);
  const isROwner = ownerNumbers.includes(realNum);
  const isOwner = isROwner || m.sender === conn?.user?.jid;
  const isAdmin = m.isGroup ? (await getGroupDataForPlugin(conn, m.chat, m.sender)).isAdmin : false;

  const isEnable = /true|enable|(turn)?on|1/i.test(command);
  const type = (args[0] || '').toLowerCase();

  if (!CONFIG_MAP[type]) {
    if (!/[01]/.test(command)) {
      const { access: fsAccess } = await import('fs/promises');

      const MENU_DIR = './database/WELCOME';
      const CUSTOM_IMG = `${MENU_DIR}/menu_image.jpg`;
      const CUSTOM_VID = `${MENU_DIR}/menu_video.mp4`;
      const idioma2 = global.db.data.users[m.sender]?.language || global.defaultLenguaje || 'es';

      async function fileExists(p) {
        try { await fsAccess(p); return true; } catch { return false; }
      }

      async function getMenuMedia() {
        if (await fileExists(CUSTOM_IMG)) return { path: CUSTOM_IMG, type: 'image' };
        if (await fileExists(CUSTOM_VID)) return { path: CUSTOM_VID, type: 'video' };
        const lang_path = `./src/assets/images/menu/languages/${idioma2}/VID-20250527-WA0006.mp4`;
        const path = await fileExists(lang_path) ? lang_path : './src/assets/images/menu/languages/es/VID-20250527-WA0006.mp4';
        return { path, type: 'video' };
      }

      const BOT_NAME = global.BotName || '✨ Luna';

      const CATEGORIES = [
        {
          emoji: '👋',
          title: 'Bienvenida',
          desc: 'Activa el mensaje de bienvenida y despedida en el grupo\n_Requiere ser admin_',
          keys: ['welcome', 'bye']
        },
        {
          emoji: '🛡️',
          title: 'Modo Admin',
          desc: 'Solo los admins pueden escribir en el grupo\n_Requiere ser admin_',
          keys: ['modoadmin']
        },
        {
          emoji: '🔇',
          title: 'Audios',
          desc: 'Controla los audios en el grupo y a nivel global del bot\n_Grupo: admin · Global: owner_',
          keys: ['audios', 'audios_bot']
        },
        {
          emoji: '🔒',
          title: 'Modo Restringido',
          desc: 'Solo usuarios registrados pueden usar el bot\n_Solo owner_',
          keys: ['restrict']
        },
        {
          emoji: '🚫',
          title: 'Anti Spam & Llamadas',
          desc: 'Bloquea spam y llamadas entrantes al bot\n_Solo owner_',
          keys: ['antispam', 'anticall']
        },
        {
          emoji: '🔗',
          title: 'Anti Link',
          desc: 'Elimina links de WhatsApp y externos en el grupo\n_Requiere ser admin_',
          keys: ['antilink', 'antilink2']
        },
        {
          emoji: '🗑️',
          title: 'Anti Delete & Toxic',
          desc: 'Reenvía mensajes eliminados y filtra mensajes tóxicos\n_Requiere ser admin_',
          keys: ['antidelete', 'antitoxic']
        },
        {
          emoji: '👁️',
          title: 'Anti View Once',
          desc: 'Revela automáticamente imágenes y videos de una sola vista\n_Requiere ser admin_',
          keys: ['antiviewonce']
        },
        {
          emoji: '🔞',
          title: 'Anti +18',
          desc: 'Detecta y elimina imágenes/stickers con contenido para adultos\n_Requiere ser admin_',
          keys: ['anti18']
        },
        {
          emoji: '🔍',
          title: 'Detección',
          desc: 'Detecta y modera contenido en el grupo\n_Requiere ser admin_',
          keys: ['detect', 'detect2', 'autosticker', 'afk']
        },
        {
          emoji: '🌐',
          title: 'Modo Privado & Grupos',
          desc: 'Controla acceso privado y gestión de grupos\n_Solo owner_',
          keys: ['antiprivado', 'modopublico', 'modogrupos', 'vierwimage']
        }
      ];

      const TOP_N = 4;
      const media = await getMenuMedia();

      const formatCategory = (cat) =>
        `${cat.emoji} *${cat.title}*\n` +
        `${cat.desc}\n` +
        cat.keys.map(k => `  ✦ ${usedPrefix}enable ${k}`).join('\n');

      if (type === 'todas') {
        const fullList = CATEGORIES.map(formatCategory).join('\n\n');

        const texto =
  `⚙️ *CONFIGURACIÓN DE SISTEMA*\n\n` +
  `🤖 *Bot:* ${BOT_NAME}\n\n` +
  `${fullList}\n\n` +
  '⚡\n' +
  `_${usedPrefix}enable <función> · ${usedPrefix}disable <función>_`;


        await conn.sendMessage(m.chat, {
          [media.type]: { url: media.path },
          caption: texto
        }, { quoted: m });
        return;
      }

      const topList = CATEGORIES.slice(0, TOP_N).map(formatCategory).join('\n\n');

     const texto =
  `⚙️ *CONFIGURACIÓN DE SISTEMA*\n\n` +
  `🤖 *Bot:* ${BOT_NAME}\n\n` +
  `${topList}\n\n` +
  '⚡\n' +
  `_${usedPrefix}enable <función> · ${usedPrefix}disable <función>_`;


      await conn.sendButton(
        m.chat,
        texto,
        `⚙️ ${BOT_NAME} • Config`,
        media.path,
        [['📋 Ver todas las funciones', `${usedPrefix}enable todas`]],
        null,
        null,
        m,
        {}
      );
    }
    return;
  }

  const config = CONFIG_MAP[type];

  if (config.group && !m.isGroup) return m.reply(t.solo_grupos);
  if (config.admin && !isAdmin && !isOwner) return m.reply(t.solo_admins);
  if (config.owner && !isOwner && !isROwner) return m.reply(t.solo_owner);

  if (config.file) {
    const saved = setOwnerFunction(type, isEnable);
    if (!saved) return m.reply(t.error_config);
  } else if (config.bot) {
    if (!global.db.data.settings) global.db.data.settings = {};
    if (!global.db.data.settings[conn.user.jid]) global.db.data.settings[conn.user.jid] = {};
    global.db.data.settings[conn.user.jid][config.key] = isEnable;
  } else {
    const chat = getConfig(m.chat) || {};
    chat[config.key] = isEnable;
    await safeSetConfig(m.chat, chat);
  }

  const scopeText = config.bot || config.file ? t.alcance[0] : t.alcance[1];
  const featureDesc = t.desc_features?.[type] || '';

  const msg =
  `✧ ⚙️ *SISTEMA* • ${global.BotName || 'LUNA'} ✧\n\n` +
    `${isEnable ? '✅' : '❌'} • *${t.resultado[1]}* _${type}_\n` +
    `🔘 • *${t.resultado[2]}* _${isEnable ? t.resultado[3] : t.resultado[4]}_\n` +
    `🌐 • *${t.resultado[5]}* _${scopeText}_\n\n` +
    t.resultado[6] +
    (featureDesc ? `\n\n📌 ${featureDesc}` : '');

  conn.sendMessage(m.chat, { text: msg }, { quoted: m });
};

handler.command = /^((en|dis)able|(tru|fals)e|(turn)?[01])$/i;
export default handler;