import fs from 'fs';
import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js';

const cooldowns = new Map();

const handler = async (m, { conn, text, isOwner }) => {
  try {
    if (!m.isGroup) return m.reply('❌ Este comando solo funciona en grupos');

    const { participants, isAdmin } = await getGroupDataForPlugin(conn, m.chat, m.sender);

    const senderNum = conn.decodeJid(m.sender).replace('@s.whatsapp.net', '');
    const isLidOwner = global.lidOwners?.includes(senderNum);
    const isGlobalOwner = global.owner?.some(([num]) => num === senderNum);

    if (!isAdmin && !isOwner && !isLidOwner && !isGlobalOwner) {
      return m.reply('Este comando solo puede ser usado por administradores del grupo.');
    }

    const cooldownTime = 2 * 60 * 1000;
    const now = Date.now();

    if (!isOwner && !isLidOwner && !isGlobalOwner) {
      const key = `${m.chat}_${m.sender}`;
      if (cooldowns.has(key)) {
        const expire = cooldowns.get(key) + cooldownTime;
        if (now < expire) {
          const left = expire - now;
          return m.reply(`Debes esperar ${Math.floor(left / 60000)}m ${Math.floor((left % 60000) / 1000)}s`);
        }
      }
      cooldowns.set(key, now);
    }

    const resolveLid = jid => {
      if (!jid?.includes('@lid')) return conn.decodeJid(jid);
      const p = participants.find(x => x.lid === jid);
      return p ? conn.decodeJid(p.id) : null;
    };

    const mentionSet = new Set();
    participants.forEach(p => mentionSet.add(conn.decodeJid(p.id)));

    let finalText = text || 'Hola :D';

    if (m.mentionedJid?.length) {
      for (const lid of m.mentionedJid) {
        const real = resolveLid(lid);
        if (!real) continue;

        mentionSet.add(real);
        const num = real.split('@')[0];
        finalText = finalText.replace(/@\S+/, `@${num}`);
      }
    }

    const mentions = [...mentionSet];

    const quoted = m.quoted || m;
    const mime = (quoted.msg || quoted).mimetype || '';
    const isMedia = /image|video|sticker|audio/.test(mime);

    if (isMedia && quoted.mtype === 'imageMessage') {
      const media = await quoted.download();
      await conn.sendMessage(m.chat, { image: media, caption: finalText, mentions }, { quoted: m });
    } else if (isMedia && quoted.mtype === 'videoMessage') {
      const media = await quoted.download();
      await conn.sendMessage(m.chat, { video: media, caption: finalText, mentions }, { quoted: m });
    } else if (isMedia && quoted.mtype === 'audioMessage') {
      const media = await quoted.download();
      await conn.sendMessage(m.chat, { audio: media, mimetype: 'audio/mpeg', mentions }, { quoted: m });
    } else if (isMedia && quoted.mtype === 'stickerMessage') {
      const media = await quoted.download();
      await conn.sendMessage(m.chat, { sticker: media, mentions }, { quoted: m });
    } else {
      await conn.sendMessage(m.chat, { text: finalText, mentions }, { quoted: m });
    }
  } catch (e) {
    await m.reply('❌ Error al ejecutar el comando.');
  }
};

handler.command = /^(hidetag|notificar|notify|n)$/i;
handler.tags = ['group'];
handler.group = true;

export default handler;