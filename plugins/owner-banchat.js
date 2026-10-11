import fs from 'fs';
import { setConfig } from '../lib/funcConfig.js';
import { rolActor } from '../lib/funcion/ban-author.js';

const handler = async (m, { conn, args, isOwner, isSubOwner }) => {
  const idioma = global.db.data.users[m.sender]?.language || global.defaultLenguaje || 'es';
  const tradutor = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`)).functions.banchat;

  const motivo = args.join(' ') || tradutor.sin_motivo;
  const senderTag = `@${m.sender.split('@')[0]}`;

  setConfig(m.chat, { isBanned: true, bannedBy: m.sender, bannedRole: rolActor({ isOwner, isSubOwner }) || 'owner', bannedAt: Date.now() });

  await conn.sendMessage(m.chat, {
    text: tradutor.texto1
      .replace('{tag}', senderTag)
      .replace('{motivo}', motivo),
    mentions: [m.sender]
  });
};

handler.help = ['banchat'];
handler.tags = ['owner'];
handler.command = /^banchat$/i;
handler.subowner = 'ban_grupos';

export default handler;
