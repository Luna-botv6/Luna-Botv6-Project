import * as fs from 'fs';
const cooldowns = new Map();

const handler = async (m, {isOwner, conn, text, participants, args, command, usedPrefix}) => {
  const chatId = m.chat;
  const cooldownTime = 2 * 60 * 1000;
  const now = Date.now();
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

  if (cooldowns.has(chatId)) {
    const expirationTime = cooldowns.get(chatId) + cooldownTime;
    if (now < expirationTime) {
      const timeLeft = Math.ceil((expirationTime - now) / 1000);
      const minutes = Math.floor(timeLeft / 60);
      const seconds = timeLeft % 60;
      return m.reply(`⏰ Debes esperar ${minutes}m ${seconds}s antes de usar este comando nuevamente.`);
    }
  }
  cooldowns.set(chatId, now);

  const datas = global;
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.gc_kick2;

  if (!global.db.data.settings[conn.user.jid]?.restrict) {
    throw `${tradutor.texto1[0]} (enable restrict / disable restrict) ${tradutor.texto1[1]}`;
  }

  const kicktext = `${tradutor.texto2}\n*${usedPrefix + command} @${global.suittag}*`;
  if (!m.mentionedJid?.[0] && !m.quoted && !text) return m.reply(kicktext, m.chat, { mentions: conn.parseMention(kicktext) });

  const resolveLidToId = (jidOrLid) => {
    if (!jidOrLid) return null;
    if (!jidOrLid.includes('@lid')) return jidOrLid;
    const pdata = groupMetadata.participants.find(p => p.lid === jidOrLid);
    return pdata ? pdata.id : null;
  };

  let userToRemove = null;

  if (m.mentionedJid && m.mentionedJid[0]) {
    const mention = m.mentionedJid[0];
    const maybe = resolveLidToId(mention);
    userToRemove = maybe || mention;
  } else if (m.quoted && m.quoted.sender) {
    const quotedSender = m.quoted.sender;
    const maybe = resolveLidToId(quotedSender);
    userToRemove = maybe || quotedSender;
  } else if (text) {
    const cleanText = text.replace(/[^0-9]/g, '');
    if (cleanText.length < 11 || cleanText.length > 15) return m.reply('*[❗] El número ingresado es incorrecto, por favor ingrese el número correcto.*');
    userToRemove = cleanText + '@s.whatsapp.net';
  }

  if (!userToRemove) return m.reply(kicktext, m.chat, { mentions: conn.parseMention(kicktext) });
  if (userToRemove === conn.user.jid) return m.reply('*🤖 No puedo expulsarme a mí mismo.*');

  const isUserInGroup = participants.find(p => p.id === userToRemove);
  if (!isUserInGroup) {
    const maybeFromLid = groupMetadata.participants.find(p => p.lid === userToRemove);
    if (maybeFromLid) {
      userToRemove = maybeFromLid.id;
    }
  }

  const finalCheck = participants.find(p => p.id === userToRemove);
  if (!finalCheck) return m.reply('*[❗] La persona mencionada no está en el grupo.*');

  try {
    await conn.groupParticipantsUpdate(m.chat, [userToRemove], 'remove');
    await m.reply(`✅ @${userToRemove.split('@')[0]} ha sido expulsado del grupo.`, null, { mentions: [userToRemove] });
  } catch (err) {
    console.error(err);
    await m.reply('*[❗] No se pudo expulsar al usuario. Puede que sea admin o que WhatsApp no lo permita.*');
  }
};

handler.help = ['kick2 <@user>', 'echar2 <@user>'];
handler.tags = ['group'];
handler.command = /^(kick|echar|hechar|sacar)$/i;
handler.group = true;
export default handler;
