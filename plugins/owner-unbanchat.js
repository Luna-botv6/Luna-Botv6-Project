
import fs from 'fs';
import { getChat, setChat } from '../lib/chatsDB.js';

const handler = async (m) => {
 
  const idioma = 'es';
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.owner_unbanchat;

  // Obtener datos actuales del chat
  const chatData = getChat(m.chat);
  chatData.isBanned = false;

  // Guardar los cambios en chats.json
  setChat(m.chat, chatData);

  // Responder al usuario
  m.reply(tradutor.texto1);
};

handler.help = ['unbanchat'];
handler.tags = ['owner'];
handler.command = /^unbanchat$/i;
handler.rowner = true;

export default handler;
