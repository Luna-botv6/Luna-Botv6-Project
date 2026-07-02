import fs from 'fs';
import { getGroupDataForPlugin, isAdminNoTTL, hasAdminCacheForGroup } from '../lib/funcion/pluginHelper.js';
import { getLidMapping } from '../lib/stats.js';
import { registerDynamicMessage } from '../lib/funcion/dynamicMessageTracker.js';

const cooldowns = new Map();
const _langCache = new Map();

function getLang(idioma) {
  if (_langCache.has(idioma)) return _langCache.get(idioma);
  const t = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`)).plugins.gc_hidetag;
  _langCache.set(idioma, t);
  return t;
}

async function resolveParticipants(conn, chatId) {
  try {
    const meta = await conn.groupMetadata(chatId).catch(() => null);
    return meta?.participants || [];
  } catch {
    return [];
  }
}

function resolveNumFromParticipants(num, participants) {
  const lidJid = `${num}@lid`;
  const phoneJid = `${num}@s.whatsapp.net`;

  const byLid = participants.find(p => p.lid === lidJid || p.id === lidJid);
  if (byLid?.id && !byLid.id.includes('@lid')) return byLid.id;

  const byPhone = participants.find(p => p.id === phoneJid);
  if (byPhone?.id) return byPhone.id;

  const fromMapping = getLidMapping(lidJid);
  if (fromMapping) return fromMapping;

  return null;
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

    const isAdmin = hasAdminCacheForGroup(chatId)
      ? isAdminNoTTL(chatId, m.sender)
      : (await getGroupDataForPlugin(conn, chatId, m.sender)).isAdmin;

    if (!isAdmin && !isOwner && !isLidOwner && !isGlobalOwner) return m.reply(t.solo_admins);

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

    const allMentioned = [
      ...(m.mentionedJid || []),
      ...(quoted.msg?.contextInfo?.mentionedJid || []),
      ...(quoted.mentionedJid || []),
    ];

    const extraMentions = [];
    let participants = null;

    for (const jid of [...new Set(allMentioned)]) {
      if (!jid.includes('@lid')) {
        extraMentions.push(conn.decodeJid(jid));
      } else {
        let real = getLidMapping(jid);
        if (!real) {
          if (!participants) participants = await resolveParticipants(conn, chatId);
          const match = participants.find(p => p.lid === jid || p.id === jid);
          real = match?.id || null;
        }
        if (real) {
          extraMentions.push(real);
          finalText = finalText.replace(new RegExp(`@${jid.split('@')[0]}`, 'g'), `@${real.split('@')[0]}`);
        }
      }
    }

    const mentionPattern = /@(\d+)/g;
    let match;
    const numsInText = [];
    while ((match = mentionPattern.exec(finalText)) !== null) numsInText.push(match[1]);

    if (numsInText.length) {
      if (!participants) participants = await resolveParticipants(conn, chatId);
      for (const num of numsInText) {
        const alreadyResolved = extraMentions.some(j => j.split('@')[0] === num);
        if (alreadyResolved) continue;

        const real = resolveNumFromParticipants(num, participants);
        if (real) {
          extraMentions.push(real);
          finalText = finalText.replace(new RegExp(`@${num}`, 'g'), `@${real.split('@')[0]}`);
        }
      }
    }

    const msgOptions = { mentionAll: true };
    if (extraMentions.length) msgOptions.mentions = [...new Set(extraMentions)];

    let sentMsg;
    if (isMedia && quoted.mtype === 'imageMessage') {
      const media = await quoted.download();
      sentMsg = await conn.sendMessage(chatId, { image: media, caption: finalText, ...msgOptions }, { quoted: m });
    } else if (isMedia && quoted.mtype === 'videoMessage') {
      const media = await quoted.download();
      sentMsg = await conn.sendMessage(chatId, { video: media, caption: finalText, ...msgOptions }, { quoted: m });
    } else if (isMedia && quoted.mtype === 'audioMessage') {
      const media = await quoted.download();
      sentMsg = await conn.sendMessage(chatId, { audio: media, mimetype: 'audio/mpeg', ...msgOptions }, { quoted: m });
    } else if (isMedia && quoted.mtype === 'stickerMessage') {
      const media = await quoted.download();
      sentMsg = await conn.sendMessage(chatId, { sticker: media, ...msgOptions }, { quoted: m });
    } else {
      sentMsg = await conn.sendMessage(chatId, { text: finalText, ...msgOptions }, { quoted: m });
    }
    registerDynamicMessage(sentMsg?.key?.id);

  } catch (e) {
    await m.reply(t.error);
  }
};

handler.command = /^(hidetag|notificar|notify|n)$/i;
handler.tags = ['group'];
handler.group = true;

export default handler;