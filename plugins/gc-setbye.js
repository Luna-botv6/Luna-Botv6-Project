import fs from 'fs';
import { setConfig } from '../lib/funcConfig.js';

const handler = async (m, { text }) => {
  const idioma = global.db.data.users[m.sender].language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.gc_setbye;

  if (text) {
   
    global.db.data.chats[m.chat].sBye = text;

    await setConfig(m.chat, { sBye: text });

    m.reply(tradutor.texto1);
  } else {
    throw `${tradutor.texto2}\n*- @user ${tradutor.texto3}`;
  }
};

handler.help = ['setbye <text>'];
handler.tags = ['group'];
handler.command = ['setbye'];
handler.admin = true;
export default handler;

