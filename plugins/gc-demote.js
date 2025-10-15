import fs from 'fs';

const handler = async (m, {conn, usedPrefix, participants}) => {
  const datas = global;
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.gc_demote;

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
  const isAdmin = groupAdmins.includes(realUserJid);

  if (!(isAdmin || isLidOwner || isGlobalOwner)) {
    return conn.reply(m.chat, '*[❗] Solo los administradores pueden usar este comando.*', m);
  }

  let user;

  if (m.mentionedJid && m.mentionedJid.length > 0) user = m.mentionedJid[0];
  else if (m.quoted && m.quoted.sender) user = m.quoted.sender;
  else if (m.text) {
    const cleanText = m.text.replace(/[^0-9]/g, '');
    if (cleanText.length < 11 || cleanText.length > 15) return conn.reply(m.chat, tradutor.texto2, m);
    user = cleanText + '@s.whatsapp.net';
  }

  if (!user) return conn.reply(m.chat, `${tradutor.texto1[0]} ${usedPrefix}quitaradmin @tag*\n*┠≽ ${usedPrefix}quitaradmin ${tradutor.texto1[1]}`, m);

  const participantData = groupMetadata.participants.find(p => p.id === user || p.lid === user);
  if (!participantData) return conn.reply(m.chat, '*[❗] La persona que mencionaste no está en el grupo.*', m);

  const realUser = participantData.id;

  try {
    await conn.groupParticipantsUpdate(m.chat, [realUser], 'demote');
    conn.reply(m.chat, tradutor.texto3.replace(/@user/g, `@${realUser.split('@')[0]}`), m, { mentions: [realUser] });
  } catch (e) {
    console.error(e);
    conn.reply(m.chat, '*[❗] No se pudo degradar al usuario. Asegúrate de que seas administrador y que el usuario sea un miembro del grupo.*', m);
  }
};

handler.help = ['demote <@user>', 'quitarpoder <@user>', 'quitaradmin <@user>'];
handler.tags = ['group'];
handler.command = /^(demote|quitarpoder|quitaradmin)$/i;
handler.group = true;
handler.admin = true;
handler.botAdmin = true;

export default handler;
