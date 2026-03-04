import Jimp from 'jimp';
import GIFEncoder from 'omggif';
import fs from 'fs';

let Sticker;
import('wa-sticker-formatter').then((m) => { Sticker = m.Sticker; }).catch(() => {});

const COLORS = [
  [255, 50,  50 ],
  [255, 140, 0  ],
  [255, 220, 0  ],
  [50,  255, 50 ],
  [0,   180, 255],
  [180, 50,  255],
  [255, 50,  180],
];

async function buildTextFrame(text, r, g, b) {
  const WIDTH  = 512;
  const HEIGHT = 512;

  const words    = text.split(' ');
  const lines    = [];
  let   current  = '';

  const font64  = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);
  const font32  = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (Jimp.measureText(font64, test) > WIDTH - 40) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);

  const lineHeight = 80;
  const totalH     = lines.length * lineHeight;
  const startY     = Math.round((HEIGHT - totalH) / 2);

  const img = new Jimp(WIDTH, HEIGHT, 0x00000000);

  for (let li = 0; li < lines.length; li++) {
    const line  = lines[li];
    const tw    = Jimp.measureText(font64, line);
    const x     = Math.round((WIDTH - tw) / 2);
    const y     = startY + li * lineHeight;
    img.print(font64, x, y, line);
  }

  img.scan(0, 0, WIDTH, HEIGHT, function (px, py, idx) {
    if (this.bitmap.data[idx + 3] > 10) {
      this.bitmap.data[idx]     = r;
      this.bitmap.data[idx + 1] = g;
      this.bitmap.data[idx + 2] = b;
      this.bitmap.data[idx + 3] = 255;
    } else {
      this.bitmap.data[idx]     = 0;
      this.bitmap.data[idx + 1] = 0;
      this.bitmap.data[idx + 2] = 0;
      this.bitmap.data[idx + 3] = 0;
    }
  });

  return img;
}

const handler = async (m, { conn, text, usedPrefix, command }) => {
  const idioma = global.db.data.users[m.sender].language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.sticker_ttp_attp;

  if (!text) throw `${tradutor.texto1} ${usedPrefix + command} Hola mundo*`;

  m.reply('⏳ Generando sticker animado...');

  const WIDTH  = 512;
  const HEIGHT = 512;
  const FRAMES = COLORS.length;

  const frameImages = [];
  for (let i = 0; i < FRAMES; i++) {
    const [r, g, b] = COLORS[i];
    const img = await buildTextFrame(text, r, g, b);
    frameImages.push(img);
  }

  const gifBuf  = Buffer.alloc(WIDTH * HEIGHT * FRAMES * 5 + 2048);
  const encoder = new GIFEncoder.GifWriter(gifBuf, WIDTH, HEIGHT, { loop: 0 });

  for (let i = 0; i < FRAMES; i++) {
    const img           = frameImages[i];
    const palette       = [0x000000];
    const colorMap      = new Map();
    colorMap.set('transparent', 0);

    const indexedPixels = new Uint8Array(WIDTH * HEIGHT);

    img.scan(0, 0, WIDTH, HEIGHT, function (px, py, idx) {
      const p = py * WIDTH + px;
      const a = this.bitmap.data[idx + 3];

      if (a < 10) {
        indexedPixels[p] = 0;
        return;
      }

      const r   = this.bitmap.data[idx];
      const g   = this.bitmap.data[idx + 1];
      const b   = this.bitmap.data[idx + 2];
      const key = `${r},${g},${b}`;

      if (!colorMap.has(key)) {
        if (palette.length < 256) {
          colorMap.set(key, palette.length);
          palette.push((r << 16) | (g << 8) | b);
        }
      }
      indexedPixels[p] = colorMap.get(key) ?? 0;
    });

    while (palette.length < 256) palette.push(0x000000);

    encoder.addFrame(0, 0, WIDTH, HEIGHT, indexedPixels, {
      palette,
      delay:       15,
      transparent: 0,
      disposal:    2,
    });
  }

  const gifBuffer = gifBuf.slice(0, encoder.end());

  const sticker = await new Sticker(gifBuffer, {
    type:    'full',
    pack:    global.packname || 'Luna-Bot',
    author:  global.author  || 'Bot',
    quality: 80
  }).toBuffer();

  await conn.sendMessage(m.chat, { sticker }, { quoted: m });
};

handler.help = ['attp2 <texto>'];
handler.tags = ['sticker'];
handler.command = ['attp', 'ttp3', 'ttp4'];
export default handler;