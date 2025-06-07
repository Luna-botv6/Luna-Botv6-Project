import fetch from 'node-fetch';
import axios from 'axios';
import yts from 'yt-search';
import { ogmp3 } from '../src/libraries/youtubedl.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { ytmp3, ytmp4 } = require('@hiudyy/ytdl');
import fs from 'fs';

let handler = async (m, { conn, args, text, usedPrefix, command }) => {
  const datas = global;
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.descargas_play;

  if (!text) throw `${tradutor.texto1[0]} ${usedPrefix + command} ${tradutor.texto1[1]}`;

  const yt_play = await search(args.join(' '));
  const video = yt_play[0];

  // Si es el comando 'play' sin especificar formato, mostrar botones
  if (command === 'play') {
    const texto1 = `*🎵 Música Encontrada*\n\n● *Título:* ${video.title}\n● *Publicado:* ${video.ago}\n● *Duración:* ${secondString(video.duration.seconds)}\n● *Vistas:* ${MilesNumber(video.views)}\n● *Autor:* ${video.author.name}\n● *Link:* ${video.url.replace(/^https?:\/\//, '')}\n\n*¿En qué formato deseas descargar?* 🤔`.trim();

    return await conn.sendButton(
      m.chat,
      texto1,
      'LunaBot V6 - Descargas YouTube',
      video.thumbnail,
      [
        ['🎵 Descargar Audio', `${usedPrefix}ytmp3 ${video.url}`],
        ['🎬 Descargar Video', `${usedPrefix}ytmp4 ${video.url}`]
      ],
      null,
      null,
      m
    );
  }

  let additionalText = '';
  if (['ytmp3'].includes(command)) {
    additionalText = 'audio';
  } else if (['ytmp4'].includes(command)) {
    additionalText = 'vídeo';
  }

  const texto1 = `*◉ Descargas de YouTube*\n\n● *Título:* ${video.title}\n● *Publicado:* ${video.ago}\n● *Duración:* ${secondString(video.duration.seconds)}\n● *Vistas:* ${MilesNumber(video.views)}\n● *Autor:* ${video.author.name}\n● *Link:* ${video.url.replace(/^https?:\/\//, '')}\n\n> *_Enviando ${additionalText}, aguarde un momento．．．_*`.trim();

  conn.sendMessage(m.chat, { image: { url: video.thumbnail }, caption: texto1 }, { quoted: m });

  if (command === 'ytmp3') {
    try {
      const audiodlp = await ytmp3(video.url);
      conn.sendMessage(m.chat, { audio: audiodlp, mimetype: 'audio/mpeg' }, { quoted: m });
    } catch {
      try {
        const [input, quality = '320'] = text.split(' ');
        const validQualities = ['64', '96', '128', '192', '256', '320'];
        const selectedQuality = validQualities.includes(quality) ? quality : '320';
        const res = await ogmp3.download(video.url, selectedQuality, 'audio');
        await conn.sendMessage(m.chat, { audio: { url: res.result.download }, mimetype: 'audio/mpeg', fileName: `audio.mp3` }, { quoted: m });
      } catch {
        try {
          const res = await fetch(`https://api.siputzx.my.id/api/d/ytmp3?url=${video.url}`);
          let { data } = await res.json();
          await conn.sendMessage(m.chat, { audio: { url: data.dl }, mimetype: 'audio/mpeg' }, { quoted: m });
        } catch {
          try {
            const res = await fetch(`https://api.agatz.xyz/api/ytmp3?url=${video.url}`);
            let data = await res.json();
            await conn.sendMessage(m.chat, { audio: { url: data.data.downloadUrl }, mimetype: 'audio/mpeg' }, { quoted: m });
          } catch {
            try {
              const apidownload = await axios.get(`https://skynex.boxmine.xyz/docs/download/ytmp3?url=https://youtube.com/watch?v=${video.videoId}&apikey=GataDios`);
              const responsev2 = await apidownload.data.data.download;
              await conn.sendMessage(m.chat, { audio: { url: responsev2 }, mimetype: 'audio/mpeg' }, { quoted: m });
            } catch (e) {
              conn.reply(m.chat, `[ ❌️ ] Ocurrió un fallo al procesar su solicitud\n\n${e}`, m);
            }
          }
        }
      }
    }
  }

  if (command === 'ytmp4') {
    try {
      const videoUrl = await ytmp4(video.url);
      await conn.sendMessage(m.chat, { video: { url: videoUrl }, fileName: `video.mp4`, mimetype: 'video/mp4', caption: `${video.title}` }, { quoted: m });
    } catch {
      try {
        const res = await fetch(`https://api.siputzx.my.id/api/d/ytmp4?url=${video.url}`);
        let { data } = await res.json();
        await conn.sendMessage(m.chat, { video: { url: data.dl }, fileName: `video.mp4`, mimetype: 'video/mp4', caption: `${video.title}` }, { quoted: m });
      } catch {
        try {
          const res = await fetch(`https://api.agatz.xyz/api/ytmp4?url=${video.url}`);
          let data = await res.json();
          await conn.sendMessage(m.chat, { video: { url: data.data.downloadUrl }, fileName: `video.mp4`, caption: `${video.title}` }, { quoted: m });
        } catch {
          try {
            const res = await fetch(`https://api.zenkey.my.id/api/download/ytmp4?apikey=zenkey&url=${video.url}`);
            let { result } = await res.json();
            await conn.sendMessage(m.chat, { video: { url: result.download.url }, fileName: `video.mp4`, caption: `${video.title}` }, { quoted: m });
          } catch {
            try {
              const axeelApi = `https://axeel.my.id/api/download/video?url=${video.url}`;
              const axeelRes = await fetch(axeelApi);
              const axeelJson = await axeelRes.json();
              if (axeelJson && axeelJson.downloads?.url) {
                const videoUrl = axeelJson.downloads.url;
                await conn.sendMessage(m.chat, { video: { url: videoUrl }, fileName: `${video.title}.mp4`, caption: `${video.title}` }, { quoted: m });
              }
            } catch {
              try {
                const apidownload = await axios.get(`https://skynex.boxmine.xyz/docs/download/ytmp4?url=https://youtube.com/watch?v=${video.videoId}&apikey=GataDios`);
                const responsev2 = await apidownload.data.data.download;
                await conn.sendMessage(m.chat, { video: { url: responsev2 }, mimetype: 'video/mp4' }, { quoted: m });
              } catch (e) {
                conn.reply(m.chat, `[ ❌️ ] Ocurrió un fallo al procesar su solicitud\n\n${e}`, m);
              }
            }
          }
        }
      }
    }
  }
};

handler.command = ['play', 'ytmp3', 'ytmp4'];

export default handler;

async function search(query, options = {}) {
  const search = await yts.search({ query, hl: 'es', gl: 'ES', ...options });
  return search.videos;
}

function MilesNumber(number) {
  const exp = /(\d)(?=(\d{3})+(?!\d))/g;
  const rep = '$1.';
  const arr = number.toString().split('.');
  arr[0] = arr[0].replace(exp, rep);
  return arr[1] ? arr.join('.') : arr[0];
}

function secondString(seconds) {
  seconds = Number(seconds);
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const dDisplay = d > 0 ? d + (d == 1 ? ' día, ' : ' días, ') : '';
  const hDisplay = h > 0 ? h + (h == 1 ? ' hora, ' : ' horas, ') : '';
  const mDisplay = m > 0 ? m + (m == 1 ? ' minuto, ' : ' minutos, ') : '';
  const sDisplay = s > 0 ? s + (s == 1 ? ' segundo' : ' segundos') : '';
  return dDisplay + hDisplay + mDisplay + sDisplay;
}
