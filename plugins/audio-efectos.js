import {unlinkSync, readFileSync} from 'fs';
import {join} from 'path';
import {exec} from 'child_process';
import fs from 'fs';

const handler = async (m, {conn, args, __dirname, usedPrefix, command}) => {
  const datas = global
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`))
  const tradutor = _translate.plugins.audio_efectos // <- CORREGIDO AQUÍ
  
  try {
    const q = m.quoted ? m.quoted : m;
    const mime = ((m.quoted ? m.quoted : m.msg).mimetype || '');
    let set;
    if (/bass/.test(command)) set = '-af equalizer=f=94:width_type=o:width=2:g=30';
    if (/blown/.test(command)) set = '-af acrusher=.1:1:64:0:log';
    if (/deep/.test(command)) set = '-af atempo=4/4,asetrate=44500*2/3';
    if (/earrape/.test(command)) set = '-af volume=12';
    if (/fast/.test(command)) set = '-filter:a "atempo=1.63,asetrate=44100"';
    if (/fat/.test(command)) set = '-filter:a "atempo=1.6,asetrate=22100"';
    if (/nightcore/.test(command)) set = '-filter:a atempo=1.06,asetrate=44100*1.25';
    if (/reverse/.test(command)) set = '-filter_complex "areverse"';
    if (/robot/.test(command)) set = '-filter_complex "afftfilt=real=\'hypot(re,im)*sin(0)\':imag=\'hypot(re,im)*cos(0)\':win_size=512:overlap=0.75"';
    if (/slow/.test(command)) set = '-filter:a "atempo=0.7,asetrate=44100"';
    if (/smooth/.test(command)) set = '-filter:v "minterpolate=\'mi_mode=mci:mc_mode=aobmc:vsbmc=1:fps=120\'"';
    if (/tupai|squirrel|chipmunk/.test(command)) set = '-filter:a "atempo=0.5,asetrate=65100"';
    
    if (/audio/.test(mime) || /ogg/.test(mime) || /opus/.test(mime)) {
      const ran = getRandom('.mp3');
      const filename = join(__dirname, '../src/tmp/' + ran);
      const media = await q.download(true);
      
      exec(`ffmpeg -i ${media} ${set} ${filename}`, async (err, stderr, stdout) => {
        await unlinkSync(media);
        
        if (err) {
          console.log('Error en FFmpeg:', err.message);
          throw `_*Error procesando audio*_`;
        }
        
        const buff = await readFileSync(filename);
        
        // Enviar audio procesado
        await conn.sendMessage(m.chat, {
          audio: buff,
          mimetype: 'audio/mp4',
          ptt: true,
          fileName: `audio_${command}.mp3`
        }, { quoted: m });
        
        // Limpiar archivo temporal
        try {
          await unlinkSync(filename);
        } catch (e) {
          // Silencioso - no importa si no se puede limpiar
        }
      });
    } else throw `${tradutor.texto1} ${usedPrefix + command}*`;
  } catch (e) {
    throw e;
  }
};

handler.help = ['bass', 'blown', 'deep', 'earrape', 'fast', 'fat', 'nightcore', 'reverse', 'robot', 'slow', 'smooth', 'tupai'].map((v) => v + ' [vn]');
handler.tags = ['audio'];
handler.command = /^(bass|blown|deep|earrape|fas?t|nightcore|reverse|robot|slow|smooth|tupai|squirrel|chipmunk)$/i;
export default handler;

const getRandom = (ext) => {
  return `${Math.floor(Math.random() * 10000)}${ext}`;
};
