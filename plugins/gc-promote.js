import fs from 'fs';
import { getGroupDataForPlugin, clearGroupCache } from '../lib/funcion/pluginHelper.js';

const handler = async (m, { isOwner, conn, text, args, command, usedPrefix }) => {
  if (usedPrefix == 'a' || usedPrefix == 'A') return;

  const datas = global;
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`));
  const tradutor = _translate.plugins.gc_promote;
  const t_handler = _translate.handler.dfail;

  if (!m.isGroup) return m.reply(t_handler.texto5);

  const { groupMetadata, participants, isAdmin, isBotAdmin } = await getGroupDataForPlugin(conn, m.chat, m.sender);

  if (!isAdmin && !isOwner) {
    return m.reply(t_handler.texto7);
  }

  if (!isBotAdmin) {
    return m.reply(t_handler.texto8);
  }

  if (!text && !m.quoted && (!m.mentionedJid || m.mentionedJid.length === 0)) {
    const msg = `${tradutor.texto1[0]}\n\n*┯┷*\n*┃ ≽ ${usedPrefix}${command} @tag*\n*┃ ≽ ${usedPrefix}${command} ${tradutor.texto1[1]}\n*┷┯*`;
    return m.reply(msg, m.chat, { mentions: conn.parseMention(msg) });
  }

  try {
    const resolveLidToId = (jidOrLid) => {
      if (!jidOrLid) return null;
      if (!jidOrLid.includes('@lid')) return jidOrLid;
      const pdata = groupMetadata.participants.find(p => p.lid === jidOrLid);
      return pdata ? pdata.id : null;
    };

    let user = null;

    if (m.mentionedJid && m.mentionedJid[0]) {
      const mention = m.mentionedJid[0];
      user = resolveLidToId(mention) || mention;
    } else if (m.quoted && m.quoted.sender) {
      const quotedSender = m.quoted.sender;
      user = resolveLidToId(quotedSender) || quotedSender;
    } else if (text) {
      const cleanText = text.replace(/[^0-9]/g, '');
      if (cleanText.length < 11 || cleanText.length > 15) return m.reply(tradutor.texto2);
      user = cleanText + '@s.whatsapp.net';
    }

    if (!user) {
      const msg = `${tradutor.texto1[0]}\n\n*┯┷*\n*┃ ≽ ${usedPrefix}${command} @tag*\n*┃ ≽ ${usedPrefix}${command} ${tradutor.texto1[1]}\n*┷┯*`;
      return m.reply(msg, m.chat, { mentions: conn.parseMention(msg) });
    }

    const decodedUser = conn.decodeJid(user);
    const isUserInGroup = participants.find(p => conn.decodeJid(p.id) === decodedUser);
    
    if (!isUserInGroup) {
      return m.reply(tradutor.texto3);
    }

    if (isUserInGroup.admin) {
      return m.reply(tradutor.texto4);
    }

    await conn.groupParticipantsUpdate(m.chat, [user], 'promote');
    
    clearGroupCache(m.chat);
    
    await m.reply(`${tradutor.texto5} @${user.split('@')[0]}`, null, { mentions: [user] });
  } catch (e) {
    console.error(e);
    await m.reply(tradutor.texto6);
  }
};

handler.help = ['promote <@user>', 'daradmin <@user>', 'darpoder <@user>'];
handler.tags = ['group'];
handler.command = /^(promote|daradmin|darpoder)$/i;
handler.group = true;

export default handler;
