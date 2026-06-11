import fs from 'fs';
import { isAdminNoTTL, hasAdminCacheForGroup, getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js';

const cooldowns = new Map();
const _langCache = new Map();

function getLang(idioma) {
  if (_langCache.has(idioma)) return _langCache.get(idioma);
  const t = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`)).plugins.gc_tagall;
  _langCache.set(idioma, t);
  return t;
}

const handler = async (m, { conn, args, isOwner }) => {
  const idioma = global.db?.data?.users?.[m.sender]?.language || global.defaultLenguaje;
  const t = getLang(idioma);

  try {
    if (!m.isGroup) return m.reply(t.solo_grupos);

    const chatId = m.chat;

    const isAdmin = hasAdminCacheForGroup(chatId)
      ? isAdminNoTTL(chatId, m.sender)
      : (await getGroupDataForPlugin(conn, chatId, m.sender)).isAdmin;

    if (!isAdmin && !isOwner) return m.reply(t.solo_admins);

    const cooldownTime = 2 * 60 * 1000;
    const now = Date.now();

    if (cooldowns.has(chatId)) {
      const expire = cooldowns.get(chatId) + cooldownTime;
      if (now < expire) {
        const left = expire - now;
        return m.reply(t.cooldown.replace('{min}', Math.floor(left / 60000)).replace('{seg}', Math.floor((left % 60000) / 1000)));
      }
    }
    cooldowns.set(chatId, now);

    const groupName = m.groupMetadata?.subject
      || conn.chats?.[chatId]?.subject
      || conn.chats?.[chatId]?.name
      || (await conn.groupMetadata(chatId).catch(() => ({}))).subject
      || chatId.split('@')[0];

    const senderNum = m.sender.split('@')[0];
    const razon = args.join(' ') || t.sin_razon;

    const text = t.mensaje
      .replace('{group}', groupName)
      .replace('{tag}', `@${senderNum}`)
      .replace('{razon}', razon);

    await conn.sendMessage(chatId, {
      text,
      mentionAll: true,
      mentions: [m.sender]
    });

  } catch {
    await m.reply(t.error);
  }
};

handler.help = ['invocar <razón>'];
handler.tags = ['group'];
handler.command = /^(tagall|invocar|invocacion|todos|invocación)$/i;
handler.group = true;

export default handler;
