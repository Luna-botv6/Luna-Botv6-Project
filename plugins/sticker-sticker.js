import {sticker} from '../src/libraries/sticker.js';
import uploadFile from '../src/libraries/uploadFile.js';
import uploadImage from '../src/libraries/uploadImage.js';
import {webp2png} from '../src/libraries/webp2mp4.js';
import fs from 'fs';

const handler = async (m, {conn, args, usedPrefix, command}) => {

  if (usedPrefix === 'a' || usedPrefix === 'A') return;

  const idioma = global.db.data.users[m.sender]?.language || global.defaultLenguaje;

  let tradutor = {};
  try {
    const raw = await fs.promises.readFile(`./src/languages/${idioma}.json`, 'utf8');
    tradutor = JSON.parse(raw).plugins?.sticker_sticker || {};
  } catch (e) {}

  const q = m.quoted ? m.quoted : m;
  const mime = (q.msg || q).mimetype || q.mediaType || '';

  if (!mime && !args[0]) {
    return m.reply(`${tradutor.texto1 || '❌ Responde a una imagen/video o usa:'} ${usedPrefix + command} <url>`);
  }

  const metadata = {isAiSticker: true};
  let stiker = false;

  try {

    if (/webp|image|video/i.test(mime)) {
      let img;
      try {
        img = await q.download();
      } catch (e) {
        return m.reply('❌ No pude descargar la imagen/video. Intenta de nuevo.');
      }

      if (!img?.length) {
        return m.reply(`${tradutor.texto1 || '❌ Responde a una imagen/video con'} ${usedPrefix + command}`);
      }

      try {
        stiker = await sticker(img, false, global.packname, global.author, ['✨'], metadata);
      } catch (e) {
        let out;
        if (/webp/i.test(mime)) {
          out = await webp2png(img);
        } else if (/video/i.test(mime)) {
          out = await uploadFile(img);
        } else {
          out = await uploadImage(img);
        }

        if (Buffer.isBuffer(out)) {
          stiker = await sticker(out, false, global.packname, global.author, ['✨'], metadata);
        } else {
          stiker = await sticker(false, out, global.packname, global.author, ['✨'], metadata);
        }
      }

    } else if (args[0]) {
      if (!isUrl(args[0])) {
        return m.reply(
          `${tradutor.texto2 || '❌ URL inválida. Ejemplo:'}\n${usedPrefix}s https://telegra.ph/file/0dc687c61410765e98de2.jpg`
        );
      }
      stiker = await sticker(false, args[0], global.packname, global.author, ['✨'], metadata);
    }

  } catch (e) {
    return m.reply(`${tradutor.texto3 || '❌ Error al crear el sticker. Intenta con otra imagen/video.'}`);
  }

  if (!stiker) {
    return m.reply(`${tradutor.texto3 || '❌ No pude crear el sticker.'} Usa: ${usedPrefix + command}`);
  }

  try {
    const stickerBuffer = Buffer.isBuffer(stiker) ? stiker : Buffer.from(stiker);
    await conn.sendMessage(m.chat, { sticker: stickerBuffer }, { quoted: m });
  } catch (e) {
    return m.reply('❌ Error al enviar el sticker. Intenta de nuevo.');
  }
};

handler.help = ['sfull'];
handler.tags = ['sticker'];
handler.command = /^s(tic?ker)?(gif)?(wm)?$/i;

export default handler;

const isUrl = (text) => {
  try {
    const url = new URL(text);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};
