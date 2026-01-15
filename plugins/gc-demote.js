import fs from 'fs';
import { getGroupDataForPlugin, clearGroupCache } from '../lib/funcion/pluginHelper.js';

const handler = async (m, { conn, usedPrefix, isOwner, args, command }) => {
  if (!m.isGroup) return m.reply('❌ Este comando solo funciona en grupos');

  const { groupMetadata, participants, isAdmin, isBotAdmin } = await getGroupDataForPlugin(conn, m.chat, m.sender);

  if (!isAdmin && !isOwner) {
    return m.reply('*[❗] Solo los administradores pueden usar este comando.*');
  }

  if (!isBotAdmin) {
    return m.reply('❌ El bot necesita ser administrador para degradar usuarios.');
  }

  const datas = global;
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.gc_demote;

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
  } else if (m.text) {
    const cleanText = m.text.replace(/[^0-9]/g, '');
    if (cleanText.length < 11 || cleanText.length > 15) return m.reply(tradutor.texto2);
    user = cleanText + '@s.whatsapp.net';
  }

  if (!user) {
    const msg = `${tradutor.texto1[0]} ${usedPrefix}quitaradmin @tag*\n*┠≽ ${usedPrefix}quitaradmin ${tradutor.texto1[1]}`;
    return m.reply(msg, m.chat, { mentions: conn.parseMention(msg) });
  }

  const decodedUser = conn.decodeJid(user);
  const isUserInGroup = participants.find(p => conn.decodeJid(p.id) === decodedUser);

  if (!isUserInGroup) {
    return m.reply('*[❗] La persona mencionada no está en el grupo.*');
  }

  if (!isUserInGroup.admin) {
    return m.reply('*[❗] El usuario no es administrador.*');
  }

  try {
    await conn.groupParticipantsUpdate(m.chat, [user], 'demote');
    
    clearGroupCache(m.chat);
    
    await m.reply(tradutor.texto3.replace(/@user/g, `@${user.split('@')[0]}`), null, { mentions: [user] });
  } catch (e) {
    console.error(e);
    await m.reply('*[❗] No se pudo degradar al usuario. Asegúrate de que seas administrador y que el usuario sea un miembro del grupo.*');
  }
};

handler.help = ['demote <@user>', 'quitarpoder <@user>', 'quitaradmin <@user>'];
handler.tags = ['group'];
handler.command = /^(demote|quitarpoder|quitaradmin)$/i;
handler.group = true;

export default handler;