import { setConfig } from '../lib/funcConfig.js';
import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js';
import fs from 'fs';

const cooldowns = new Map();

const handler = async (m, { isOwner, conn, text, usedPrefix }) => {
  if (usedPrefix === 'a' || usedPrefix === 'A') return;

  const idioma = global.db.data.users[m.sender]?.language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`));
  const t = _translate.plugins.gc_setwelcome;

  const cooldownTime = 2 * 60 * 1000;
  const now = Date.now();

  const { isAdmin } = await getGroupDataForPlugin(conn, m.chat, m.sender);
  if (!isAdmin && !isOwner) return m.reply(t.texto2[0]);

  if (cooldowns.has(m.chat)) {
    const expirationTime = cooldowns.get(m.chat) + cooldownTime;
    if (now < expirationTime) {
      const timeLeft = Math.ceil((expirationTime - now) / 1000);
      const min = Math.floor(timeLeft / 60);
      const seg = timeLeft % 60;
      return m.reply(t.cooldown.replace('{min}', min).replace('{seg}', seg));
    }
  }

  if (!text || !text.trim()) {
    return m.reply(`${t.texto2[0]}\n*- @user (mención)*\n*- @group (nombre de grupo)*\n*- @desc (descripción de grupo)*`);
  }

  if (!global.db.data.chats[m.chat]) global.db.data.chats[m.chat] = {};
  global.db.data.chats[m.chat].sWelcome = text;
  await setConfig(m.chat, { sWelcome: text });
  cooldowns.set(m.chat, now);
  m.reply(t.texto1);
};

handler.help = ['setwelcome <text>'];
handler.tags = ['group'];
handler.command = /^(setwelcome)$/i;
handler.group = true;

export default handler;
