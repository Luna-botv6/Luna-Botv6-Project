import fs from 'fs';

const configContent = fs.readFileSync('./config.js', 'utf-8');
if (!configContent.includes('ᴀꜱᴀᴋᴜʀᴀ ᴍᴀᴏ ʙᴏᴛ 👑')) {
  throw new Error('Handler bloqueado: ᴀꜱᴀᴋᴜʀᴀ ᴍᴀᴏ ʙᴏᴛ 👑 no encontrado.');
}

import yts from 'yt-search';
import fetch from 'node-fetch';

const activeCommands = new Map();
const BASE_URL = 'https://api.stellarwa.xyz';
const API_KEY = 'paymonbest';

let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (activeCommands.has(`${m.sender}_${m.chat}_${command}_${text}`)) {
    console.log('[DEBUG] Comando ya en ejecución, omitiendo...');
    return;
  }

  activeCommands.set(`${m.sender}_${m.chat}_${command}_${text}`, Date.now());

  try {
    console.log('[DEBUG] Iniciando comando play con texto:', text);

    if (!text) {
      activeCommands.delete(`${m.sender}_${m.chat}_${command}_${text}`);
      return await conn.reply(m.chat, 'Escribe el nombre de la canción o URL', m);
    }

    console.log('[DEBUG] Buscando en YouTube...');
    const search = await yts(text);
    console.log('[DEBUG] Resultados de búsqueda:', search.videos.length);
    
    const video = search.videos[0];
    
    if (!video) {
      activeCommands.delete(`${m.sender}_${m.chat}_${command}_${text}`);
      return await conn.reply(m.chat, `No se encontró: ${text}`, m);
    }

    console.log('[DEBUG] Video encontrado:', video.title);
    console.log('[DEBUG] Video ID:', video.videoId);

    await conn.reply(m.chat, '🌙🤖 *LunaBot*\n🎶 Descargando su música… por favor espere un momento.', m);

    const videoUrl = `https://youtu.be/${video.videoId}`;
    const apiUrl = `${BASE_URL}/dl/ytmp3?url=${encodeURIComponent(videoUrl)}&quality=128&key=${API_KEY}`;
    
    console.log('[DEBUG] URL de API:', apiUrl);
    console.log('[DEBUG] Haciendo petición a la API...');
    
    const response = await fetch(apiUrl);
    console.log('[DEBUG] Status de respuesta:', response.status);
    
    const data = await response.json();
    console.log('[DEBUG] Respuesta completa de la API:', JSON.stringify(data, null, 2));

    if (!data.result || !data.result.download) {
      console.log('[DEBUG] ERROR: No se encontró result.download en la respuesta');
      console.log('[DEBUG] Estructura de data:', Object.keys(data));
      if (data.result) {
        console.log('[DEBUG] Estructura de data.result:', Object.keys(data.result));
      }
      activeCommands.delete(`${m.sender}_${m.chat}_${command}_${text}`);
      return await conn.reply(m.chat, '❌ No se pudo obtener el enlace de descarga\n\nRevisa la consola para más detalles.', m);
    }

    console.log('[DEBUG] URL de descarga obtenida:', data.result.download);
    console.log('[DEBUG] Enviando audio...');

    await conn.sendMessage(
      m.chat,
      {
        audio: { url: data.result.download },
        fileName: (data.result.title || video.title || 'audio') + '.mp3',
        mimetype: 'audio/mpeg'
      },
      { quoted: m }
    );

    console.log('[DEBUG] Audio enviado exitosamente');

    setTimeout(() => {
      activeCommands.delete(`${m.sender}_${m.chat}_${command}_${text}`);
    }, 5000);

  } catch (error) {
    console.error('[DEBUG] ERROR CAPTURADO:');
    console.error('[DEBUG] Mensaje:', error.message);
    console.error('[DEBUG] Stack:', error.stack);
    activeCommands.delete(`${m.sender}_${m.chat}_${command}_${text}`);
    await conn.reply(m.chat, `❌ Hubo un error con la descarga\n\nError: ${error.message}`, m);
  }
};

handler.command = ['play'];

handler.before = async function(m) {
  if (!m.text) return;
  
  const prefixes = ['/', '.', '#', '!'];
  const usedPrefix = prefixes.find(p => m.text.startsWith(p));
  if (!usedPrefix) return;
  
  const [cmd, ...args] = m.text.slice(usedPrefix.length).trim().split(' ');
  const text = args.join(' ');
  
  if (handler.command.includes(cmd.toLowerCase())) {
    const key = `${m.sender}_${m.chat}_${cmd}_${text}`;
    
    if (activeCommands.has(key)) {
      const lastTime = activeCommands.get(key);
      if (Date.now() - lastTime < 5000) {
        return true;
      }
    }
  }
};

export default handler;
