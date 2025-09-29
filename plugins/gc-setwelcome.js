import fs from 'fs';
import { setConfig } from '../lib/funcConfig.js';

const handler = async (m, { text }) => {
  const idioma = global.db.data.users[m.sender].language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.gc_setwelcome;

  if (text) {
    
    global.db.data.chats[m.chat].sWelcome = text;

  
    await setConfig(m.chat, { sWelcome: text });

    m.reply(tradutor.texto1);
  } else {
    throw `${tradutor.texto2[0]}\n*- @user (mención)*\n*- @group (nombre de grupo)*\n*- @desc (description de grupo)*`;
  }
};

handler.help = ['setwelcome <text>'];
handler.tags = ['group'];
handler.command = ['setwelcome'];
handler.admin = true;
export default handler;

