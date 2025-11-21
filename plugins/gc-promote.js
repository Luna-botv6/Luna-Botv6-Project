import fs from 'fs';

const handler = async (m, { isOwner, conn, text, participants, args, command, usedPrefix }) => {
  if (usedPrefix == 'a' || usedPrefix == 'A') return;

  const groupMetadata = await conn.groupMetadata(m.chat);
  const groupAdmins = groupMetadata.participants.filter(p => p.admin !== null).map(p => p.id);

  let realUserJid = m.sender;
  if (m.sender.includes('@lid')) {
    const participantData = groupMetadata.participants.find(p => p.lid === m.sender);
    if (participantData && participantData.id) realUserJid = participantData.id;
  }

  const isUserAdmin = groupAdmins.includes(realUserJid);
  if (!isUserAdmin && !isOwner) return m.reply('⚠️ Este comando solo puede ser usado por administradores del grupo.');

  const datas = global;
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.gc_promote;

  if (!text && !m.quoted && (!m.mentionedJid || m.mentionedJid.length === 0)) {
    const msg = `${tradutor.texto1[0]}\n\n*┯┷*\n*┠≽ ${usedPrefix}daradmin @tag*\n*┠≽ ${usedPrefix}darpoder ${tradutor.texto1[1]}\n*┷┯*`;
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
      const maybe = resolveLidToId(mention);
      user = maybe || mention;
    } else if (m.quoted && m.quoted.sender) {
      const quotedSender = m.quoted.sender;
      const maybe = resolveLidToId(quotedSender);
      user = maybe || quotedSender;
    } else if (text) {
      const cleanText = text.replace(/[^0-9]/g, '');
      if (cleanText.length < 11 || cleanText.length > 15) return m.reply(tradutor.texto2);
      user = cleanText + '@s.whatsapp.net';
    }

    if (!user) {
      const msg = `${tradutor.texto1[0]}\n\n*┯┷*\n*┠≽ ${usedPrefix}daradmin @tag*\n*┠≽ ${usedPrefix}darpoder ${tradutor.texto1[1]}\n*┷┯*`;
      return m.reply(msg, m.chat, { mentions: conn.parseMention(msg) });
    }

    const isUserInGroup = participants.find(p => p.id === user);
    if (!isUserInGroup) {
      const maybeFromLid = groupMetadata.participants.find(p => p.lid === user);
      if (maybeFromLid) user = maybeFromLid.id;
    }

    const finalCheck = participants.find(p => p.id === user);
    if (!finalCheck) return m.reply('*[❗] La persona mencionada no está en el grupo.*');

    await conn.groupParticipantsUpdate(m.chat, [user], 'promote');
    await m.reply(`✅ @${user.split('@')[0]} ha sido promovido a administrador.`, null, { mentions: [user] });
  } catch (e) {
    console.error(e);
    await m.reply('*[❗] No se pudo promover al usuario. Verifica que yo sea admin y que el usuario sea un miembro del grupo.*');
  }
};

handler.help = ['promote <@user>', 'daradmin <@user>', 'darpoder <@user>'];
handler.tags = ['group'];
handler.command = /^(promote|daradmin|darpoder)$/i;
handler.group = true;

export default handler;
