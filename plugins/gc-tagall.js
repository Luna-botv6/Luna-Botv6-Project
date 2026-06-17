import fs from 'fs';
import { isAdminNoTTL, hasAdminCacheForGroup, getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js';
import { getTagallMode, setTagallMode, resetTagallMode } from '../lib/funcion/tagallStore.js';

const cooldowns = new Map();
const _langCache = new Map();
const BOT = () => global.BotName || 'Luna';

function getLang(idioma) {
  if (_langCache.has(idioma)) return _langCache.get(idioma);
  const t = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`)).plugins.gc_tagall;
  _langCache.set(idioma, t);
  return t;
}

const handler = async (m, { conn, args, isOwner, usedPrefix, command }) => {
  const idioma = global.db?.data?.users?.[m.sender]?.language || global.defaultLenguaje;
  const t = getLang(idioma);

  try {
    if (!m.isGroup) return m.reply(t.solo_grupos);

    const chatId = m.chat;
    const groupData = await getGroupDataForPlugin(conn, chatId, m.sender);
    const participants = groupData?.participants || [];

    const isAdmin = hasAdminCacheForGroup(chatId)
      ? isAdminNoTTL(chatId, m.sender)
      : groupData.isAdmin;

    if (!isAdmin && !isOwner) return m.reply(t.solo_admins);

    if (/^resetinvocar$/i.test(command)) {
      resetTagallMode(chatId);
      return m.reply(t.reset_ok);
    }

    const setArg = args[0];

    if (setArg === '__mention' || setArg === '__default') {
      const modo = setArg === '__mention' ? 'mention' : 'default';
      setTagallMode(chatId, modo);
      return m.reply(modo === 'mention' ? t.modo_mention : t.modo_default);
    }

    const modoGuardado = getTagallMode(chatId);

    if (!modoGuardado) {
      return await conn.sendButton(
        chatId,
        t.seleccionar_modo,
        t.seleccionar_modo_footer,
        null,
        [
          ['✔️ Mención individual (@tags)', `${usedPrefix}invocar __mention`],
          ['✔️ Sistema por defecto (mentionAll)', `${usedPrefix}invocar __default`]
        ],
        null,
        null,
        m
      );
    }

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

    const groupName = groupData?.groupMetadata?.subject
      || conn.chats?.[chatId]?.subject
      || conn.chats?.[chatId]?.name
      || chatId.split('@')[0];

    const realSender = participants.find(p =>
      p.lid && (p.lid === m.sender || p.lid.split('@')[0] === m.sender.split('@')[0])
    )?.id || m.sender;

    const senderNum = realSender.split('@')[0];
    const razon = args.join(' ') || t.sin_razon;

    if (modoGuardado === 'mention') {
      const jids = participants.map(p => p.id).filter(Boolean);
      const tagLines = jids.map(j => `┃>@${j.split('@')[0]}`).join('\n');
      const texto = t.mensaje_mention
        .replace(/\{bot\}/g, BOT())
        .replace('{group}', groupName)
        .replace('{tag}', `@${senderNum}`)
        .replace('{razon}', razon)
        .replace('{tags}', tagLines);
      await conn.sendMessage(chatId, {
        text: texto,
        mentions: [realSender, ...jids]
      });
    } else {
      const texto = t.mensaje
        .replace(/\{bot\}/g, BOT())
        .replace('{group}', groupName)
        .replace('{tag}', `@${senderNum}`)
        .replace('{razon}', razon);
      await conn.sendMessage(chatId, {
        text: texto,
        mentionAll: true,
        mentions: [realSender]
      });
    }

  } catch {
    await m.reply(t.error);
  }
};

handler.help = ['invocar <razón>'];
handler.tags = ['group'];
handler.command = /^(tagall|invocar|invocacion|todos|invocación|resetinvocar)$/i;
handler.group = true;

export default handler;
