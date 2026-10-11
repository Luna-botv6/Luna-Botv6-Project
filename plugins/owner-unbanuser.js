import fs from 'fs';
import { rolActor, puedeDesbanear } from '../lib/funcion/ban-author.js';

const handler = async (m, { conn, text, isROwner, isOwner, isSubOwner }) => {
  const idioma = global.db.data.users[m.sender]?.language || global.defaultLenguaje || 'es';
  const todoIdioma = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`));
  const tradutor = todoIdioma.plugins.owner_unbanuser;
  const tradSub = todoIdioma.subowner || {};

  if (!text) throw tradutor.texto1;
  let who;
  if (m.isGroup) who = m.mentionedJid[0];
  else who = m.chat;
  if (!who) throw tradutor.texto2;
  const users = global.db.data.users;
  const rol = rolActor({ isROwner, isOwner, isSubOwner });
  if (!puedeDesbanear(rol, users[who]?.bannedRole)) return m.reply(tradSub.soloOwnerDesbanea);
  if (!users[who]) users[who] = {};
  users[who].banned = false;
  delete users[who].bannedBy;
  delete users[who].bannedRole;
  delete users[who].bannedAt;
  conn.reply(m.chat, tradutor.texto3, m);
};

handler.help = ['unbanuser'];
handler.tags = ['owner'];
handler.command = /^unbanuser$/i;
handler.subowner = 'ban_usuarios';
export default handler;
