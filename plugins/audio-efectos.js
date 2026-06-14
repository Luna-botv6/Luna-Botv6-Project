import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const TMP_DIR = './src/tmp';

const getRandom = (ext) => `${Date.now()}_${Math.floor(Math.random() * 10000)}${ext}`;

const EFFECTS = {
  bass:      ['-af', 'equalizer=f=94:width_type=o:width=2:g=30'],
  blown:     ['-af', 'acrusher=.1:1:64:0:log'],
  deep:      ['-af', 'atempo=4/4,asetrate=44500*2/3'],
  earrape:   ['-af', 'volume=12'],
  fast:      ['-af', 'atempo=1.63,asetrate=44100'],
  fat:       ['-af', 'atempo=1.6,asetrate=22100'],
  nightcore: ['-af', 'atempo=1.06,asetrate=55125'],
  reverse:   ['-filter_complex', 'areverse'],
  robot:     ['-filter_complex', 'afftfilt=real=\'hypot(re,im)*sin(0)\':imag=\'hypot(re,im)*cos(0)\':win_size=512:overlap=0.75'],
  slow:      ['-af', 'atempo=0.7,asetrate=44100'],
  tupai:     ['-af', 'atempo=0.5,asetrate=65100'],
  squirrel:  ['-af', 'atempo=0.5,asetrate=65100'],
  chipmunk:  ['-af', 'atempo=0.5,asetrate=65100'],
};

const handler = async (m, { conn, usedPrefix, command }) => {
  const idioma = global.db.data.users[m.sender]?.language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.audio_efectos;

  const q = m.quoted ? m.quoted : m;
  const mime = (q.mimetype || q.msg?.mimetype || '');

  if (!/audio|ogg|opus/i.test(mime)) {
    return m.reply(`${tradutor.texto1} ${usedPrefix}${command}`);
  }

  const effect = EFFECTS[command.toLowerCase()];
  if (!effect) return m.reply(tradutor.texto2);

  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

  const inputPath  = path.join(TMP_DIR, getRandom('.ogg'));
  const outputPath = path.join(TMP_DIR, getRandom('.ogg'));

  try {
    const mediaBuffer = await conn.downloadM(q, 'audio', false);
    fs.writeFileSync(inputPath, mediaBuffer);

    await execFileAsync('ffmpeg', [
      '-y',
      '-i', inputPath,
      ...effect,
      '-vn',
      '-c:a', 'libopus',
      '-b:a', '128k',
      '-f', 'ogg',
      outputPath
    ]);

    const buff = fs.readFileSync(outputPath);

    await conn.sendMessage(m.chat, {
      audio: buff,
      mimetype: 'audio/ogg; codecs=opus',
      ptt: true,
      fileName: `${command}.ogg`
    }, { quoted: m });

  } catch (e) {
    console.error('[audio-efectos]', e.message);
    await m.reply(tradutor.texto2);
  } finally {
    for (const f of [inputPath, outputPath]) {
      try { fs.unlinkSync(f); } catch {}
    }
  }
};

handler.help = Object.keys(EFFECTS).filter((v, i, a) => a.indexOf(v) === i).map(v => `${v} [audio]`);
handler.tags = ['audio'];
handler.command = /^(bass|blown|deep|earrape|fast|fat|nightcore|reverse|robot|slow|tupai|squirrel|chipmunk)$/i;

export default handler;
