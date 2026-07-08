import { readFileSync } from 'fs';
import * as googleTTS from '@sefinek/google-tts-api';
import axios from 'axios';
import { mp3BufferToOggOpus } from '../lib/funcion/ttsHelper.js';

const defaultLang = 'es';

const handler = async (m, { conn, args, usedPrefix, command }) => {
  const datas = global;
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje;
  const _translate = JSON.parse(readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.convertidor_tts;

  let lang = args[0];
  let text = args.slice(1).join(' ');
  if ((args[0] || '').length !== 2) {
    lang = defaultLang;
    text = args.join(' ');
  }
  if (!text && m.quoted?.text) text = m.quoted.text;

  let oggBuffer;
  try {
    const url = googleTTS.getAudioUrl(text, { lang: lang || 'es', slow: false, host: 'https://translate.google.com' });
    const { data } = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
      }
    });
    oggBuffer = await mp3BufferToOggOpus(Buffer.from(data));
  } catch (e) {
    m.reply(e + '');
    text = args.join(' ');
    if (!text) throw `*${tradutor.texto1[0]} ${usedPrefix + command} ${tradutor.texto1[1]}*`;
    try {
      const url = googleTTS.getAudioUrl(text, { lang: defaultLang, slow: false, host: 'https://translate.google.com' });
      const { data } = await axios.get(url, {
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
        }
      });
      oggBuffer = await mp3BufferToOggOpus(Buffer.from(data));
    } catch (e2) {
      // Se mantiene sin audio; el finally de abajo simplemente no manda nada.
    }
  } finally {
    if (oggBuffer) {
      conn.sendPresenceUpdate('recording', m.chat);
      conn.sendMessage(m.chat, { audio: oggBuffer, fileName: 'tts.ogg', mimetype: 'audio/ogg; codecs=opus', ptt: true }, { quoted: m });
    }
  }
};

handler.help = ['tts <lang> <teks>'];
handler.tags = ['tools'];
handler.command = /^g?tts$/i;

export default handler;
