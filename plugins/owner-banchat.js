import fs from 'fs';
import { setConfig } from '../lib/funcConfig.js';

const handler = async (m) => {
  const datas = global;
  const idioma = datas.db.data.users[m.sender]?.language || global.defaultLenguaje;

  let texto1 = '🚫 Chat baneado. El bot no responderá en este grupo.';
  try {
    const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
    texto1 = _translate.plugins.owner.banchat?.texto1 || texto1;
  } catch {}

  setConfig(m.chat, { isBanned: true });
  m.reply(texto1);
};

handler.help = ['banchat'];
handler.tags = ['owner'];
handler.command = /^banchat$/i;
handler.rowner = true;
export default handler;
