import fs from 'fs';
import { getUser, setUser } from '../lib/usersDB.js';

const handler = async (m, { conn, usedPrefix, command }) => {
  // Obtener datos del usuario que envía el mensaje para idioma
  const userSender = getUser(m.sender);
  const idioma = userSender.language || global.defaultLenguaje;

  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.owner_banuser;

  const BANtext = `${tradutor.texto1}\n*${usedPrefix + command} @${global.suittag}*`;

  // Verificar que haya usuario mencionado o citado
  if (!m.mentionedJid?.[0] && !m.quoted) {
    return m.reply(BANtext, m.chat, { mentions: conn.parseMention(BANtext) });
  }

  // Identificar al usuario a banear
  let who;
  if (m.isGroup) {
    who = m.mentionedJid?.[0] ? m.mentionedJid[0] : m.quoted.sender;
  } else {
    who = m.chat;
  }

  // Obtener datos del usuario a banear
  const userToBan = getUser(who);

  // Actualizar propiedad banned a true
  setUser(who, { ...userToBan, banned: true });

  m.reply(tradutor.texto2);
};

handler.command = /^banuser$/i;
handler.rowner = true;
export default handler;
