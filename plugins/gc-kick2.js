import fs from 'fs';

const handler = async (m, {isOwner, isAdmin, conn, text, participants, args, command, usedPrefix}) => {
  const datas = global;
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.gc_kick2;

  // Verificar si el comando usedPrefix es válido
  if (usedPrefix == 'a' || usedPrefix == 'A') return;
  
  // Verificar si el usuario es admin o owner
  if (!(isAdmin || isOwner)) {
    global.dfail('admin', m, conn);
    throw false;
  }

  // Verificar si restrict está habilitado
  if (!global.db.data.settings[conn.user.jid]?.restrict) {
    throw `${tradutor.texto1[0]} (𝚎𝚗𝚊𝚋𝚕𝚎 𝚛𝚎𝚜𝚝𝚛𝚒𝚌𝚝 / 𝚍𝚒𝚜𝚊𝚋𝚕𝚎 𝚛𝚎𝚜𝚝𝚛𝚒𝚌𝚝) ${tradutor.texto1[1]}`;
  }

  const kicktext = `${tradutor.texto2}\n*${usedPrefix + command} @${global.suittag}*`;
  
  // Si no hay etiqueta, mensaje citado o texto, mostrar ayuda
  if (!m.mentionedJid?.[0] && !m.quoted && !text) {
    return m.reply(kicktext, m.chat, { mentions: conn.parseMention(kicktext) });
  }

  let userToRemove;
  
  // Prioridad 1: Si hay una mención directa
  if (m.mentionedJid && m.mentionedJid[0]) {
    userToRemove = m.mentionedJid[0];
  }
  // Prioridad 2: Si es respuesta a un mensaje
  else if (m.quoted && m.quoted.sender) {
    userToRemove = m.quoted.sender;
  }
  // Prioridad 3: Si es solo texto (número)
  else if (text) {
    // Limpiar el texto de caracteres especiales
    const cleanText = text.replace(/[^0-9]/g, '');
    
    if (cleanText.length < 11 || cleanText.length > 15) {
      return m.reply('*[❗] El número ingresado es incorrecto, por favor ingrese el número correcto.*');
    }
    
    userToRemove = cleanText + '@s.whatsapp.net';
  }

  if (!userToRemove) {
    return m.reply(kicktext, m.chat, { mentions: conn.parseMention(kicktext) });
  }

  // Evitar que el bot se expulse a sí mismo
  if (userToRemove === conn.user.jid) {
    return m.reply('*🤖 No puedo expulsarme a mí mismo.*');
  }

  // Verificar si el usuario está en el grupo
  const isUserInGroup = participants.find((p) => p.id === userToRemove);
  if (!isUserInGroup) {
    return m.reply('*[❗] La persona que mencionaste no está en el grupo.*');
  }

  // Intentar expulsar
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
handler.command = /^(kick2|echar2|hechar2|sacar2)$/i;
handler.admin = true;
handler.group = true;

export default handler;