import fs from 'fs';
import { getOwnerNumbers } from '../lib/funcion/system-owners.js';
import { rolActor } from '../lib/funcion/ban-author.js';

const handler = async (m, { conn, participants, usedPrefix, command, args, isOwner, isSubOwner }) => {
  const idioma = global.db.data.users[m.sender]?.language || global.defaultLenguaje || 'es';
  const tradutor = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`)).functions.banuser;

  const BANtext = `${tradutor.texto1}\n*${usedPrefix + command} @${getOwnerNumbers()[0] || ''}*`;

  if (!m.mentionedJid[0] && !m.quoted)
    return m.reply(BANtext, m.chat, { mentions: conn.parseMention(BANtext) });

  let who;
  if (m.isGroup) who = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted.sender;
  else who = m.chat;

  const users = global.db.data.users;
  if (!users[who]) users[who] = {};
  users[who].banned = true;
  users[who].bannedBy = m.sender;
  users[who].bannedRole = rolActor({ isOwner, isSubOwner }) || 'owner';
  users[who].bannedAt = Date.now();

  m.reply(tradutor.texto2);
};

handler.command = /^banuser$/i;
handler.subowner = 'ban_usuarios';
handler.ownerProtect = true;

export default handler;
