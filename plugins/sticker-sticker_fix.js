import fetch from 'node-fetch';
import { stickerServer } from '../src/libraries/sticker.js';
import uploadFile from '../src/libraries/uploadFile.js';
import uploadImage from '../src/libraries/uploadImage.js';
import { webp2png } from '../src/libraries/webp2mp4.js';

async function handler(m, { conn, args, usedPrefix, command }) {
  let stiker = false;

  try {
    let [packname, ...author] = args.join(' ').split(' ');
    author = (author || []).join(' ');

    let q = m.quoted ? m.quoted : m;
    let mime = (q.msg || q).mimetype || q.mediaType || '';

    let img = await q.download?.();

    if (/webp|image|video/g.test(mime)) {
      stiker = await stickerServer(img, false, packname || global.packname, author || global.author, [], {});
    } else if (args[0] && isUrl(args[0])) {
      const u = await fetch(args[0]);
      if (u.status !== 200) throw new Error('No se pudo descargar la URL');
      stiker = await stickerServer(await u.buffer(), false, packname || global.packname, author || global.author, [], {});
    } else {
      throw `[❗𝐈𝐍𝐅𝐎❗] 𝚁𝙴𝚂𝙿𝙾𝙽𝙳𝙴 𝙰 𝚄𝙽 𝚅𝙸𝙳𝙴𝙾, 𝙸𝙼𝙰𝙶𝙴𝙽 𝙾 𝙸𝙽𝚂𝙴𝚁𝚃𝙴 𝙴𝙻 𝙴𝙽𝙻𝙰𝙲𝙴 𝙳𝙴 𝚄𝙽𝙰 𝙸𝙼𝙰𝙶𝙴𝙽 𝚃𝙴𝚁𝙼𝙸𝙽𝙰𝙲𝙸𝙾́𝙽 .𝚓𝚙𝚐 𝙴𝙻 𝙲𝚄𝙰𝙻 𝚂𝙴𝚁𝙰 𝙲𝙾𝙽𝚅𝙴𝚁𝚃𝙸𝙳𝙾 𝙴𝙽 𝚂𝚃𝙸𝙲𝙺𝙴𝚁, 𝙳𝙴𝙱𝙴 𝚁𝙴𝚂𝙿𝙾𝙽𝙳𝙴𝚁 𝙾 𝚄𝚂𝙰𝚁 𝙴𝙻 𝙲𝙾𝙼𝙰𝙽𝙳𝙾 ${usedPrefix + command}*`;
    }
  } catch (error) {
    console.error(error);
    try {
      let [packname, ...author] = args.join(' ').split(' ');
      author = (author || []).join(' ');

      let q = m.quoted ? m.quoted : m;
      let mime = (q.msg || q).mimetype || q.mediaType || '';

      let img = await q.download?.();
      let out;

if (/webp/g.test(mime)) out = await webp2png(img);
      else if (/image/g.test(mime)) out = await uploadImage(img);
      else if (/video/g.test(mime)) out = await uploadFile(img);

      if (typeof out !== 'string') out = await uploadImage(img);

      if (typeof out === 'string') {
        const u = await fetch(out);
        if (u.status !== 200) throw new Error('No se pudo descargar el archivo');
        out = await u.buffer();
      }

      stiker = await stickerServer(out, false, global.packname, global.author, [], {});
    } catch (error) {
      stiker = '[❗𝐈𝐍𝐅𝐎❗] 𝙾𝙲𝚄𝚁𝚁𝙸𝙾 𝚄𝙽 𝙴𝚁𝚁𝙾𝚁, 𝚅𝚄𝙴𝙻𝚅𝙰 𝙰 𝙸𝙽𝚃𝙴𝙽𝚃𝙰𝚁𝙻𝙾. 𝚁𝙴𝚂𝙿𝙾𝙽𝙳𝙴 𝙰 𝚄𝙽 𝚅𝙸𝙳𝙴𝙾, 𝙸𝙼𝙰𝙶𝙴𝙽 𝙾 𝙸𝙽𝚂𝙴𝚁𝚃𝙴 𝙴𝙻 𝙴𝙽𝙻𝙰𝙲𝙴 𝙳𝙴 𝚄𝙽𝙰 𝙸𝙼𝙰𝙶𝙴𝙽 𝚃𝙴𝚁𝙼𝙸𝙽𝙰𝙲𝙸𝙾́𝙽 .𝚓𝚙𝚐 𝙴𝙻 𝙲𝚄𝙰𝙻 𝚂𝙴𝚁𝙰 𝙲𝙾𝙽𝚅𝙴𝚁𝚃𝙸𝙳𝙾 𝙴𝙽 𝚂𝚃𝙸𝙲𝙺𝙴𝚁';
    }
  } finally {
    m.reply(stiker);
  }
}

handler.help = ['sfull'];
handler.tags = ['sticker'];
handler.command = /^(s2|sticker2)$/i;

export default handler;

const isUrl = (text) => text.match(new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)(jpe?g|gif|png)/, 'gi'));
