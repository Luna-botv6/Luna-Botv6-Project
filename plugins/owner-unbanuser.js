import fs from 'fs';
import { getUser, setUser } from '../lib/usersDB.js';

const handler = async (m, { conn, text }) => {
  // Aquí asumo que usas un idioma por defecto o que tienes función para obtenerlo
  // Si tienes base de usuarios con idioma, puedes obtenerlo con getUser(m.sender).language
  const userData = getUser(m.sender);
  const idioma = userData.language || 'es'; // Cambia 'es' por tu idioma por defecto
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.owner_unbanuser;

  if (!text) throw tradutor.texto1;

  let who;
  if (m.isGroup) who = m.mentionedJid ? m.mentionedJid[0] : null;
  else who = m.chat;

  if (!who) throw tradutor.texto2;

  // Obtener datos del usuario a desbanear
  const targetUser = getUser(who);
  targetUser.banned = false;
  setUser(who, targetUser);

  conn.reply(m.chat, tradutor.texto3, m);
};

handler.help = ['unbanuser'];
handler.tags = ['owner'];
handler.command = /^unbanuser$/i;
handler.rowner = true;

export default handler;
