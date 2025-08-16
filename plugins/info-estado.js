import fs from 'fs';
import { performance } from 'perf_hooks';

const handler = async (m, { conn, usedPrefix }) => {
  const datas = global;
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.info_estado;

  const _uptime = process.uptime() * 1000;
  const uptime = clockString(_uptime);
  const totalusrReg = Object.values(global.db.data.users).filter(user => user.registered === true).length;
  const totalusr = Object.keys(global.db.data.users).length;
  const chats = Object.entries(conn.chats).filter(([id, data]) => id && data.isChats);
  const groups = chats.filter(([id]) => id.endsWith("@g.us"));
  const used = process.memoryUsage();
  const { restrict, antiCall, antiprivado, modejadibot } = global.db.data.settings[conn.user.jid] || {};
  const { autoread, gconly, pconly, self } = global.opts || {};
  const old = performance.now();
  const neww = performance.now();
  const rtime = (neww - old).toFixed(7);
  const wm = 'EHL VILLANO - Bot MD';

  const info = `╭━━〔 *${tradutor.texto1[0]}* 〕━━⬣
┃👑 *${tradutor.texto1[1]}* EHL VILLANO
┃📞 *${tradutor.texto1[2]}* wa.me/5493483466763
┃📢 *Canal:* https://whatsapp.com/channel/0029VbANyNuLo4hedEWlvJ3Y
┃🚀 *${tradutor.texto1[4]}* ${rtime}
┃⏰ *${tradutor.texto1[5]}* ${uptime}
┃💻 *${tradutor.texto1[6]}* ${usedPrefix}
┃🌐 *${tradutor.texto1[7]}* ${self ? "privado" : "público"}
┃🧍 *${tradutor.texto1[8]}* ${totalusrReg}
┃📊 *${tradutor.texto1[9]}* ${totalusr}
┃🤖 *${tradutor.texto1[10]}* ${(conn.user.jid == global.conn.user.jid ? '' : `Sub-bot de:\n ▢ +${global.conn.user.jid.split`@`[0]}`) || 'No es sub-bot'}
┃💬 *${tradutor.texto1[11]}* ${chats.length - groups.length}
┃👥 *${tradutor.texto1[12]}* ${groups.length}
┃📈 *${tradutor.texto1[13]}* ${chats.length}
┃📖 *${tradutor.texto1[14]}* ${autoread ? "activo" : "desactivado"}
┃🔐 *${tradutor.texto1[15]}* ${restrict ? "activo" : "desactivado"}
┃📲 *${tradutor.texto1[16]}* ${pconly ? "activado" : "desactivado"}
┃🖥️ *${tradutor.texto1[17]}* ${gconly ? "activado" : "desactivado"}
┃📵 *${tradutor.texto1[18]}* ${antiprivado ? "activado" : "desactivado"}
┃📞 *${tradutor.texto1[19]}* ${antiCall ? "activado" : "desactivado"}
┃🤖 *${tradutor.texto1[20]}* ${modejadibot ? "activado" : "desactivado"}
╰━━━━━━━━━━━━━━━━━━⬣`.trim();

  await conn.sendMessage(m.chat, { text: info }, { quoted: m });
};

handler.command = /^(ping|info|status|estado|infobot)$/i;
export default handler;

function clockString(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor(ms / 60000) % 60;
  const s = Math.floor(ms / 1000) % 60;
  return [h, m, s].map((v) => v.toString().padStart(2, 0)).join(":");
}
