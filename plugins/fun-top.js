import fs from 'fs';
import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js';

const user = (a) => '@' + a.split('@')[0];
const _langCache = new Map();

function getLang(idioma) {
  if (_langCache.has(idioma)) return _langCache.get(idioma);
  const t = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`, 'utf8')).plugins.fun_top;
  _langCache.set(idioma, t);
  return t;
}

const EMOJIS = ['🤓','😅','😂','😳','😎','🥵','😱','🤑','🙄','💩','🍑','🤨','🥴','🔥','👇🏻','😔','👀','🌚'];

async function handler(m, { conn, text }) {
  const idioma = global.db?.data?.users?.[m.sender]?.language || global.defaultLenguaje;
  const t = getLang(idioma);

  try {
    if (!text) throw t.texto1;

    const groupData = await getGroupDataForPlugin(conn, m.chat, m.sender);
    const participants = (groupData?.participants || [])
      .map(p => p.id)
      .filter(id => id && !id.includes('@lid'));

    if (!participants.length) return m.reply(t.texto2);
    if (participants.length < 10) return m.reply(`${t.texto3} ${participants.length} ${t.texto4}`);

    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    const top10 = shuffled.slice(0, 10);

    const x = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];

    const lines = [
      `*${x} ${t.texto5} ${text} ${x}*`,
      ...top10.map((jid, i) => `*${i + 1}. ${user(jid)}*`)
    ];

    await m.reply(lines.join('\n'), null, { mentions: top10 });

  } catch (e) {
    m.reply(`${t.texto6}: ${e.message || e}`);
  }
}

handler.help = handler.command = ['top'];
handler.tags = ['fun'];
handler.group = true;
export default handler;
