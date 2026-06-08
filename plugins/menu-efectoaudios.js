import fetch from 'node-fetch';

const handler = async (m, {conn, usedPrefix, usedPrefix: _p, __dirname, text, isPrems}) => {
  const datas = global;
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.menu_audio || {
    texto1: ['AUDIOS EFECTOS', 'Hola', '', 'Error al cargar el menú']
  };

  try {
    const pp = imagen2;
    // let vn = './src/assets/audio/01J673Y3TGCFF1D548242AX68Q.mp3'
    const d = new Date(new Date + 3600000);
    const locale = 'es';
    const week = d.toLocaleDateString(locale, {weekday: 'long'});
    const date = d.toLocaleDateString(locale, {day: 'numeric', month: 'long', year: 'numeric'});
    const _uptime = process.uptime() * 1000;
    const uptime = clockString(_uptime);
    const user = global.db.data.users[m.sender];
    const {money, joincount} = global.db.data.users[m.sender];
    const {exp, limit, level, role} = global.db.data.users[m.sender];
    const rtotalreg = Object.values(global.db.data.users).filter((user) => user.registered == true).length;
    const more = String.fromCharCode(8206);
    const readMore = more.repeat(850);
    const taguser = '@' + m.sender.split('@s.whatsapp.net')[0];
    const doc = ['pdf', 'zip', 'vnd.openxmlformats-officedocument.presentationml.presentation', 'vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const document = doc[Math.floor(Math.random() * doc.length)];
    
    const str = `╭─❍═━『🎵✨』━═❍─╮
│   𓆩 𝑳𝑼𝑵𝑨 𝑩𝑶𝑻 𓆪
│───────────────────
│ ➤ ${tradutor.texto1[1]}, ${taguser} ✨
╰─❍═━『🎶✨』━═❍─╯

┏━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 🎵 *𝗔𝗨𝗗𝗜𝗢𝗦 𝗘𝗙𝗘𝗖𝗧𝗢𝗦* 🎵
┃━━━━━━━━━━━━━━━━━━━━━━━┃
┣ 🎧 _${usedPrefix}bass_
┣ 💥 _${usedPrefix}blown_
┣ 🌊 _${usedPrefix}deep_
┣ 🔊 _${usedPrefix}earrape_
┣ ⚡ _${usedPrefix}fast_
┣ 🌙 _${usedPrefix}nightcore_
┣ ↩️ _${usedPrefix}reverse_
┣ 🤖 _${usedPrefix}robot_
┣ 🐌 _${usedPrefix}slow_
┣ ✨ _${usedPrefix}smooth_
┣ 🐿️ _${usedPrefix}tupai_
┣ 🐿️ _${usedPrefix}squirrel_
┣ 🐿️ _${usedPrefix}chipmunk_
┗━━━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 📝 *𝗜𝗡𝗦𝗧𝗥𝗨𝗖𝗖𝗜𝗢𝗡𝗘𝗦* 📝
┃━━━━━━━━━━━━━━━━━━━━━━━┃
┣ 💡 Responde a un audio/video
┣ 💡 O envía junto con el comando
┣ 💡 Ejemplo: *${usedPrefix}bass* (respondiendo)
┗━━━━━━━━━━━━━━━━━━━━━━━┛`.trim();

    if (m.isGroup) {
      // await conn.sendFile(m.chat, vn, './src/assets/audio/01J673Y3TGCFF1D548242AX68Q.mp3', null, m, true, { type: 'audioMessage', ptt: true})
      const fkontak2 = {'key': {'participants': '0@s.whatsapp.net', 'remoteJid': 'status@broadcast', 'fromMe': false, 'id': 'Halo'}, 'message': {'contactMessage': {'vcard': `BEGIN:VCARD\nVERSION:3.0\nN:Sy;Bot;;;\nFN:y\nitem1.TEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`}}, 'participant': '0@s.whatsapp.net'};
      conn.sendMessage(m.chat, {image: pp, caption: str.trim(), mentions: [...str.matchAll(/@([0-9]{5,16}|0)/g)].map((v) => v[1] + '@s.whatsapp.net')}, {quoted: fkontak2});
    } else {
      // await conn.sendFile(m.chat, vn, './src/assets/audio/01J673Y3TGCFF1D548242AX68Q.mp3', null, m, true, { type: 'audioMessage', ptt: true})
      const fkontak2 = {'key': {'participants': '0@s.whatsapp.net', 'remoteJid': 'status@broadcast', 'fromMe': false, 'id': 'Halo'}, 'message': {'contactMessage': {'vcard': `BEGIN:VCARD\nVERSION:3.0\nN:Sy;Bot;;;\nFN:y\nitem1.TEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`}}, 'participant': '0@s.whatsapp.net'};
      conn.sendMessage(m.chat, {image: pp, caption: str.trim(), mentions: [...str.matchAll(/@([0-9]{5,16}|0)/g)].map((v) => v[1] + '@s.whatsapp.net')}, {quoted: fkontak2});
    }
  } catch {
    conn.reply(m.chat, tradutor.texto1[3], m);
  }
};

// Aquí está el handler que mencionaste con todos los efectos
handler.command = /^(audioefectos|efectosaudio)$/i;
handler.exp = 50;
handler.fail = null;
export default handler;

function clockString(ms) {
  const h = isNaN(ms) ? '--' : Math.floor(ms / 3600000);
  const m = isNaN(ms) ? '--' : Math.floor(ms / 60000) % 60;
  const s = isNaN(ms) ? '--' : Math.floor(ms / 1000) % 60;
  return [h, m, s].map((v) => v.toString().padStart(2, 0)).join(':');
}