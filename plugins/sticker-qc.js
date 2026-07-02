import { sticker } from '../src/libraries/sticker.js';
import axios from 'axios';
import fs from 'fs';

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
      console.error('[sticker-qc] API response missing image:', json?.data);
      return m.reply(tradutor.texto4);
    }

    const imageBuffer = Buffer.from(json.data.result.image, 'base64');
    // request a slightly larger sticker size (targetSize)
    const stikerBuffer = await sticker(imageBuffer, false, global.packname, global.author, { targetSize: 720 });

    if (!stikerBuffer || !(stikerBuffer instanceof Buffer)) {
      console.error('[sticker-qc] sticker conversion invalid result:', stikerBuffer);
      return m.reply(tradutor.texto4);
    }

    await conn.sendMessage(m.chat, { sticker: stikerBuffer }, { quoted: m });
  } catch (e) {
    const errorDetails = e?.response?.data ?? e?.message ?? e;
    console.error('[sticker-qc] error:', errorDetails);
    if (e?.code === 'ECONNABORTED') return m.reply(tradutor.texto5);
    return m.reply(tradutor.texto4);
  }
};

handler.help = ['qc'];
handler.tags = ['sticker'];
handler.command = /^(qc)$/i;

export default handler;
