import { sticker } from '../src/libraries/sticker.js';
import axios from 'axios';
import fs from 'fs';
import { spawn } from 'child_process';

function padToSquare(buffer) {
  return new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', [
      '-y', '-i', 'pipe:0',
      '-vf', 'format=rgba,pad=max(iw\\,ih):max(iw\\,ih):(ow-iw)/2:(oh-ih)/2:color=white@0.0',
      '-c:v', 'png',
      '-pix_fmt', 'rgba',
      '-f', 'image2', 'pipe:1'
    ])
    const bufs = []
    const errBufs = []
    ff.stdout.on('data', chunk => bufs.push(chunk))
    ff.stderr.on('data', chunk => errBufs.push(chunk))
    ff.on('error', reject)
    ff.on('close', async code => {
      const stderrText = Buffer.concat(errBufs).toString()
      if (code !== 0) return reject(new Error('padToSquare ffmpeg exit ' + code + ': ' + stderrText.slice(-500)))
      const result = Buffer.concat(bufs)
      try {
        await fs.promises.writeFile('./tmp/qc-debug-padded.png', result)
      } catch (e) {}
      resolve(result)
    })
    ff.stdin.write(buffer)
    ff.stdin.end()
  })
}

const handler = async (m, { conn, args }) => {
  const idioma = global.db.data.users[m.sender]?.language || global.defaultLenguaje;
  let _t = {};
  try {
    const _lang = idioma || global.defaultLenguaje || 'es';
    _t = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${_lang}.json`, 'utf8'));
  } catch {
    try { _t = JSON.parse(fs.readFileSync('./src/lunaidiomas/es.json', 'utf8')); } catch {}
  }
  const tradutor = _t.plugins.sticker_qc || {
    texto1: '❌ Texto no proporcionado.',
    texto2: '❌ Texto inválido.',
    texto3: '❌ Texto demasiado largo.',
    texto4: '❌ No se pudo generar el sticker. Intenta de nuevo.',
    texto5: '❌ Tiempo de espera agotado al crear el sticker.'
  };

  let text;

  if (args.length >= 1) {
    text = args.slice(0).join(' ');
  } else if (m.quoted && m.quoted.text) {
    text = m.quoted.text;
  } else throw tradutor.texto1;

  if (!text) return m.reply(tradutor.texto2);

  const who = m.mentionedJid && m.mentionedJid[0]
    ? m.mentionedJid[0]
    : m.fromMe
      ? conn.user.jid
      : m.sender;

  const mentionRegex = new RegExp(
    `@${who.split('@')[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`,
    'g'
  );

  const mishi = text.replace(mentionRegex, '').trim();

  if (!mishi) return m.reply(tradutor.texto2);
  if (mishi.length > 100) return m.reply(tradutor.texto3);

  const fallbackPp = 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png';
  let ppBase64 = fallbackPp;

  try {
    const ppUrl = await conn.profilePictureUrl(who, 'image');
    const res = await axios.get(ppUrl, { responseType: 'arraybuffer', timeout: 5000 });
    ppBase64 = `data:image/jpeg;base64,${Buffer.from(res.data).toString('base64')}`;
  } catch {
    try {
      const res = await axios.get(fallbackPp, { responseType: 'arraybuffer', timeout: 5000 });
      ppBase64 = `data:image/jpeg;base64,${Buffer.from(res.data).toString('base64')}`;
    } catch {}
  }

  let nombre;
  try { nombre = await conn.getName(who); } catch {}
  const safeName = typeof nombre === 'string' && nombre.length > 0 ? nombre : 'Usuario';

  const obj = {
    type: 'quote',
    format: 'png',
    backgroundColor: '#000000',
    width: 720,
    height: 1080,
    scale: 2,
    messages: [
      {
        entities: [],
        avatar: true,
        from: {
          id: 1,
          name: safeName,
          photo: { url: ppBase64 }
        },
        text: mishi,
        replyMessage: {}
      }
    ]
  };

  try {
    const json = await axios.post(
      'https://quote.yuri.ly/generate',
      obj,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000
      }
    );

    if (!json?.data?.result?.image) {
      return m.reply(tradutor.texto4);
    }

    const imageBuffer = Buffer.from(json.data.result.image, 'base64');
    const squaredBuffer = await padToSquare(imageBuffer);
    const stikerBuffer = await sticker(squaredBuffer, false, global.packname, global.author, { targetSize: 720 });

    try {
      await fs.promises.writeFile('./tmp/qc-debug-final.webp', stikerBuffer);
    } catch (e) {}

    if (!stikerBuffer || !(stikerBuffer instanceof Buffer)) {
      return m.reply(tradutor.texto4);
    }

    await conn.sendMessage(m.chat, { sticker: stikerBuffer }, { quoted: m });
  } catch (e) {
    if (e?.code === 'ECONNABORTED') return m.reply(tradutor.texto5);
    return m.reply(tradutor.texto4);
  }
};

handler.help = ['qc'];
handler.tags = ['sticker'];
handler.command = /^(qc)$/i;

export default handler;
