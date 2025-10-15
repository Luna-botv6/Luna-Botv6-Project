import fs from 'fs';

const handler = async (m, {isOwner, isAdmin, conn, text, participants, usedPrefix}) => {
  const datas = global;
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.gc_promote;

  if (usedPrefix == 'a' || usedPrefix == 'A') return;

  const groupMetadata = await conn.groupMetadata(m.chat);
  const groupAdmins = groupMetadata.participants.filter(p => p.admin !== null).map(p => p.id);

  let realUserJid = m.sender;
  if (m.sender.includes('@lid')) {
    const participantData = groupMetadata.participants.find(p => p.lid === m.sender);
    if (participantData && participantData.id) realUserJid = participantData.id;
  }

  const senderJid = realUserJid.replace('@s.whatsapp.net', '');
  const isLidOwner = global.lidOwners && global.lidOwners.includes(senderJid);
  const isGlobalOwner = global.owner && global.owner.some(([num]) => num === senderJid);

  if (!(isAdmin || isOwner || isLidOwner || isGlobalOwner)) {
    global.dfail('admin', m, conn);
    throw false;
  }

  if (!text && !m.quoted && (!m.mentionedJid || m.mentionedJid.length === 0)) {
    return conn.reply(m.chat, `${tradutor.texto1[0]}\n\n*┯┷*\n*┠≽ ${usedPrefix}daradmin @tag*\n*┠≽ ${usedPrefix}darpoder ${tradutor.texto1[1]}\n*┷┯*`, m);
  }

  try {
    let user;

    if (m.mentionedJid && m.mentionedJid.length > 0) user = m.mentionedJid[0];
    else if (m.quoted && m.quoted.sender) user = m.quoted.sender;
    else if (text) {
      const cleanText = text.replace(/[^0-9]/g, '');
      if (cleanText.length < 11 || cleanText.length > 15) return conn.reply(m.chat, tradutor.texto2, m);
      user = cleanText + '@s.whatsapp.net';
    }

    if (!user) return conn.reply(m.chat, `${tradutor.texto1[0]}\n\n*┯┷*\n*┠≽ ${usedPrefix}daradmin @tag*\n*┠≽ ${usedPrefix}darpoder ${tradutor.texto1[1]}\n*┷┯*`, m);

    const participantData = groupMetadata.participants.find(p => p.id === user || p.lid === user);
    if (!participantData) return conn.reply(m.chat, '*[❗] La persona que mencionaste no está en el grupo.*', m);

    const realUser = participantData.id;
    await conn.groupParticipantsUpdate(m.chat, [realUser], 'promote');
    conn.reply(m.chat, `✅ @${realUser.split('@')[0]} ha sido promovido a administrador.`, m, { mentions: [realUser] });

  } catch (e) {
    console.error(e);
    conn.reply(m.chat, '*[❗] No se pudo promover al usuario. Verifica que sea administrador y que el usuario sea un miembro del grupo.*', m);
  }
};

handler.help = ['promote <@user>', 'daradmin <@user>', 'darpoder <@user>'];
handler.tags = ['group'];
handler.command = /^(promote|daradmin|darpoder)$/i;
handler.admin = true;
handler.group = true;

export default handler;

