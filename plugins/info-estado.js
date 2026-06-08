import fs from 'fs';
import { performance } from 'perf_hooks';

const handler = async (m, { conn, usedPrefix }) => {
  const datas = global;
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje;

  const _translate = JSON.parse(
    fs.readFileSync(`./src/lunaidiomas/${idioma}.json`)
  );

  const tradutor = _translate.plugins?.info_estado;

  if (!tradutor || !tradutor.texto1) {
    return m.reply('❌ Error: traducción "plugins.info_estado" no encontrada');
  }

  const _uptime = process.uptime() * 1000;
  const uptime = clockString(_uptime);

  const totalusrReg = Object.values(global.db.data.users).filter(user => user.registered === true).length;
  const totalusr = Object.keys(global.db.data.users).length;

  const chats = Object.entries(conn.chats).filter(([id, data]) => id && data.isChats);
  const groups = chats.filter(([id]) => id.endsWith('@g.us'));

  const used = process.memoryUsage();

  const { restrict, antiCall, antiprivado, modejadibot } =
    global.db.data.settings[conn.user.jid] || {};

  const { autoread, gconly, pconly, self } = global.opts || {};

  const old = performance.now();
  const neww = performance.now();
  const rtime = (neww - old).toFixed(7);

  const header = `*${tradutor.texto1[0]}* \n${tradutor.texto1[1]}\n`;

  const lines = [
    `⏱️ Uptime: *${uptime}*`,
    `⚡ Respuesta: *${rtime}ms*`,
    `👤 Usuarios registrados: *${totalusrReg}* / *${totalusr}*`,
    `💬 Chats: *${chats.length}*`,
    `👥 Grupos: *${groups.length}*`,
    `🔒 Restricciones: *${restrict ? 'ON' : 'OFF'}*`,
    `📖 Autoread: *${autoread ? 'ON' : 'OFF'}*`,
    `📲 Privado solo: *${pconly ? 'ON' : 'OFF'}*`,
    `🖥️ Grupo solo: *${gconly ? 'ON' : 'OFF'}*`,
    `📞 AntiCall: *${antiCall ? 'ON' : 'OFF'}*`,
  ];

  const info = `*${tradutor.texto1[0]}*\n\n${lines.join('\n')}\n\n` +
    '*Enlaces:* wa.me/5493483466763 | https://whatsapp.com/channel/0029VbANyNuLo4hedEWlvJ3Y';

  const footer = 'Usa los botones para interactuar rápidamente';

  const buttons = [
    { buttonId: `${usedPrefix}menu`, buttonText: { displayText: '📚 Menu' }, type: 1 },
    { buttonId: `${usedPrefix}owner`, buttonText: { displayText: '👤 Owner' }, type: 1 },
    { buttonId: `${usedPrefix}donar`, buttonText: { displayText: '💖 Donar' }, type: 1 }
  ];

  await conn.sendMessage(m.chat, {
    text: info,
    footer: footer,
    buttons: buttons,
    headerType: 1
  }, { quoted: m });
};

handler.command = /^(ping|info|status|estado|infobot)$/i;
export default handler;

function clockString(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor(ms / 60000) % 60;
  const s = Math.floor(ms / 1000) % 60;
  return [h, m, s].map(v => v.toString().padStart(2, 0)).join(':');
}