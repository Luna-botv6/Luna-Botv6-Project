import fetch from "node-fetch";
import yts from 'yt-search';

const youtubeRegexID = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([a-zA-Z0-9_-]{11})/;

const handler = async (m, { conn, text, usedPrefix, command }) => {
  try {
    if (!text.trim()) {
      return conn.reply(m.chat, 
        `🎵 *YouTube Downloader*\n\n` +
        `⚠️ Escribe el nombre de la música\n` +
        `💡 Ejemplo: *${usedPrefix}${command} ozuna el mar*`, m);
    }

    let videoIdToFind = text.match(youtubeRegexID) || null;
    let searchResults = await yts(videoIdToFind === null ? text : 'https://youtu.be/' + videoIdToFind[1]);

    if (videoIdToFind) {
      const videoId = videoIdToFind[1];  
      searchResults = searchResults.all.find(item => item.videoId === videoId) || 
                     searchResults.videos.find(item => item.videoId === videoId);
    } 
    
    searchResults = searchResults.all?.[0] || searchResults.videos?.[0] || searchResults;  
    
    if (!searchResults || searchResults.length == 0) {
      return conn.reply(m.chat,
        `❌ *Sin resultados*\n\n` +
        `No se encontró: *${text}*\n` +
        `💡 Intenta con otro término`, m);
    }

    let { title, thumbnail, timestamp, views, ago, url, author } = searchResults;
    
    const videoInfo = {
      title: title || 'Sin título',
      thumbnail: thumbnail || '',
      duration: timestamp || 'N/A',
      views: formatViews(views) || 'N/A',
      uploadDate: ago || 'N/A',
      url: url || '',
      channel: author?.name || 'Canal desconocido'
    };

    if (['ytmp3', 'yta'].includes(command)) {
      return await processAudioDownload(conn, m, videoInfo);
    } else if (['ytmp4', 'ytv', 'mp4'].includes(command)) {
      return await processVideoDownload(conn, m, videoInfo);
    }

    if (command === 'play') {
      const resultMessage = 
        `🎵 *Resultado de búsqueda*\n\n` +
        `📋 *${videoInfo.title}*\n\n` +
        `📺 Canal: ${videoInfo.channel}\n` +
        `👁️ Vistas: ${videoInfo.views}\n` +
        `ⱕ️ Duración: ${videoInfo.duration}\n` +
        `📅 Publicado: ${videoInfo.uploadDate}\n` +
        `🔗 URL: ${videoInfo.url}\n\n` +
        `🎯 Selecciona el formato de descarga:`;

      if (videoInfo.thumbnail) {
        try {
          await conn.sendMessage(m.chat, {
            image: { url: videoInfo.thumbnail },
            caption: `🎵 *${videoInfo.title}*\n📺 ${videoInfo.channel}`
          }, { quoted: m });
        } catch (imgError) {
          console.log('Error enviando imagen:', imgError.message);
        }
      }

      return conn.sendButton(
        m.chat,
        resultMessage,
        'YouTube Downloader',
        null,
        [
          ['🎵 Audio', `${usedPrefix}ytmp3 ${videoInfo.url}`],
          ['🎬 Video', `${usedPrefix}ytmp4 ${videoInfo.url}`]
        ],
        null,
        null,
        m
      );
    }

  } catch (error) {
    return conn.reply(m.chat, `❌ Error: ${error.message}`, m);
  }
};

async function processAudioDownload(conn, m, videoInfo) {
  const searchInfo = 
    `🎵 *Descargando Audio*\n\n` +
    `📋 *${videoInfo.title}*\n\n` +
    `📺 Canal: ${videoInfo.channel}\n` +
    `ⱕ️ Duración: ${videoInfo.duration}\n\n` +
    `ⳁ *Procesando descarga...*`;

  await conn.reply(m.chat, searchInfo, m);
  return await fallbackAudioDownload(conn, m, videoInfo);
}

async function processVideoDownload(conn, m, videoInfo) {
  const searchInfo = 
    `🎬 *Descargando Video*\n\n` +
    `📋 *${videoInfo.title}*\n\n` +
    `📺 Canal: ${videoInfo.channel}\n` +
    `ⱕ️ Duración: ${videoInfo.duration}\n\n` +
    `ⳁ *Procesando descarga...*`;

  await conn.reply(m.chat, searchInfo, m);
  return await fallbackVideoDownload(conn, m, videoInfo);
}

async function fallbackAudioDownload(conn, m, videoInfo) {
  const fallbackAPIs = [
    {
      name: 'Vreden API',
      url: `https://api.vreden.my.id/api/ytmp3?url=${videoInfo.url}`,
      parser: (data) => data.result?.download?.url
    },
    {
      name: 'YouTube Video to Audio API',
      url: `https://zylalabs.com/api/v1/extract_audio?url=${encodeURIComponent(videoInfo.url)}`,
      parser: (data) => data?.data?.audio
    },
    {
      name: 'Super Fast YouTube to MP3/MP4 Converter API',
      url: `https://api.youtubetomp3converterapi.com/convert?url=${encodeURIComponent(videoInfo.url)}&format=mp3`,
      parser: (data) => data?.audio
    }
  ];

  for (const api of fallbackAPIs) {
    try {
      console.log(`🔄 Intentando API: ${api.name}`);
      
      const response = await fetch(api.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const data = await response.json();
      const downloadUrl = api.parser(data);
      
      if (downloadUrl) {
        await conn.sendMessage(m.chat, { 
          audio: { url: downloadUrl }, 
          fileName: `${videoInfo.title}.mp3`, 
          mimetype: 'audio/mpeg' 
        }, { quoted: m });

        return conn.reply(m.chat, 
          `✅ *Audio descargado exitosamente*\n` +
          `📂 ${videoInfo.title}.mp3\n` +
          `🎯 API: ${api.name}`, m);
      }
    } catch (error) {
      console.log(`❌ ${api.name} falló:`, error.message);
      continue;
    }
  }

  return conn.reply(m.chat,
    `❌ *Error al descargar audio*\n\n` +
    `⚠️ Todos los métodos fallaron\n` +
    `💡 Intenta con otro video`, m);
}

async function fallbackVideoDownload(conn, m, videoInfo) {
  const fallbackAPIs = [
    {
      name: 'Vreden API',
      url: `https://api.vreden.my.id/api/ytmp4?url=${videoInfo.url}`,
      parser: (data) => data.result?.download?.url
    },
    {
      name: 'YouTube Video Retriever API',
      url: `https://api.zylalabs.com/youtube_video_retriever/api/v1/extract_video?url=${encodeURIComponent(videoInfo.url)}`,
      parser: (data) => data?.data?.video
    },
    {
      name: 'Super Fast YouTube to MP3/MP4 Converter API',
      url: `https://api.youtubetomp3converterapi.com/convert?url=${encodeURIComponent(videoInfo.url)}&format=mp4`,
      parser: (data) => data?.video
    }
  ];

  for (const api of fallbackAPIs) {
    try {
      console.log(`🔄 Intentando API: ${api.name}`);
      
      const response = await fetch(api.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const data = await response.json();
      const downloadUrl = api.parser(data);
      
      if (downloadUrl) {
        await conn.sendFile(m.chat, downloadUrl, `${videoInfo.title}.mp4`, videoInfo.title, m);
        return conn.reply(m.chat, 
          `✅ *Video descargado exitosamente*\n` +
          `📂 ${videoInfo.title}.mp4\n` +
          `🎯 API: ${api.name}`, m);
      }
    } catch (error) {
      console.log(`❌ ${api.name} falló:`, error.message);
      continue;
    }
  }

  return conn.reply(m.chat,
    `❌ *Error al descargar video*\n\n` +
    `⚠️ Todos los métodos fallaron\n` +
    `💡 Intenta con otro video`, m);
}

handler.command = handler.help = ['play', 'ytmp3', 'ytmp4', 'yta', 'ytv', 'mp4'];
handler.tags = ['downloader'];
handler.description = '🎵 Descarga audio y video de YouTube';

export default handler;

function formatViews(views) {
  if (!views || views === undefined) return "Sin datos";

  const numViews = parseInt(views);
  
  if (numViews >= 1_000_000_000) {
    return `${(numViews / 1_000_000_000).toFixed(1)}B`;
  } else if (numViews >= 1_000_000) {
    return `${(numViews / 1_000_000).toFixed(1)}M`;
  } else if (numViews >= 1_000) {
    return `${(numViews / 1_000).toFixed(1)}K`;
  }
  
  return numViews.toLocaleString();
}
