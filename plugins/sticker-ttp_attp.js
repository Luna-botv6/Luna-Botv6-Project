import * as Jimp from 'jimp';
import omggif from 'omggif';
import fs from 'fs';

let Sticker;
import('wa-sticker-formatter').then(m => { Sticker = m.Sticker; }).catch(() => {});

const COLORS = [
  [0xff,0x32,0x32],[0xff,0x8c,0x00],[0xff,0xdc,0x00],
  [0x32,0xff,0x32],[0x00,0xb4,0xff],[0xb4,0x32,0xff],[0xff,0x32,0xb4]
];

const MENU = `🎨 *STICKERS ANIMADOS*
✏️ Escribe el comando + tu texto.

─────────────────
🌈 */attp*   — Cambia de colores
🏀 */ttp3*   — Rebota con colores
🔍 */ttp4*   — Zoom pulso
💥 */ttp5*   — Vibración shake
🌊 */ttp6*   — Ola de colores
👻 */ttp7*   — Aparece y desaparece
🔥 */ttp8*   — Glitch de colores
✍️ */ttp9*   — Escritura letra a letra
💡 */ttp10*  — Neón parpadeante
⬇️ */ttp11*  — Caída desde arriba
📈 */ttp12*  — Escala creciente
🎨 */ttp13*  — Arcoíris por letra
─────────────────
📌 *Ejemplo:* /ttp9 Hola mundo`;

const WIDTH = 256;
const HEIGHT = 256;

let _fontCache = null;


async function getFont() {
  if (!_fontCache) {
    _fontCache = await Jimp.loadFont(
      '/home/container/node_modules/@jimp/plugin-print/fonts/open-sans/open-sans-64-white/open-sans-64-white.fnt'
    );
  }
  return _fontCache;
}

async function createTextFrame(text, r, g, b, offsetX = 0, offsetY = 0) {
  const font = await getFont();
  const img = new Jimp.Jimp({ width: WIDTH, height: HEIGHT, color: 0x00000000 });

  const lines = [];
  const words = text.split(' ');
  let line = '';
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (Jimp.measureText(font, test) > WIDTH - 20) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);

  const lineH = 64;
  const totalH = lines.length * lineH;
  let startY = Math.floor((HEIGHT - totalH) / 2) + offsetY;

  for (const l of lines) {
    const lw = Jimp.measureText(font, l);
    const x = Math.floor((WIDTH - lw) / 2) + offsetX;
    img.print({ font, x, y: startY, text: l });
    startY += lineH;
  }

  img.scan((x, y, idx) => {
    const alpha = img.bitmap.data[idx + 3];
    if (alpha > 10) {
      img.bitmap.data[idx]     = r;
      img.bitmap.data[idx + 1] = g;
      img.bitmap.data[idx + 2] = b;
      img.bitmap.data[idx + 3] = 255;
    } else {
      img.bitmap.data[idx + 3] = 0;
    }
  });

  return img;
}

function encodeGIF(frames, delay = 15) {
  const buf = Buffer.alloc(WIDTH * HEIGHT * frames.length * 5 + 4096);
  const gif = new omggif.GifWriter(buf, WIDTH, HEIGHT, { loop: 0 });

  for (const frame of frames) {
    const palette = [0x000000];
    const colorMap = new Map();
    colorMap.set('transparent', 0);
    const pixels = new Uint8Array(WIDTH * HEIGHT);

    frame.scan((x, y, idx) => {
      const pi = y * WIDTH + x;
      const alpha = frame.bitmap.data[idx + 3];
      if (alpha < 10) {
        pixels[pi] = 0;
        return;
      }
      const rv = frame.bitmap.data[idx];
      const gv = frame.bitmap.data[idx + 1];
      const bv = frame.bitmap.data[idx + 2];
      const key = `${rv},${gv},${bv}`;
      if (!colorMap.has(key) && palette.length < 256) {
        colorMap.set(key, palette.length);
        palette.push((rv << 16) | (gv << 8) | bv);
      }
      pixels[pi] = colorMap.get(key) ?? 0;
    });

    while (palette.length < 256) palette.push(0);
    gif.addFrame(0, 0, WIDTH, HEIGHT, pixels, { palette, delay, transparent: 0, disposal: 2 });
  }

  return buf.slice(0, gif.end());
}

async function makeSticker(gifBuf) {
  return new Sticker(gifBuf, {
    type: 'full',
    pack: global.packname || 'Luna-Bot',
    author: global.author || 'Bot',
    quality: 50
  }).toBuffer();
}

async function effectColors(text) {
  const frames = [];
  for (const [r, g, b] of COLORS) frames.push(await createTextFrame(text, r, g, b));
  return encodeGIF(frames, 15);
}

async function effectBounce(text) {
  const frames = [];
  for (let i = 0; i < 14; i++) {
    const t = i / 14;
    const oy = Math.round(Math.sin(t * Math.PI * 2) * 40);
    const [r, g, b] = COLORS[Math.floor(t * COLORS.length) % COLORS.length];
    frames.push(await createTextFrame(text, r, g, b, 0, oy));
  }
  return encodeGIF(frames, 12);
}

async function effectZoom(text) {
  const frames = [];
  for (let i = 0; i < 14; i++) {
    const t = i / 14;
    const scale = 0.75 + Math.abs(Math.sin(t * Math.PI)) * 0.5;
    const [r, g, b] = COLORS[Math.floor(t * COLORS.length) % COLORS.length];
    const base = await createTextFrame(text, r, g, b);
    const resized = base.clone().resize({ w: Math.round(WIDTH * scale), h: Math.round(HEIGHT * scale) });
    const out = new Jimp.Jimp({ width: WIDTH, height: HEIGHT, color: 0x00000000 });
    out.composite(resized, Math.round((WIDTH - resized.bitmap.width) / 2), Math.round((HEIGHT - resized.bitmap.height) / 2));
    frames.push(out);
  }
  return encodeGIF(frames, 12);
}

async function effectShake(text) {
  const offsets = [[-8,0],[8,0],[0,-8],[0,8],[-6,-6],[6,6],[0,0],[-4,4],[4,-4],[0,0],[0,0],[0,0],[0,0],[0,0]];
  const frames = [];
  for (let i = 0; i < offsets.length; i++) {
    const [ox, oy] = offsets[i];
    const [r, g, b] = COLORS[i % COLORS.length];
    frames.push(await createTextFrame(text, r, g, b, ox, oy));
  }
  return encodeGIF(frames, 8);
}

async function effectWave(text) {
  const frames = [];
  for (let i = 0; i < 14; i++) {
    const t = i / 14;
    const ci = Math.floor(t * COLORS.length);
    const c1 = COLORS[ci % COLORS.length];
    const c2 = COLORS[(ci + 1) % COLORS.length];
    const f = (t * COLORS.length) % 1;
    const r = Math.round(c1[0] * (1 - f) + c2[0] * f);
    const g = Math.round(c1[1] * (1 - f) + c2[1] * f);
    const b = Math.round(c1[2] * (1 - f) + c2[2] * f);
    const oy = Math.round(Math.sin(t * Math.PI * 4) * 15);
    frames.push(await createTextFrame(text, r, g, b, 0, oy));
  }
  return encodeGIF(frames, 10);
}

async function effectFade(text) {
  const frames = [];
  for (let i = 0; i < 14; i++) {
    const t = i / 14;
    const alpha = Math.abs(Math.sin(t * Math.PI));
    const [r, g, b] = COLORS[Math.floor(t * COLORS.length) % COLORS.length];
    const frame = await createTextFrame(text, r, g, b);
    frame.scan((x, y, idx) => {
      if (frame.bitmap.data[idx + 3] > 10)
        frame.bitmap.data[idx + 3] = Math.max(1, Math.round(alpha * 255));
    });
    frames.push(frame);
  }
  return encodeGIF(frames, 12);
}

async function effectGlitch(text) {
  const glitchColors = [[255,0,0],[0,255,255],[0,255,0],[255,0,255],[0,0,255],[255,255,0],[255,255,255]];
  const frames = [];
  for (let i = 0; i < 14; i++) {
    const [r, g, b] = glitchColors[i % glitchColors.length];
    const ox = i % 3 === 0 ? (i % 6 === 0 ? 6 : -6) : 0;
    const oy = i % 4 === 0 ? (i % 8 === 0 ? 5 : -5) : 0;
    frames.push(await createTextFrame(text, r, g, b, ox, oy));
  }
  return encodeGIF(frames, 6);
}

async function effectTypewriter(text) {
  const frames = [];
  const chars = text.split('');
  const step = Math.max(1, Math.floor(chars.length / 12));
  for (let i = step; i <= chars.length; i += step) {
    const partial = text.slice(0, i);
    const ci = Math.floor((i / chars.length) * COLORS.length);
    const [r, g, b] = COLORS[ci % COLORS.length];
    frames.push(await createTextFrame(partial, r, g, b));
  }
  frames.push(await createTextFrame(text, 255, 255, 255));
  return encodeGIF(frames, 18);
}

async function effectNeon(text) {
  const neonColors = [[255,0,255],[255,50,255],[200,0,200],[255,100,255],[150,0,150],[255,0,200],[255,80,180]];
  const frames = [];
  for (let i = 0; i < 14; i++) {
    const bright = i % 2 === 0 ? 1 : 0.4;
    const [r, g, b] = neonColors[i % neonColors.length];
    frames.push(await createTextFrame(text, Math.round(r*bright), Math.round(g*bright), Math.round(b*bright)));
  }
  return encodeGIF(frames, 10);
}

async function effectFall(text) {
  const frames = [];
  for (let i = 0; i < 12; i++) {
    const t = i / 11;
    const ease = 1 - Math.pow(1 - t, 3);
    const oy = Math.round((1 - ease) * -HEIGHT / 2);
    const [r, g, b] = COLORS[Math.floor(t * COLORS.length) % COLORS.length];
    frames.push(await createTextFrame(text, r, g, b, 0, oy));
  }
  for (let i = 0; i < 4; i++) frames.push(await createTextFrame(text, 255, 220, 0));
  return encodeGIF(frames, 10);
}

async function effectScale(text) {
  const frames = [];
  for (let i = 0; i < 12; i++) {
    const t = i / 11;
    const scale = 0.2 + t * 0.8;
    const [r, g, b] = COLORS[Math.floor(t * COLORS.length) % COLORS.length];
    const base = await createTextFrame(text, r, g, b);
    const resized = base.clone().resize({ w: Math.round(WIDTH * scale), h: Math.round(HEIGHT * scale) });
    const out = new Jimp.Jimp({ width: WIDTH, height: HEIGHT, color: 0x00000000 });
    out.composite(resized, Math.round((WIDTH - resized.bitmap.width) / 2), Math.round((HEIGHT - resized.bitmap.height) / 2));
    frames.push(out);
  }
  for (let i = 0; i < 3; i++) frames.push(await createTextFrame(text, 255, 255, 255));
  return encodeGIF(frames, 10);
}

async function effectRainbowLetters(text) {
  const font = await getFont();
  const frames = [];
  for (let frame = 0; frame < 10; frame++) {
    const img = new Jimp.Jimp({ width: WIDTH, height: HEIGHT, color: 0x00000000 });
    const lines = [];
    const words = text.split(' ');
    let line = '';
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (Jimp.measureText(font, test) > WIDTH - 20) {
        if (line) lines.push(line);
        line = word;
      } else line = test;
    }
    if (line) lines.push(line);

    const lineH = 64;
    const totalH = lines.length * lineH;
    let startY = Math.floor((HEIGHT - totalH) / 2);
    let charIdx = 0;

    for (const l of lines) {
      const lw = Jimp.measureText(font, l);
      let curX = Math.floor((WIDTH - lw) / 2);
      for (const ch of l.split('')) {
        const [r, g, b] = COLORS[(charIdx + frame) % COLORS.length];
        const tmp = new Jimp.Jimp({ width: WIDTH, height: HEIGHT, color: 0x00000000 });
        tmp.print({ font, x: 0, y: 0, text: ch });
        tmp.scan((x, y, idx) => {
          if (tmp.bitmap.data[idx + 3] > 10) {
            tmp.bitmap.data[idx]     = r;
            tmp.bitmap.data[idx + 1] = g;
            tmp.bitmap.data[idx + 2] = b;
            tmp.bitmap.data[idx + 3] = 255;
          }
        });
        const cw = Jimp.measureText(font, ch) || 20;
        const cropped = tmp.clone().crop({ x: 0, y: 0, w: cw, h: lineH });
        img.composite(cropped, curX, startY);
        curX += cw;
        charIdx++;
      }
      charIdx++;
      startY += lineH;
    }
    frames.push(img);
  }
  return encodeGIF(frames, 14);
}

const EFFECTS = {
  attp: effectColors, attp2: effectColors,
  ttp3: effectBounce, ttp4: effectZoom, ttp5: effectShake,
  ttp6: effectWave, ttp7: effectFade, ttp8: effectGlitch,
  ttp9: effectTypewriter, ttp10: effectNeon, ttp11: effectFall,
  ttp12: effectScale, ttp13: effectRainbowLetters
};

const handler = async (m, { conn, text, command }) => {
  const cmd = command.toLowerCase();
  if (!text) return m.reply(MENU);
  m.reply('⏳ Generando sticker animado...');
  try {
    const gifBuf = await EFFECTS[cmd](text);
    const sticker = await makeSticker(gifBuf);
    await conn.sendMessage(m.chat, { sticker }, { quoted: m });
  } catch (e) {
  console.error(e);
  m.reply(`❌ Error:\n${e.stack}`);
}
    };


handler.help = ['attp <texto>'];
handler.tags = ['sticker'];
handler.command = Object.keys(EFFECTS);
export default handler;