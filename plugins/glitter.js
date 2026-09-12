import { Jimp, loadFont } from 'jimp';
import { SANS_64_WHITE } from 'jimp/fonts';
import { Sticker } from 'wa-sticker-formatter';

const handler = async (m, { conn, args }) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es');
  const t = _tr?.plugins?.glitter || {};
  if (!args[0]) throw (t.ejemplo || 'Ejemplo:\n.glitter Hola cómo estás');
  const text = args.join(' ').trim();
  if (text.length > 40) throw (t.max_caracteres || 'Máximo 40 caracteres');

  const SIZE = 512;
  const MARGIN = 16;
  const MAX_WIDTH = SIZE - MARGIN * 2;

  let image = new Jimp({ width: SIZE, height: SIZE, color: 0x00000000 });
  const font = await loadFont(SANS_64_WHITE);

  const words = text.split(' ');
  let line1 = '';
  let line2 = '';
  for (const word of words) {
    const sep = line1 ? ' ' : '';
    if ((line1 + sep + word).length <= Math.ceil(text.length / 2)) {
      line1 += sep + word;
    } else {
      line2 += (line2 ? ' ' : '') + word;
    }
  }
  const lines = line2 ? [line1, line2] : [line1];
  let startY = lines.length === 1 ? 210 : 165;

  for (const line of lines) {
    const letterSpacing = Math.min(52, Math.floor(MAX_WIDTH / line.length));
    const lineWidth = line.length * letterSpacing;
    let cursorX = Math.max(MARGIN, Math.floor((SIZE - lineWidth) / 2));

    for (let i = 0; i < line.length; i++) {
      const letter = line[i];
      if (letter === ' ') { cursorX += letterSpacing; continue; }

      let letterImg = new Jimp({ width: 80, height: 100, color: 0x00000000 });
      letterImg.print({ font, x: 0, y: 0, text: letter });
      const r = Math.floor(Math.random() * 200) + 55;
      const g = Math.floor(Math.random() * 200) + 55;
      const b = Math.floor(Math.random() * 200) + 55;
      letterImg.color([
        { apply: 'red',   params: [-255 + r] },
        { apply: 'green', params: [-255 + g] },
        { apply: 'blue',  params: [-255 + b] }
      ]);
      image.composite(letterImg, cursorX, startY);
      cursorX += letterSpacing;
      letterImg = null;
    }
    startY += 115;
  }

  const buffer = await image.getBuffer('image/png');
  image = null;

  let sticker = new Sticker(buffer, {
    pack: global.packname || 'Luna Bot',
    author: global.author || 'Crack',
    type: 'full',
    quality: 50
  });

  const stickerBuffer = await sticker.toBuffer();
  sticker = null;

  if (stickerBuffer.length > 100 * 1024) {
    throw (t.sticker_pesado || '⚠️ El sticker supera los 100 KB, intenta con menos texto');
  }

  await conn.sendMessage(m.chat, { sticker: stickerBuffer }, { quoted: m });

  if (global.gc) global.gc();
};

handler.command = ['glitter'];
export default handler;