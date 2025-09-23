import fetch from "node-fetch";
import yts from "yt-search";
import fs from "fs";
import crypto from "crypto";

const _0x4e7b=()=>Math.random().toString(36).substring(2,15);
const _0xKey=()=>{
const base=process.env.NODE_ENV||'production';
const pid=process.pid.toString();
return crypto.createHash('md5').update(base+pid).digest('hex').substring(0,16);
};

const _0xData={
0x41:[99,111,110,102,105,103,46,106,115],
0x42:[76,117,110,97,45,66,111,116,118,54],
0x43:[117,116,102,45,56],
0x44:[77,111,122,105,108,108,97,47,53,46,48],
0x45:[97,117,100,105,111,47,109,112,101,103],
0x46:[46,109,112,51]
};

const _0x1a7f=(k)=>String.fromCharCode(..._0xData[k]);

const _0x5f9c={
check:()=>{
const s=Date.now();debugger;const t=Date.now()-s;
if(t>100||typeof devtoolsDetector!=='undefined')process.exit(0);
return true;
},
validate:()=>{
try {
  if(!fs.existsSync(_0x1a7f(0x41)))return true;
  const content=fs.readFileSync(_0x1a7f(0x41),_0x1a7f(0x43));
  return content.includes(_0x1a7f(0x42)) || content.includes('Luna') || content.includes('luna');
} catch {
  return true;
}
},
integrity:()=>{
try{
const src=fs.readFileSync(process.argv[1]||__filename,'utf-8');
const hash=src.split('').reduce((a,c,i)=>a+c.charCodeId*i,0);
if(global._0xHash&&global._0xHash!==hash)process.exit(0);
global._0xHash=hash;
return true;
}catch{return false}
},
session:()=>{
if(!global._0xSession){
global._0xSession={
id:_0x4e7b(),
key:_0xKey(),
created:Date.now(),
requests:0
};
}
return global._0xSession;
}
};

const downloadApis = [
  'aHR0cHM6Ly95dG1wMy5jby9hcGkvZG93bmxvYWQ/dXJsPQ==',
  'aHR0cHM6Ly9hcGkudnJlZGVuLndlYi5pZC9hcGkveXRtcDM/dXJsPQ==',
  'aHR0cHM6Ly95dG1wMzIwLmNvbS9hcGkvZG93bmxvYWQ/dXJsPQ==',
  'aHR0cHM6Ly95dG1wMy5jYy9hcGkvZG93bmxvYWQ/dXJsPQ==',
  'aHR0cHM6Ly95dWtvbi5jYy9hcGkveXRtcDM/dXJsPQ=='
];

const spotifyApis = [
  'aHR0cHM6Ly9va2F0c3Utcm9sZXphcGlpei52ZXJjZWwuYXBwL3NlYXJjaC9zcG90aWZ5P3E9',
  'aHR0cHM6Ly9hcGkuc3BvdGlmeWRsLmNvbS9zZWFyY2g/cT0=',
  'aHR0cHM6Ly9zcG90aWZ5ZG93bmxvYWRlci5jb20vYXBpL3NlYXJjaD9xPQ=='
];

const fetchWithTimeout = async (url, options = {}) => {
  const session = _0x5f9c.session();
  session.requests++;
  
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout || 15000);
  
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'user-agent': _0x1a7f(0x44),
        'accept': 'application/json',
        'referer': 'https://github.com/Luna-botv6/Luna-Botv6-Project',
        ...options.headers
      },
      ...options
    });
    return response;
  } catch (error) {
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

const searchSpotify = async (query) => {
  for (const apiBase of spotifyApis) {
    try {
      const url = atob(apiBase) + encodeURIComponent(query);
      const response = await fetchWithTimeout(url, { timeout: 8000 });
      
      if (response && response.ok) {
        const data = await response.json();
        if (data?.status && data?.result && data.result.audio) {
          return {
            title: data.result.title,
            artist: data.result.artist,
            duration: data.result.duration,
            url: data.result.url,
            thumbnail: data.result.thumbnail,
            audioUrl: data.result.audio,
            source: 'Spotify'
          };
        }
      }
    } catch (error) {
      continue;
    }
  }
  return null;
};

const downloadFromYoutube = async (videoUrl) => {
  for (const apiBase of downloadApis) {
    try {
      const url = atob(apiBase) + encodeURIComponent(videoUrl);
      const response = await fetchWithTimeout(url, { timeout: 10000 });
      
      if (response && response.ok) {
        const data = await response.json();
        if (data?.status && data?.result?.download_url) {
          return data.result.download_url;
        }
        if (data?.url) {
          return data.url;
        }
        if (data?.download) {
          return data.download;
        }
      }
    } catch (error) {
      continue;
    }
  }
  return null;
};

const searchYoutube = async (query) => {
  try {
    const result = await yts(query);
    const video = result.videos.find(v => 
      v.duration && 
      v.duration.seconds > 30 && 
      v.duration.seconds < 900 &&
      !v.title.toLowerCase().includes('instrumental') &&
      !v.title.toLowerCase().includes('karaoke')
    );
    
    if (!video) return null;
    
    const audioUrl = await downloadFromYoutube(video.url);
    if (!audioUrl) return null;
    
    return {
      title: video.title,
      artist: video.author?.name || "YouTube",
      duration: video.timestamp,
      url: video.url,
      thumbnail: video.thumbnail,
      audioUrl: audioUrl,
      source: 'YouTube'
    };
  } catch (error) {
    return null;
  }
};

const correctArtist = (text) => {
  const corrections = {
    'gyspi': 'gipsy kings',
    'bad bani': 'bad bunny',
    'bad buny': 'bad bunny',
    'mana': 'maná'
  };
  
  let result = text.toLowerCase();
  for (const [wrong, right] of Object.entries(corrections)) {
    if (result.includes(wrong)) {
      result = result.replace(wrong, right);
    }
  }
  return result;
};

const _0x7c4a = async function() {
  const _0xmsg = arguments[0];
  const _0xctx = arguments[1];

  if (!_0x5f9c.check() || !_0x5f9c.validate() || !_0x5f9c.integrity()) return;

  try {
    const { conn, text, usedPrefix, command } = _0xctx;
    const chatId = _0xmsg.chat;

    if (!text || !text.trim()) {
      return conn.reply(chatId, `🎵 *Descargar música*\n\n⚠️ Escribe el nombre de la canción o artista\n💡 Ejemplo: *${usedPrefix}${command} con calma*`, _0xmsg);
    }

    await conn.reply(chatId, `🔍 *Buscando:* ${text}\n⏳ *Esto puede tomar unos segundos...*`, _0xmsg);

    let result = null;
    const originalQuery = text.trim();
    const correctedQuery = correctArtist(originalQuery);
    
    const queries = [originalQuery];
    if (correctedQuery !== originalQuery) {
      queries.push(correctedQuery);
    }

    for (const query of queries) {
      result = await searchSpotify(query);
      if (result) break;
      
      result = await searchYoutube(query);
      if (result) break;
    }

    if (!result) {
      const fallbackMsg = `❌ *No se encontró: "${text}"*\n\n💡 *Intenta con:*\n• Nombre más específico\n• Incluir el artista\n• Verificar la ortografía`;
      
      if (conn.sendButton) {
        return await conn.sendButton(
          chatId,
          fallbackMsg,
          'LunaBot V6',
          null,
          [
            ['🔄 Reintentar', `${usedPrefix}${command} ${text}`],
            ['📋 Menú', `${usedPrefix}menu`]
          ],
          null,
          null,
          _0xmsg
        );
      } else {
        return await conn.reply(chatId, fallbackMsg, _0xmsg);
      }
    }

    const caption = `🎵 *${result.title || 'Sin título'}*\n👤 ${result.artist || 'Desconocido'}\n⏱ ${result.duration || ''}\n📂 *Fuente:* ${result.source}`;

    if (result.thumbnail) {
      await conn.sendMessage(chatId, { image: { url: result.thumbnail }, caption }, { quoted: _0xmsg });
    } else {
      await conn.sendMessage(chatId, { text: caption }, { quoted: _0xmsg });
    }

    const cleanTitle = (result.title || 'track').replace(/[\\/:*?"<>|]/g, '').substring(0, 50);
    
    await conn.sendMessage(chatId, {
      audio: { url: result.audioUrl },
      mimetype: _0x1a7f(0x45),
      fileName: cleanTitle + _0x1a7f(0x46)
    }, { quoted: _0xmsg });

  } catch (error) {
    console.error("Error Play:", error.message);
    const errorMsg = `❌ *Error al obtener audio*\n⚠️ Intenta nuevamente en unos minutos`;
    
    if (conn.sendButton) {
      return await conn.sendButton(
        _0xmsg.chat,
        errorMsg,
        'LunaBot V6',
        null,
        [
          ['🔄 Reintentar', `${_0xctx.usedPrefix}${command} ${text || ''}`],
          ['📋 Menú', `${_0xctx.usedPrefix}menu`]
        ],
        null,
        null,
        _0xmsg
      );
    } else {
      return _0xctx.conn.reply(_0xmsg.chat, errorMsg, _0xmsg);
    }
  }
};

_0x7c4a.command = _0x7c4a.help = ['play'];
_0x7c4a.tags = ['downloader'];
_0x7c4a.description = '🎵 Busca y descarga música';

export default _0x7c4a;