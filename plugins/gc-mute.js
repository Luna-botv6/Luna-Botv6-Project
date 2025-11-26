import fs from 'fs';

const handler = async (m, { conn, usedPrefix, participants, isOwner, command }) => {
  const groupMetadata = await conn.groupMetadata(m.chat);
  const groupAdmins = groupMetadata.participants.filter(p => p.admin !== null).map(p => p.id);

  let realUserJid = m.sender;
  if (m.sender.includes('@lid')) {
    const participantData = groupMetadata.participants.find(p => p.lid === m.sender);
    if (participantData && participantData.id) realUserJid = participantData.id;
  }

  const isUserAdmin = groupAdmins.includes(realUserJid);
  if (!isUserAdmin && !isOwner) {
    return m.reply('*[⚠] Solo los administradores pueden usar este comando.*');
  }

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
  } else if (m.text) {
    const cleanText = m.text.replace(/[^0-9]/g, '');
    if (cleanText.length < 11 || cleanText.length > 15) return m.reply('*[⚠] Número inválido*');
    user = cleanText + '@s.whatsapp.net';
  }

  if (!user) {
    const msg = `*Uso:* ${usedPrefix}${command} @tag\n*⚠ ⚡ ${usedPrefix}${command} 573012345678`;
    return m.reply(msg, m.chat, { mentions: conn.parseMention(msg) });
  }

  const isUserInGroup = participants.find(p => p.id === user);
  if (!isUserInGroup) {
    const maybeFromLid = groupMetadata.participants.find(p => p.lid === user);
    if (maybeFromLid) {
      user = maybeFromLid.id;
    }
  }

  const finalCheck = participants.find(p => p.id === user);
  if (!finalCheck) return m.reply('*[⚠] La persona mencionada no está en el grupo.*');

  const normalizedUser = resolveLidToId(user) || user;
  const muteKey = `${m.chat}_${normalizedUser}`;
  const isMuted = global.muted.includes(muteKey);

  try {
    if (command === 'mute' || command === 'silenciar') {
      if (isMuted) return m.reply('*[⚠] Este usuario ya está silenciado*');
      global.muted.push(muteKey);
      await m.reply(`*✓ @${normalizedUser.split('@')[0]} ha sido silenciado*`, null, { mentions: [normalizedUser] });
    } else if (command === 'unmute' || command === 'dessilenciar') {
      if (!isMuted) return m.reply('*[⚠] Este usuario no está silenciado*');
      const index = global.muted.indexOf(muteKey);
      global.muted.splice(index, 1);
      await m.reply(`*✓ @${normalizedUser.split('@')[0]} ha sido dessilenciado*`, null, { mentions: [normalizedUser] });
    }
  } catch (e) {
    console.error('[ERROR MUTE]', e);
    await m.reply('*[⚠] Error al procesar el comando.*');
  }
};

handler.help = ['mute <@user>', 'silenciar <@user>', 'unmute <@user>', 'dessilenciar <@user>'];
handler.tags = ['group'];
handler.command = /^(mute|silenciar|unmute|dessilenciar)$/i;
handler.group = true;
handler.botAdmin = true;

if (!global.muted) global.muted = [];

export default handler;