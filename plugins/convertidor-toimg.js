import fs from 'fs';
import {webp2png} from '../src/libraries/webp2mp4.js';


const handler = async (m, {conn, usedPrefix, command}) => {
  const datas = global;
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.convertidor_toimg;


  const notStickerMessage = `*${tradutor.texto1} ${usedPrefix + command}*`;
  if (!m.quoted) throw notStickerMessage;
  const q = m.quoted || m;
  const mime = q.mediaType || '';
  if (!/sticker|image/.test(mime)) throw notStickerMessage;
  const media = await q.download();
  const out = await webp2png(media).catch(() => null);
  if (!out || !out.length) throw tradutor.texto2;
  await conn.sendFile(m.chat, out, 'imagen.png', null, m);
};
handler.help = ['toimg (reply)'];
handler.tags = ['sticker'];
handler.command = ['toimg', 'jpg', 'img'];
export default handler;
