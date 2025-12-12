import fs from 'fs';
import yts from 'yt-search';
import fetch from 'node-fetch';

const configContent = fs.readFileSync('./config.js', 'utf-8');
if (!configContent.includes('Luna-Botv6')) {
  throw new Error('Handler bloqueado: Luna-Botv6 no encontrado.');
}

const BASE_URL = 'https://noobs-api.top';

function extractVideoId(url) {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([^&?\/]+)/);
  return match ? match[1] : null;
}

let handler = async (m, { conn, text, usedPrefix, command }) => {
  try {
    if (!text) {
      return await conn.reply(m.chat, 'Escribe el nombre de la canción o URL', m);
    }

    if (command === 'play') {
      const search = await yts(text);
      const video = search.videos[0];
      
      if (!video) {
        return await conn.reply(m.chat, `No se encontró: ${text}`, m);
      }

      const message = `🎶 *${video.title}*\n👤 Autor: ${video.author?.name}\n⏱️ Duración: ${video.timestamp}\n🔗 https://youtu.be/${video.videoId}`;
      
      await conn.sendButton(
        m.chat,
        message,
        'LunaBot V6',
        video.thumbnail,
        [
          ['🎵 Audio', `ytmp3 https://youtu.be/${video.videoId}`],
          ['🎬 Video', `ytmp4 https://youtu.be/${video.videoId}`]
        ],
        null,
        null,
        m
      );
    }

    if (command === 'ytmp3' || command === 'ytmp4') {
      const videoId = extractVideoId(text.trim());
      
      if (!videoId) {
        return conn.reply(m.chat, 'URL inválida', m);
      }

      await conn.reply(m.chat, '🌙🤖 *LunaBot*\n🎶 Descargando su música… por favor espere un momento.', m);

      const format = command === 'ytmp3' ? 'audio' : 'mp4';
      const apiUrl = `${BASE_URL}/dipto/ytDl3?link=${encodeURIComponent(videoId)}&format=${format}`;
      
      const response = await fetch(apiUrl);
      const data = await response.json();

      if (!data.downloadLink) {
        return await conn.reply(m.chat, '⌠No se pudo obtener el enlace de descarga', m);
      }

      if (command === 'ytmp3') {
        await conn.sendMessage(
          m.chat,
          {
            audio: { url: data.downloadLink },
            fileName: (data.title || 'audio') + '.mp3',
            mimetype: 'audio/mpeg'
          },
          { quoted: m }
        );
      }

      if (command === 'ytmp4') {
        await conn.sendMessage(
          m.chat,
          {
            video: { url: data.downloadLink },
            fileName: (data.title || 'Video') + '.mp4',
            mimetype: 'video/mp4',
            caption: data.title || '🎬 Video'
          },
          { quoted: m }
        );
      }
    }

  } catch (error) {
    console.error('Error en play:', error);
    await conn.reply(m.chat, '⌠Hubo un error con la descarga', m);
  }
};

handler.command = ['play', 'ytmp3', 'ytmp4'];
handler.tags = ['downloader'];
handler.help = ['play', 'ytmp3', 'ytmp4'];

handler.all = async function(m) {
  if (!m.text) return;
  
  const text = m.text.trim();
  
  if (text.startsWith('ytmp3 ') || text.startsWith('ytmp4 ')) {
    const [cmd, ...args] = text.split(' ');
    const url = args.join(' ');
    
    if (cmd === 'ytmp3' || cmd === 'ytmp4') {
      const videoId = extractVideoId(url);
      
      if (!videoId) {
        return;
      }

      await m.reply('🌙🤖 *LunaBot*\n🎶 Descargando su música… por favor espere un momento.');

      const format = cmd === 'ytmp3' ? 'audio' : 'mp4';
      const apiUrl = `${BASE_URL}/dipto/ytDl3?link=${encodeURIComponent(videoId)}&format=${format}`;
      
      try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (!data.downloadLink) {
          return await m.reply('⌠No se pudo obtener el enlace de descarga');
        }

        if (cmd === 'ytmp3') {
          await this.sendMessage(
            m.chat,
            {
              audio: { url: data.downloadLink },
              fileName: (data.title || 'audio') + '.mp3',
              mimetype: 'audio/mpeg'
            },
            { quoted: m }
          );
        }

        if (cmd === 'ytmp4') {
          await this.sendMessage(
            m.chat,
            {
              video: { url: data.downloadLink },
              fileName: (data.title || 'Video') + '.mp4',
              mimetype: 'video/mp4',
              caption: data.title || '🎬 Video'
            },
            { quoted: m }
          );
        }
      } catch (error) {
        console.error('Error:', error);
        await m.reply('⌠Hubo un error con la descarga');
      }
    }
  }
};

export default handler;