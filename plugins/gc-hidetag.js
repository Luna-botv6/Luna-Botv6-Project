import fs from 'fs';
import { getGroupDataForPlugin, isAdminNoTTL, hasAdminCacheForGroup } from '../lib/funcion/pluginHelper.js';
import { hasGroup, getJids, resolveLidFromCache, setGroupData } from '../lib/funcion/hidetag-cache.js';
import { getLidMapping } from '../lib/stats.js';

const cooldowns = new Map();
const _langCache = new Map();

function getLang(idioma) {
  if (_langCache.has(idioma)) return _langCache.get(idioma);
  const t = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`)).plugins.gc_hidetag;
  _langCache.set(idioma, t);
  return t;
}

const handler = async (m, { conn, text, isOwner }) => {
  const idioma = global.db?.data?.users?.[m.sender]?.language || global.defaultLenguaje;
  const t = getLang(idioma);

  try {
    if (!conn?.user?.jid) return m.reply(t.no_sesion);
    if (!m.isGroup) return m.reply(t.solo_grupos);

    const chatId = m.chat;
    const senderNum = conn.decodeJid(m.sender).replace('@s.whatsapp.net', '');
    const isLidOwner = global.lidOwners?.includes(senderNum);
    const isGlobalOwner = global.owner?.some(([num]) => num === senderNum);

    let jids;

    const cacheCompleto = hasGroup(chatId) && hasAdminCacheForGroup(chatId);

    if (cacheCompleto) {
      const isAdmin = isAdminNoTTL(chatId, m.sender);
      if (!isAdmin && !isOwner && !isLidOwner && !isGlobalOwner) return m.reply(t.solo_admins);
      jids = getJids(chatId);
    } else {
      const data = await getGroupDataForPlugin(conn, chatId, m.sender);
      if (!data.isAdmin && !isOwner && !isLidOwner && !isGlobalOwner) return m.reply(t.solo_admins);
      setGroupData(chatId, data.participants);
      jids = data.participants.map(p => p.id).filter(j => j && !j.includes('@lid'));
    }

    const cooldownTime = 2 * 60 * 1000;
    const now = Date.now();

    if (!isOwner && !isLidOwner && !isGlobalOwner) {
      const key = `${chatId}_${m.sender}`;
      if (cooldowns.has(key)) {
        const expire = cooldowns.get(key) + cooldownTime;
        if (now < expire) {
          const left = expire - now;
          return m.reply(t.cooldown.replace('{min}', Math.floor(left / 60000)).replace('{seg}', Math.floor((left % 60000) / 1000)));
        }
      }
      cooldowns.set(key, now);
    }

    const mentionSet = new Set(jids);

    const quoted = m.quoted || m;
    const mime = (quoted.msg || quoted).mimetype || '';
    const isMedia = /image|video|sticker|audio/.test(mime);

    let finalText = text || '';
    if (!finalText && quoted && quoted !== m) finalText = quoted.text || quoted.caption || quoted.body || '';
    if (!finalText) {
      const bodyRaw = m.body || m.text || '';
      const cmdMatch = bodyRaw.match(/^[.!/]?\w+\s+([\s\S]+)/);
      finalText = cmdMatch ? cmdMatch[1].trim() : '';
    }
    if (!finalText) finalText = t.texto_default;

    const mentionPattern = /@(\d+)/g;
    let match;
    while ((match = mentionPattern.exec(finalText)) !== null) {
      const num = match[1];
      const fromJid = jids.find(j => j.split('@')[0] === num);
      if (fromJid) {
        mentionSet.add(fromJid);
      } else {
        const fromStats = getLidMapping(num + '@lid');
        if (fromStats) {
          mentionSet.add(fromStats);
          finalText = finalText.replace(`@${num}`, `@${fromStats.split('@')[0]}`);
        }
      }
    }

    if (m.mentionedJid?.length) {
      for (const lid of m.mentionedJid) {
        if (!lid.includes('@lid')) {
          mentionSet.add(conn.decodeJid(lid));
        } else {
          const real = resolveLidFromCache(chatId, lid) || getLidMapping(lid);
          if (real) {
            mentionSet.add(real);
            finalText = finalText.replace(`@${lid.split('@')[0]}`, `@${real.split('@')[0]}`);
          }
        }
      }
    }

    const mentions = [...mentionSet];

    if (isMedia && quoted.mtype === 'imageMessage') {
      const media = await quoted.download();
      await conn.sendMessage(chatId, { image: media, caption: finalText, mentions }, { quoted: m });
    } else if (isMedia && quoted.mtype === 'videoMessage') {
      const media = await quoted.download();
      await conn.sendMessage(chatId, { video: media, caption: finalText, mentions }, { quoted: m });
    } else if (isMedia && quoted.mtype === 'audioMessage') {
      const media = await quoted.download();
      await conn.sendMessage(chatId, { audio: media, mimetype: 'audio/mpeg', mentions }, { quoted: m });
    } else if (isMedia && quoted.mtype === 'stickerMessage') {
      const media = await quoted.download();
      await conn.sendMessage(chatId, { sticker: media, mentions }, { quoted: m });
    } else {
      await conn.sendMessage(chatId, { text: finalText, mentions }, { quoted: m });
    }
  } catch {
    await m.reply(t.error);
  }
};

handler.command = /^(hidetag|notificar|notify|n)$/i;
handler.tags = ['group'];
handler.group = true;

export default handler;