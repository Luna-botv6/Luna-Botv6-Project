import fs from 'fs';
import fetch from 'node-fetch';
import { Readable, PassThrough } from 'stream';
import ffmpeg from 'fluent-ffmpeg';
import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js';

const user = (a) => '@' + a.split('@')[0];
const _langCache = new Map();
const _audioCache = new Map();

function getLang(idioma) {
  if (_langCache.has(idioma)) return _langCache.get(idioma);
  const t = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`)).plugins.fun_tops;
  _langCache.set(idioma, t);
  return t;
}

function convertToOgg(mp3Buffer) {
  return new Promise((resolve, reject) => {
    const input = new Readable();
    input.push(mp3Buffer);
    input.push(null);
    const output = new PassThrough();
    const chunks = [];
    output.on('data', chunk => chunks.push(chunk));
    output.on('end', () => resolve(Buffer.concat(chunks)));
    output.on('error', reject);
    ffmpeg(input)
      .inputFormat('mp3')
      .audioCodec('libopus')
      .audioChannels(1)
      .audioFrequency(48000)
      .audioBitrate('128k')
      .outputOptions(['-application voip', '-frame_duration 20', '-packet_loss 0'])
      .format('ogg')
      .on('error', reject)
      .pipe(output);
  });
}

async function getAudio(url) {
  if (_audioCache.has(url)) return _audioCache.get(url);
  const res = await fetch(url);
  const mp3Buffer = Buffer.from(await res.arrayBuffer());
  const oggBuffer = await convertToOgg(mp3Buffer);
  _audioCache.set(url, oggBuffer);
  return oggBuffer;
}

const AUDIO_GAYS   = 'https://raw.githubusercontent.com/Luna-botv6/base-archivos/main/audio/01J673A5RN30C5EYPMKE5MR9XQ.mp3';
const AUDIO_OTAKUS = 'https://raw.githubusercontent.com/Luna-botv6/base-archivos/main/audio/01J67441AFAPG1YRQXDQ0VDTZB.mp3';

const handler = async (m, { conn, command }) => {
  const idioma = global.db?.data?.users?.[m.sender]?.language || global.defaultLenguaje;
  const t = getLang(idioma);

  const { participants } = await getGroupDataForPlugin(conn, m.chat, m.sender);
  const ps = (participants || [])
    .map(v => v.id)
    .filter(id => id && !id.includes('@lid'));

  if (ps.length < 10) return m.reply(t.pocos_miembros);

  const shuffled = [...ps].sort(() => Math.random() - 0.5);
  const picked = shuffled.slice(0, 10);

  const audioUrl = command === 'topgays' ? AUDIO_GAYS : AUDIO_OTAKUS;
  const titulo = command === 'topgays' ? t.texto1 : t.texto2;

  const top = titulo + '\n\n' + picked.map((p, i) => `*_${i + 1}.- ${user(p)}_*`).join('\n');

  await Promise.all([
    m.reply(top, null, { mentions: picked }),
    getAudio(audioUrl).then(ogg =>
      conn.sendMessage(m.chat, { audio: ogg, mimetype: 'audio/ogg; codecs=opus', ptt: true }, { quoted: m })
    )
  ]);
};

handler.help = ['topgays', 'topotakus'];
handler.command = ['topgays', 'topotakus'];
handler.tags = ['games'];
handler.group = true;
export default handler;
