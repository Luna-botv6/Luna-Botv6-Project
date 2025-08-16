import fetch from 'node-fetch';
import fs from 'fs';

const handler = async (m, {conn, usedPrefix, __dirname}) => {
  const datas = global;
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.menu_audios;

  try {
    const pp = imagen4;
    const d = new Date(new Date() + 3600000);
    const locale = 'es';
    const taguser = '@' + m.sender.split('@s.whatsapp.net')[0];

    const str = `╭─❍═━『🌙✨』━═❍─╮
│   𓆩Luna-Bot𓆪
│────────────────
│ ➤ Hola, ${taguser} ✨
╰─❍═━『🔊𝐀𝐔𝐃𝐈𝐎𝐒🔊』═❍─╯

┏━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 🌟 *< ${tradutor.texto1} />* 🌟
┃━━━━━━━━━━━━━━━━━━━━━━━┃
┣ 💫 _Quien es tu sempai botsito 7w7_
┣ 💫 _Te diagnostico con gay_
┣ 💫 _No digas eso papu_
┣ 💫 _A nadie le importa_
┣ 💫 _Fiesta del admin_
┣ 💫 _Fiesta del administrador_
┣ 💫 _Vivan los novios_
┣ 💫 _Feliz cumpleaños_
┣ 💫 _Noche de paz_
┣ 💫 _Buenos dias_
┣ 💫 _Buenos tardes_
┣ 💫 _Buenos noches_
┣ 💫 _Audio hentai_
┣ 💫 _Chica lgante_
┣ 💫 _Feliz navidad_
┣ 💫 _Vete a la vrg_
┣ 💫 _Pasa pack Bot_
┣ 💫 _Atencion grupo_
┣ 💫 _Marica quien_
┣ 💫 _Murio el grupo_
┣ 💫 _Oh me vengo_
┣ 💫 _tio que rico_
┣ 💫 _Viernes_
┣ 💫 _Baneado_
┣ 💫 _Sexo_
┣ 💫 _Hola_
┣ 💫 _Un pato_
┣ 💫 _Nyanpasu_
┣ 💫 _Te amo_
┣ 💫 _Yamete_
┣ 💫 _Bañate_
┣ 💫 _Es puto_
┣ 💫 _La biblia_
┣ 💫 _Onichan_
┣ 💫 _Mierda de Bot_
┣ 💫 _Siuuu_
┣ 💫 _Epico_
┣ 💫 _Shitpost_
┣ 💫 _Rawr_
┣ 💫 _UwU_
┣ 💫 _:c_
┣ 💫 _a_
┗━━━━━━━━━━━━━━━━━━━━━━━┛`;

    const fkontak2 = {
      key: {
        participants: '0@s.whatsapp.net',
        remoteJid: 'status@broadcast',
        fromMe: false,
        id: 'Halo'
      },
      message: {
        contactMessage: {
          vcard: `BEGIN:VCARD\nVERSION:3.0\nN:Sy;Bot;;;\nFN:y\nitem1.TEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`
        }
      },
      participant: '0@s.whatsapp.net'
    };

    if (m.isGroup) {
      await conn.sendMessage(m.chat, {image: pp, caption: str.trim(), mentions: [taguser + '@s.whatsapp.net']}, {quoted: fkontak2});
    } else {
      await conn.sendMessage(m.chat, {image: pp, caption: str.trim(), mentions: [taguser + '@s.whatsapp.net']}, {quoted: fkontak2});
    }
  } catch {
    conn.reply(m.chat, tradutor.texto2, m);
  }
};

handler.command = /^(menu2|audios|menú2|memu2|menuaudio|menuaudios|memuaudios|memuaudio|keyaudio|keyaudios)$/i;
handler.exp = 50;
handler.fail = null;
export default handler;

function clockString(ms) {
  const h = isNaN(ms) ? '--' : Math.floor(ms / 3600000);
  const m = isNaN(ms) ? '--' : Math.floor(ms / 60000) % 60;
  const s = isNaN(ms) ? '--' : Math.floor(ms / 1000) % 60;
  return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':');
}