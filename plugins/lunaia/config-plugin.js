import configFunciones from '../config-funciones.js';
import { getGroupDataForPlugin } from '../../lib/funcion/pluginHelper.js';
import { isProtectedOwner } from '../../lib/funcion/ownerGuard.js';

const BOT = () => global.BotName || 'Luna';

const CONFIG_OPTIONS = {
  welcome: ['bienvenida', 'welcome'],
  detect: ['detect', 'detectar'],
  detect2: ['detect2', 'detectar2'],
  antilink: ['antilink', 'antienlace'],
  antilink2: ['antilink2', 'antienlace2'],
  modoadmin: ['modoadmin', 'modo admin', 'solo admin', 'soloadmin'],
  autosticker: ['autosticker', 'autostickers'],
  audios: ['audios'],
  antidelete: ['antidelete', 'antieliminar'],
  antitoxic: ['antitoxic', 'antitoxico'],
  afk: ['afk'],
  restrict: ['restrict', 'restringir'],
  autoread: ['autoread', 'autoleer'],
  anticall: ['anticall', 'antillamada'],
  audios_bot: ['audios_bot', 'audiosbot'],
  antispam: ['antispam'],
  antiprivado: ['antiprivado', 'antiprivate'],
  modopublico: ['modopublico', 'modo publico'],
  modogrupos: ['modogrupos', 'modo grupos']
};

// Los verbos activar/desactivar son extremadamente comunes en charla que no
// tiene nada que ver con la config del bot ("prende la luz", "apaga la
// tele"). Cuando vienen ACOMPAÑADOS de una opción reconocida (parseCommands)
// no hay ambigüedad y se procesan sin límite. Cuando vienen SOLOS (sin
// ninguna opción, solo para mostrar el menú de config) se exige un mensaje
// corto para reducir falsos positivos.
const ENABLE_SOLO = /\b(activa|activar|enable|habilitar|encender|enciende|prende|prender)\b/;
const DISABLE_SOLO = /\b(desactiva|desactivar|disable|deshabilitar|apaga|apagar|desactivalo)\b/;
const MAX_WORDS_FOR_BARE_VERB = 4;

function normalize(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[?!]/g, '')
    .trim();
}

function parseCommands(text) {
  const normalized = normalize(text);
  const results = [];

  const enableMatch = /\b(activa|activar|enable|habilitar|encender|enciende|prende|prender|pon|pone|quiero|activalo)\b/;
  const disableMatch = /\b(desactiva|desactivar|disable|deshabilitar|apaga|apagar|saca|desactivalo)\b/;

  let enable = null;
  if (enableMatch.test(normalized)) enable = true;
  if (disableMatch.test(normalized)) enable = false;
  if (enable === null) return results;

  for (const [option, keywords] of Object.entries(CONFIG_OPTIONS)) {
    if (keywords.some(k => normalized.includes(k))) results.push({ option, enable });
  }
  return results;
}

function buildMenuGrupo() {
  return `🌙 *${BOT()}*

*====[ Funciones de grupo ]====*
🎉 *welcome* - bienvenida
🔗 *antilink* - anti enlaces
🔗 *antilink2* - variante antilink
👑 *modoadmin* - solo admins usan el bot
🏷️ *autosticker* - sticker automatico
🎵 *audios* - mensajes de voz
🗑️ *antidelete* - anti eliminar
☢️ *antitoxic* - anti toxico
⏰ *afk* - modo ausente
🔍 *detect / detect2* - deteccion

*====[ Solo owner ]====*
🔐 *restrict* - modo restringido
📖 *autoread* - leer mensajes
📞 *anticall* - anti llamadas
🎯 *antispam* - anti spam
🚫 *antiprivado* - anti privado
🌐 *modopublico* - modo publico
📋 *modogrupos* - modo grupos

_Ejemplo: @${BOT()} activa el modoadmin_`;
}

function canHandle(text) {
  const normalized = normalize(text);
  if (parseCommands(text).length > 0) return true;

  const isBareVerb = ENABLE_SOLO.test(normalized) || DISABLE_SOLO.test(normalized);
  if (!isBareVerb) return false;

  const wordCount = normalized.split(/\s+/).filter(Boolean).length;
  return wordCount <= MAX_WORDS_FOR_BARE_VERB;
}

async function handle(text, { conn, msg, jid }) {
  const senderId = msg.key.participant || msg.key.remoteJid;
  const commands = parseCommands(text);
  const normalized = normalize(text);

  if (!commands.length) {
    if (ENABLE_SOLO.test(normalized) || DISABLE_SOLO.test(normalized)) {
      await conn.sendMessage(jid, { text: buildMenuGrupo(), mentions: [senderId] }, { quoted: msg });
    }
    return;
  }

  const { isAdmin, isOwner } = await getGroupDataForPlugin(conn, jid, senderId);

  const isRealOwner = isProtectedOwner(senderId, null, conn);

  const fakeMsg = {
    ...msg,
    chat: jid,
    sender: senderId,
    isGroup: jid.endsWith('@g.us'),
    key: msg.key,
    reply: (body) => conn.sendMessage(jid, { text: body }, { quoted: msg })
  };

  for (const { option, enable } of commands) {
    try {
      await configFunciones(fakeMsg, {
        conn,
        args: [option],
        command: enable ? 'enable' : 'disable',
        usedPrefix: '/',
        isOwner: isRealOwner || isOwner,
        isAdmin,
        isROwner: isRealOwner
      });
    } catch (err) {
      if (err !== false) console.error('[config-plugin]', option, err?.message || err);
    }
  }
}

export default {
  canHandle,
  handle,
  name: 'config',
  description: 'Configurar opciones desde la IA'
};