import fs from 'fs';
import { getAllUsers } from '../lib/usersDB.js';
import { getAllChats } from '../lib/chatsDB.js';

const handler = async (m, { conn, isOwner }) => {
  // Obtener idioma del usuario que ejecuta el comando
  const users = getAllUsers();
  const user = users[m.sender] || {};
  const idioma = user.language || global.defaultLenguaje;

  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.owner_banlist;

  // Filtrar usuarios baneados
  const bannedUsers = Object.entries(users).filter(([, data]) => data.banned);

  // Obtener chats y filtrar baneados
  const chats = getAllChats();
  const bannedChats = Object.entries(chats).filter(([, data]) => data.isBanned);

  // Construir texto
  const caption = `
┌${tradutor.texto1}
├ Total : ${bannedUsers.length} ${bannedUsers.length ? '\n' + bannedUsers.map(([jid]) => `
├ ${isOwner ? '@' + jid.split`@`[0] : jid}`.trim()).join('\n') : '├'}
└────

┌${tradutor.texto2}
├ Total : ${bannedChats.length} ${bannedChats.length ? '\n' + bannedChats.map(([jid]) => `
├ ${isOwner ? '@' + jid.split`@`[0] : jid}`.trim()).join('\n') : '├'}
└────
`.trim();

  m.reply(caption, null, { mentions: conn.parseMention(caption) });
};

handler.command = /^banlist(ned)?|ban(ned)?list|daftarban(ned)?$/i;
handler.rowner = true;
export default handler;
