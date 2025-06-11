import fs from 'fs';

const handler = async (m, { conn, participants, usedPrefix, command }) => {
  const idioma = global.db.data.users[m.sender]?.language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`, 'utf8'));
  const tradutor = _translate.plugins.gc_kick2;

  if (!global.db.data.settings[conn.user.jid]?.restrict) {
    throw `${tradutor.texto1[0]} (𝚎𝚗𝚊𝚋𝚕𝚎 𝚛𝚎𝚜𝚝𝚛𝚒𝚌𝚝 / 𝚍𝚒𝚜𝚊𝚋𝚕𝚎 𝚛𝚎𝚜𝚝𝚛𝚒𝚌𝚝) ${tradutor.texto1[1]}`;
  }

  const kicktext = `${tradutor.texto2}\n*${usedPrefix + command} @${global.suittag}*`;
  if (!m.mentionedJid?.[0] && !m.quoted) {
    return m.reply(kicktext, m.chat, { mentions: conn.parseMention(kicktext) });
  }

  const userToRemove = m.mentionedJid?.[0] ? m.mentionedJid[0] : m.quoted.sender;

  // Evitar que el bot se expulse a sí mismo
  if (userToRemove === conn.user.jid) {
    return m.reply('*🤖 No puedo expulsarme a mí mismo.*');
  }

  // Verificar si el bot es admin
  const groupMetadata = await conn.groupMetadata(m.chat);
  const botParticipant = groupMetadata.participants.find((p) => p.id === conn.user.jid);
  const isBotAdmin = botParticipant?.admin === 'admin' || false;

  if (!isBotAdmin) {
    return m.reply('*[❗] No soy administrador, no puedo expulsar a nadie.*');
  }

  // Verificar si el usuario está en el grupo
  const isUserInGroup = groupMetadata.participants.find((p) => p.id === userToRemove);
  if (!isUserInGroup) {
    return m.reply('*[❗] La persona que mencionaste no está en el grupo.*');
  }

  // Intentar expulsar
  try {
    await conn.groupParticipantsUpdate(m.chat, [userToRemove], 'remove');
    await m.reply(`✅ Se ha expulsado a @${userToRemove.split('@')[0]}.`, null, { mentions: [userToRemove] });
  } catch (err) {
    console.error(err);
    await m.reply('*[❗] No se pudo expulsar al usuario. Puede que sea admin o que WhatsApp no lo permita.*');
  }
};

handler.command = /^(kick2|echar2|hechar2|sacar2)$/i;
handler.admin = true;
handler.group = true;
handler.botAdmin = true;

export default handler;