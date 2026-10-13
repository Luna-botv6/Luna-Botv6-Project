import { setConfig, getConfig } from '../lib/funcConfig.js';
import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js';
import { setOwnerFunction } from '../lib/owner-funciones.js';
import { resolveMenuMedia } from '../lib/funcion/menu-media.js';
import { getOwnerNumbers } from '../lib/funcion/system-owners.js';
import { resolveJidToPhone } from '../lib/funcion/lid-resolver.js';
import { isSubOwnerJid } from '../lib/funcion/system-owners.js';
import { tienePoder } from '../lib/funcion/subowner-perms.js';
import { validarHorasInactivos } from './admin-inactivos.js';
import { sembrarGrupo, borrarGrupo } from '../lib/funcion/inactivosDB.js';
import fs from 'fs';

import { mapaConfig, setSubowner, puedeEnPrivado } from '../lib/funcion/funciones-catalogo.js';
const SUBOWNER_ENABLE_KEYS = setSubowner();

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

const CONFIG_MAP = mapaConfig();

const handler = async (m, { conn, usedPrefix, command, args, isSubOwner }) => {
  const idioma = global.db.data.users[m.sender]?.language || global.defaultLenguaje;
  const _translate = getTranslate(idioma);
  const t = _translate?.plugins?.config_handler;

  if (!t) return m.reply('❌ Error cargando configuración de idioma.');
  if (!conn?.user?.jid) return m.reply(t.sin_sesion || '❌ Sin sesión activa.');

    const realNum = resolveJidToPhone(m.sender, conn) || m.sender.replace(/[^0-9]/g, '');
    const ownerNumbers = getOwnerNumbers();
    const isROwner = ownerNumbers.includes(realNum);
    const esSubBot = !!conn?.isSubBot;
    const isOwner = isROwner || (!esSubBot && m.sender === conn?.user?.jid);
  const esSubOwner = typeof isSubOwner === 'boolean' ? isSubOwner : isSubOwnerJid(m.sender, conn);
  const isAdmin = m.isGroup ? (await getGroupDataForPlugin(conn, m.chat, m.sender)).isAdmin : false;

  const isEnable = /true|enable|(turn)?on|1/i.test(command);
  const type = (args[0] || '').toLowerCase();

  if (!CONFIG_MAP[type]) {
    if (!/[01]/.test(command)) {
      const idioma2 = global.db.data.users[m.sender]?.language || global.defaultLenguaje || 'es';

      const getMenuMedia = () => resolveMenuMedia(conn, idioma2, 'imagen');

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
          desc: 'Respuestas con audio en el grupo y quién puede agregar nuevos\n_Reproducir: admin · Agregar: owner_',
          keys: ['audios', 'audios_bot', 'agaudios']
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
          keys: ['detect', 'detect2', 'autosticker', 'afk', 'antitag', 'inactivos']
        },
        {
          emoji: '🧠',
          title: 'IA y Juegos',
          desc: 'IA, juegos, RPG y menciones masivas por chat\n_Se configuran por chat sin afectar otros_',
          keys: ['ia', 'juegos', 'rpg', 'antimencion']
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

  const subComoOwner = esSubOwner && !isOwner && !isROwner && SUBOWNER_ENABLE_KEYS.has(type);
  if (esSubOwner && !isOwner && !isROwner && !SUBOWNER_ENABLE_KEYS.has(type)) return m.reply(t.solo_owner);
  if (subComoOwner && !tienePoder(type === 'agaudios' ? 'enable_agaudios' : 'enable_grupo')) return m.reply(t.solo_owner);

  const enPrivado = !m.isGroup;
  const privadoOk = puedeEnPrivado(type);
  if (config.group && enPrivado && !privadoOk) return m.reply(t.solo_grupos);
    if (esSubBot && !isROwner) {
      return m.reply(t.solo_rowner_subbot || '🔒 Solo el owner real del bot principal puede cambiar esto. Un SubBot no puede tocar la configuración global.');
    }

    if (!(enPrivado && privadoOk)) {
    if (config.admin && !isAdmin && !isOwner && !subComoOwner) return m.reply(t.solo_admins);
    if (config.owner && !isOwner && !isROwner && !subComoOwner) return m.reply(t.solo_owner);
    }

  let inactivosHoras = null;
  if (type === 'inactivos') {
    const tInac = _translate?.plugins?.admin_inactivos || {};
    if (args[1]) {
      inactivosHoras = validarHorasInactivos(args[1]);
      if (!inactivosHoras) return m.reply(tInac.horas_invalidas || '⚠️ Horas inválidas. Usá 24, 48, 72, 96, 120, 144 o 168.');
    } else {
      inactivosHoras = validarHorasInactivos(getConfig(m.chat)?.inactivosHoras) || 24;
    }
  }

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
    if (type === 'inactivos') {
      if (isEnable) {
        chat.inactivosHoras = inactivosHoras || 24;
        chat.inactivosPor = m.sender;
      } else {
        chat.inactivosHoras = 24;
        chat.inactivosPor = '';
      }
    }
    await safeSetConfig(m.chat, chat);
    if (type === 'inactivos') {
      if (isEnable) {
        try {
          const gd = await getGroupDataForPlugin(conn, m.chat, m.sender);
          const jids = (gd?.participants || []).flatMap((p) => [p.id, p.lid, p.phoneNumber]).filter(Boolean);
          sembrarGrupo(m.chat, jids);
        } catch {}
      } else {
        try { borrarGrupo(m.chat); } catch {}
      }
    }
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