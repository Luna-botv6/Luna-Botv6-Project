import fs from 'fs';
import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js';

const user = (a) => '@' + a.split('@')[0];

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

async function handler(m, { command, conn, text, usedPrefix }) {
  try {
    const datas = global;
    const idioma = datas.db.data.users[m.sender]?.language || global.defaultLenguaje;
    const _translate = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`, 'utf8'));
    const tradutor = _translate.plugins.fun_top;

    if (!text) {
      throw `${tradutor.texto1}`;
    }

    const chatId = m.chat;
    const senderId = m.sender;
    const groupData = await getGroupDataForPlugin(conn, chatId, senderId);
    const participants = groupData?.participants || [];

    if (!participants || participants.length === 0) {
      return m.reply(tradutor.texto2);
    }

    const ps = participants.map((v) => v.id);

    if (ps.length < 10) {
      return m.reply(`${tradutor.texto3} ${ps.length} ${tradutor.texto4}`);
    }

    const getRandomParticipant = () => ps[Math.floor(Math.random() * ps.length)];

    const a = getRandomParticipant();
    const b = getRandomParticipant();
    const c = getRandomParticipant();
    const d = getRandomParticipant();
    const e = getRandomParticipant();
    const f = getRandomParticipant();
    const g = getRandomParticipant();
    const h = getRandomParticipant();
    const i = getRandomParticipant();
    const j = getRandomParticipant();

    const x = pickRandom(['🤓', '😅', '😂', '😳', '😎', '🥵', '😱', '🤑', '🙄', '💩', '🍑', '🤨', '🥴', '🔥', '👇🏻', '😔', '👀', '🌚']);

    const top = `*${x} ${tradutor.texto5} ${text} ${x}*

*1. ${user(a)}*
*2. ${user(b)}*
*3. ${user(c)}*
*4. ${user(d)}*
*5. ${user(e)}*
*6. ${user(f)}*
*7. ${user(g)}*
*8. ${user(h)}*
*9. ${user(i)}*
*10. ${user(j)}*`;

    m.reply(top, null, { mentions: [a, b, c, d, e, f, g, h, i, j] });

  } catch (e) {
    console.error('Error en top:', e);
    m.reply(`${tradutor.texto6}: ${e.message || e}`);
  }
}

handler.help = handler.command = ['top'];
handler.tags = ['fun'];
handler.group = true;

export default handler;