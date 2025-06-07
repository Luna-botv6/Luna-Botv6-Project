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
    // API 1: ytmp3 principal
    try {
      const audiodlp = await ytmp3(video.url);
      conn.sendMessage(m.chat, { audio: audiodlp, mimetype: 'audio/mpeg' }, { quoted: m });
      return;
    } catch (e1) {
      console.log('API Audio 1 falló:', e1.message);
    }

    // API 2: ogmp3 con calidad
    try {
      const [input, quality = '320'] = text.split(' ');
      const validQualities = ['64', '96', '128', '192', '256', '320'];
      const selectedQuality = validQualities.includes(quality) ? quality : '320';
      const res = await ogmp3.download(video.url, selectedQuality, 'audio');
      if (res && res.result && res.result.download) {
        await conn.sendMessage(m.chat, { audio: { url: res.result.download }, mimetype: 'audio/mpeg', fileName: `audio.mp3` }, { quoted: m });
        return;
      }
    } catch (e2) {
      console.log('API Audio 2 falló:', e2.message);
    }

    // API 3: siputzx
    try {
      const res = await fetch(`https://api.siputzx.my.id/api/d/ytmp3?url=${video.url}`);
      if (res.ok) {
        let { data } = await res.json();
        if (data && data.dl) {
          await conn.sendMessage(m.chat, { audio: { url: data.dl }, mimetype: 'audio/mpeg' }, { quoted: m });
          return;
        }
      }
    } catch (e3) {
      console.log('API Audio 3 falló:', e3.message);
    }

    // API 4: agatz
    try {
      const res = await fetch(`https://api.agatz.xyz/api/ytmp3?url=${video.url}`);
      if (res.ok) {
        let data = await res.json();
        if (data && data.data && data.data.downloadUrl) {
          await conn.sendMessage(m.chat, { audio: { url: data.data.downloadUrl }, mimetype: 'audio/mpeg' }, { quoted: m });
          return;
        }
      }
    } catch (e4) {
      console.log('API Audio 4 falló:', e4.message);
    }

    // API 5: skynex (última opción)
    try {
      const apidownload = await axios.get(`https://skynex.boxmine.xyz/docs/download/ytmp3?url=https://youtube.com/watch?v=${video.videoId}&apikey=GataDios`);
      if (apidownload.data && apidownload.data.data && apidownload.data.data.download) {
        const responsev2 = apidownload.data.data.download;
        await conn.sendMessage(m.chat, { audio: { url: responsev2 }, mimetype: 'audio/mpeg' }, { quoted: m });
        return;
      }
    } catch (e5) {
      console.log('API Audio 5 falló:', e5.message);
    }

    // Si todas las APIs fallan
    conn.reply(m.chat, `[ ❌️ ] *Error al descargar audio*\n\n🔄 *Todas las APIs están temporalmente fuera de servicio*\n⏰ *Intenta nuevamente en unos minutos*`, m);
  }

  if (command === 'ytmp4') {
    // API 1: ytmp4 principal
    try {
      const videoUrl = await ytmp4(video.url);
      await conn.sendMessage(m.chat, { video: { url: videoUrl }, fileName: `video.mp4`, mimetype: 'video/mp4', caption: `${video.title}` }, { quoted: m });
      return;
    } catch (e1) {
      console.log('API Video 1 falló:', e1.message);
    }

    // API 2: cobalt.tools (Nueva API confiable)
    try {
      const cobaltRes = await fetch('https://co.wuk.sh/api/json', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: video.url,
          vQuality: '720'
        })
      });
      
      if (cobaltRes.ok) {
        const cobaltData = await cobaltRes.json();
        if (cobaltData.status === 'redirect' && cobaltData.url) {
          await conn.sendMessage(m.chat, { 
            video: { url: cobaltData.url }, 
            fileName: `${video.title}.mp4`, 
            mimetype: 'video/mp4', 
            caption: `${video.title}` 
          }, { quoted: m });
          return;
        }
      }
    } catch (e2) {
      console.log('API Video 2 (Cobalt) falló:', e2.message);
    }

    // API 3: y2mate alternativa
    try {
      const y2mateRes = await fetch(`https://www.y2mate.com/mates/en68/analyze/ajax`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `url=${encodeURIComponent(video.url)}&q_auto=1&ajax=1`
      });
      
      if (y2mateRes.ok) {
        const y2mateData = await y2mateRes.json();
        if (y2mateData.status === 'ok' && y2mateData.links?.mp4?.['360']?.url) {
          await conn.sendMessage(m.chat, { 
            video: { url: y2mateData.links.mp4['360'].url }, 
            fileName: `${video.title}.mp4`, 
            caption: `${video.title}` 
          }, { quoted: m });
          return;
        }
      }
    } catch (e3) {
      console.log('API Video 3 (Y2mate) falló:', e3.message);
    }

    // API 4: savetube
    try {
      const savetubeRes = await fetch(`https://savetube.me/api/v1/telechargement-video/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: video.url })
      });
      
      if (savetubeRes.ok) {
        const savetubeData = await savetubeRes.json();
        if (savetubeData.success && savetubeData.data?.formats?.length > 0) {
          const mp4Format = savetubeData.data.formats.find(f => f.ext === 'mp4');
          if (mp4Format?.url) {
            await conn.sendMessage(m.chat, { 
              video: { url: mp4Format.url }, 
              fileName: `${video.title}.mp4`, 
              caption: `${video.title}` 
            }, { quoted: m });
            return;
          }
        }
      }
    } catch (e4) {
      console.log('API Video 4 (Savetube) falló:', e4.message);
    }

    // API 5: siputzx
    try {
      const res = await fetch(`https://api.siputzx.my.id/api/d/ytmp4?url=${video.url}`);
      if (res.ok) {
        let { data } = await res.json();
        if (data && data.dl) {
          await conn.sendMessage(m.chat, { video: { url: data.dl }, fileName: `video.mp4`, mimetype: 'video/mp4', caption: `${video.title}` }, { quoted: m });
          return;
        }
      }
    } catch (e5) {
      console.log('API Video 5 (Siputzx) falló:', e5.message);
    }

    // API 6: agatz
    try {
      const res = await fetch(`https://api.agatz.xyz/api/ytmp4?url=${video.url}`);
      if (res.ok) {
        let data = await res.json();
        if (data && data.data && data.data.downloadUrl) {
          await conn.sendMessage(m.chat, { video: { url: data.data.downloadUrl }, fileName: `video.mp4`, caption: `${video.title}` }, { quoted: m });
          return;
        }
      }
    } catch (e6) {
      console.log('API Video 6 (Agatz) falló:', e6.message);
    }

    // API 7: zenkey
    try {
      const res = await fetch(`https://api.zenkey.my.id/api/download/ytmp4?apikey=zenkey&url=${video.url}`);
      if (res.ok) {
        let { result } = await res.json();
        if (result && result.download && result.download.url) {
          await conn.sendMessage(m.chat, { video: { url: result.download.url }, fileName: `video.mp4`, caption: `${video.title}` }, { quoted: m });
          return;
        }
      }
    } catch (e7) {
      console.log('API Video 7 (Zenkey) falló:', e7.message);
    }

    // API 8: axeel
    try {
      const axeelApi = `https://axeel.my.id/api/download/video?url=${video.url}`;
      const axeelRes = await fetch(axeelApi);
      if (axeelRes.ok) {
        const axeelJson = await axeelRes.json();
        if (axeelJson && axeelJson.downloads?.url) {
          const videoUrl = axeelJson.downloads.url;
          await conn.sendMessage(m.chat, { video: { url: videoUrl }, fileName: `${video.title}.mp4`, caption: `${video.title}` }, { quoted: m });
          return;
        }
      }
    } catch (e8) {
      console.log('API Video 8 (Axeel) falló:', e8.message);
    }

    // API 9: ytdl-core alternativa
    try {
      const ytdlRes = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${video.videoId}`)}`);
      if (ytdlRes.ok) {
        // Esta es una implementación básica, necesitarías procesar la respuesta HTML
        // para extraer los enlaces de descarga directa
      }
    } catch (e9) {
      console.log('API Video 9 (YTDL) falló:', e9.message);
    }

    // API 10: skynex (última opción)
    try {
      const apidownload = await axios.get(`https://skynex.boxmine.xyz/docs/download/ytmp4?url=https://youtube.com/watch?v=${video.videoId}&apikey=GataDios`);
      if (apidownload.data && apidownload.data.data && apidownload.data.data.download) {
        const responsev2 = apidownload.data.data.download;
        await conn.sendMessage(m.chat, { video: { url: responsev2 }, mimetype: 'video/mp4', caption: `${video.title}` }, { quoted: m });
        return;
      }
    } catch (e10) {
      console.log('API Video 10 (Skynex) falló:', e10.message);
    }

    // API 11: Backup con yt-dlp via web service
    try {
      const ytdlpRes = await fetch(`https://api.cobalt.tools/api/json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: video.url,
          vQuality: 'max'
        })
      });
      
      if (ytdlpRes.ok) {
        const ytdlpData = await ytdlpRes.json();
        if (ytdlpData.status === 'redirect') {
          await conn.sendMessage(m.chat, { 
            video: { url: ytdlpData.url }, 
            fileName: `${video.title}.mp4`, 
            caption: `${video.title}` 
          }, { quoted: m });
          return;
        }
      }
    } catch (e11) {
      console.log('API Video 11 (YT-DLP) falló:', e11.message);
    }

    // Si todas las APIs fallan
    conn.reply(m.chat, `[ ❌️ ] *Error al descargar video*\n\n🔄 *Todas las APIs están temporalmente fuera de servicio*\n⏰ *Intenta nuevamente en unos minutos*\n💡 *Tip: Puedes descargar solo el audio mientras tanto*\n\n*APIs probadas:* 11 servicios diferentes\n*Sugerencia:* Es posible que el video tenga restricciones de descarga`, m);
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
