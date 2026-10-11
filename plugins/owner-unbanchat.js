import fs from 'fs';
import { getConfig, setConfig } from '../lib/funcConfig.js';
import { rolActor, puedeDesbanear } from '../lib/funcion/ban-author.js';

const handler = async (m, { conn, isROwner, isOwner, isSubOwner }) => {
  const idioma = global.db.data.users[m.sender]?.language || global.defaultLenguaje || 'es';
  const todoIdioma = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`));
  const tradutor = todoIdioma.functions.unbanchat;
  const tradSub = todoIdioma.subowner || {};

  const senderTag = `@${m.sender.split('@')[0]}`;

  const rol = rolActor({ isROwner, isOwner, isSubOwner });
  if (!puedeDesbanear(rol, getConfig(m.chat)?.bannedRole)) return m.reply(tradSub.soloOwnerDesbaneaGrupo);

  setConfig(m.chat, { isBanned: false, bannedBy: null, bannedRole: null, bannedAt: 0 });

  await conn.sendMessage(m.chat, {
    text: tradutor.texto1.replace('{tag}', senderTag),
    mentions: [m.sender]
  });
};

handler.help = ['unbanchat'];
handler.tags = ['owner'];
handler.command = /^unbanchat$/i;
handler.subowner = 'ban_grupos';

export default handler;
