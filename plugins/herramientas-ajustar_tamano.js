import fs from 'fs';
import uploadImage from '../src/libraries/uploadImage.js';
import fetch from 'node-fetch';

const handler = async (m, {conn, usedPrefix, command, args, text}) => {
  const datas = global;
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`));
  const tradutor = _translate.plugins.herramientas_ajustar_tamano;
  
  const q = m.quoted ? m.quoted : m;
  const mime = (q.msg || q).mimetype || '';
  if (!mime) return m.reply(tradutor.texto1);
  if (!text) return m.reply(tradutor.texto2);
  if (isNaN(text)) return m.reply(tradutor.texto3);
  if (!/image\/(jpe?g|png)|video|document/.test(mime)) return m.reply(tradutor.texto4);
  const img = await q.download();
  const url = await uploadImage(img);

  if (/image\/(jpe?g|png)/.test(mime)) {
    conn.sendMessage(m.chat, {image: {url: url}, caption: tradutor.texto5, fileLength: `${text}`, mentions: [m.sender]}, {ephemeralExpiration: 24*3600, quoted: m});
  } else if (/video/.test(mime)) {
    return conn.sendMessage(m.chat, {video: {url: url}, caption: tradutor.texto5, fileLength: `${text}`, mentions: [m.sender]}, {ephemeralExpiration: 24*3600, quoted: m});
  }
};
handler.tags = ['tools'];
handler.help = ['tamaño <cantidad>'];
handler.command = /^(length|filelength|edittamaño|totamaño|tamaño)$/i;
export default handler;
