import fs from 'fs';
import { getUser } from '../lib/usersDB.js';
import { getChat, setChat } from '../lib/chatsDB.js';

const handler = async (m) => {
  // Obtenemos la info del usuario desde la base modular
  const user = getUser(m.sender);

  // Si el usuario no tiene idioma, usamos el idioma por defecto global
  const idioma = user.language || global.defaultLenguaje;

  // Cargamos las traducciones para ese idioma
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.owner_banchat;

  // Obtenemos la info del chat
  const chat = getChat(m.chat);

  // Marcamos el chat como baneado (isBanned = true)
  setChat(m.chat, { ...chat, isBanned: true });

  // Respondemos
  m.reply(tradutor.texto1);
};

handler.help = ['banchat'];
handler.tags = ['owner'];
handler.command = /^banchat$/i;
handler.rowner = true;

export default handler;
