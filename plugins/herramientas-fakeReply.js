
import fs from 'fs';
import { getLidMapping } from '../lib/stats.js';
import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js';

const handler = async (m, {conn, text, usedPrefix, command}) => {
  const datas = global;
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`));
  const tradutor = _translate.plugins.herramientas_fakereply;

  if (!text) return m.reply(`${tradutor.texto1[0]}\n\n*${usedPrefix + command}* ${tradutor.texto1[1]} @${m.sender.split`@`[0]} a`);
  const cm = copy(m);
  let who;
  if (text.includes('@0')) who = '0@s.whatsapp.net';
  else if (m.isGroup) who = cm.participant = m.mentionedJid[0];
  else who = m.chat;
  if (!who) return m.reply(`${tradutor.texto1[0]}\n\n*${usedPrefix + command}* ${tradutor.texto1[1]} @${m.sender.split`@`[0]} a`, null, {mentions: [m.sender]});
  let fakeJid = who;
  if (who.includes('@lid')) {
    fakeJid = getLidMapping(who);
    if (!fakeJid) {
      const groupData = await getGroupDataForPlugin(conn, m.chat, m.sender).catch(() => null);
      const match = (groupData?.participants || []).find(p => p.lid === who || p.id === who);
      if (match?.id && !match.id.includes('@lid')) fakeJid = match.id;
    }
    if (!fakeJid) fakeJid = who.replace('@lid', '@s.whatsapp.net');
  }
  const lidNum = '@' + who.split`@`[0];
  const pnNum = fakeJid !== who ? '@' + fakeJid.split`@`[0] : null;
  const sp = pnNum && text.includes(pnNum) ? pnNum : (text.includes(lidNum) ? lidNum : null);
  if (!sp) return m.reply(`${tradutor.texto1[0]}\n\n*${usedPrefix + command}* ${tradutor.texto1[1]} @${m.sender.split`@`[0]} a`);
  const [fake, ...real] = text.split(sp);
  const realText = real.join(sp).replaceAll(sp, '@' + fakeJid.split`@`[0]).trimStart();
  cm.key.fromMe = false;
  cm.message[m.mtype] = copy(m.msg);
  await conn.sendMessage(m.chat, {
    text: realText,
    mentions: conn.parseMention(realText),
  }, {
    quoted: {
      key: cm.key,
      message: cm.message,
    },
  });
};

handler.help = ['fake <text> @user <text2>'];
handler.tags = ['tools'];
handler.command = /^(fitnah|fakereply|fake)$/;

export default handler;

function copy(obj) {
  return JSON.parse(JSON.stringify(obj));
}
