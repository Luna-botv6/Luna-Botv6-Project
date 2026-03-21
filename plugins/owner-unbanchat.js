import fs from 'fs';
import { setConfig } from '../lib/funcConfig.js';

const handler = async (m) => {
  const datas = global;
  const idioma = datas.db.data.users[m.sender]?.language || global.defaultLenguaje;

  let texto1 = '✅ Chat desbaneado. El bot vuelve a funcionar en este grupo.';
  try {
    const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
    texto1 = _translate.plugins.owner_unbanchat?.texto1 || texto1;
  } catch {}

  setConfig(m.chat, { isBanned: false });
  m.reply(texto1);
};

handler.help = ['unbanchat'];
handler.tags = ['owner'];
handler.command = /^unbanchat$/i;
handler.rowner = true;
export default handler;
