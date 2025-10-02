import axios from 'axios';
import * as cheerio from 'cheerio';
import yts from 'yt-search';
import fbHandler from '../descargas-faceboock.js';
import igHandler from '../downloader-instagram.js';
import tiktokHandler from '../downloader-tiktok.js';

const DOWNLOAD_KEYWORDS = {
  tiktok: ['tiktok', 'tik tok', 'tt', 'Tiktok', 'video tiktok'],
  facebook: ['facebook', 'fb', 'descarga facebook', 'video facebook'],
  instagram: ['instagram', 'ig', 'descarga instagram', 'video instagram', 'reel'],
  playlist: ['playlist', 'lista', 'buscar', 'busca las canciones de']
};

function normalizeText(text) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function canHandle(text) {
  const normalized = normalizeText(text);
  return Object.values(DOWNLOAD_KEYWORDS).some(arr => arr.some(kw => normalized.includes(kw))) ||
         /^(facebook|fb|fbdl|facebookdl|tiktok|tt|tiktokdl|instagram|ig|instadl)/i.test(normalized);
}

function detectPlatform(text) {
  const normalized = normalizeText(text);

  if (/^(facebook|fb|fbdl|facebookdl)/i.test(normalized)) return 'facebook';
  if (/^(tiktok|tt|tiktokdl)/i.test(normalized)) return 'tiktok';
  if (/^(instagram|ig|instadl)/i.test(normalized)) return 'instagram';
  if (DOWNLOAD_KEYWORDS.playlist.some(kw => normalized.includes(kw))) return 'playlist';

  if (DOWNLOAD_KEYWORDS.tiktok.some(kw => normalized.includes(kw))) return 'tiktok';
  if (DOWNLOAD_KEYWORDS.facebook.some(kw => normalized.includes(kw))) return 'facebook';
  if (DOWNLOAD_KEYWORDS.instagram.some(kw => normalized.includes(kw))) return 'instagram';

  return null;
}

function extractUrl(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const match = text.match(urlRegex);
  return match ? match[0] : null;
}

async function handlePlaylist(text, context) {
  const { conn, msg, jid } = context;

  try {
    const query = text.replace(/playlist|lista|buscar/gi, '').trim();
    if (!query || query.length < 2) {
      await conn.sendMessage(jid, { text: '🌙 Indica el nombre de la música a buscar. Ej: "playlist ozuna"' }, { quoted: msg });
      return;
    }

    await conn.sendMessage(jid, { text: `🌙 Buscando: *${query}*...` }, { quoted: msg });

    const searchResults = await yts(query);
    const videos = searchResults.videos.slice(0, 10);

    if (!videos || videos.length === 0) {
      await conn.sendMessage(jid, { text: `❌ No se encontraron resultados para "${query}"` }, { quoted: msg });
      return;
    }

    let response = '🌙 *RESULTADOS DE BÚSQUEDA*\n\n';
    videos.forEach((v, i) => {
      response += `${i + 1}. *${v.title.substring(0, 50)}...*\n`;
      response += `   👤 ${v.author.name}\n`;
      response += `   ⏱️ ${v.timestamp}\n`;
      response += `   🔗 ${v.url}\n\n`;
    });
    response += '💡 Para descargar usa: "descarga música [nombre]"';

    await conn.sendMessage(jid, { text: response }, { quoted: msg });
  } catch (error) {
    console.error('Error en playlist:', error.message);
    await conn.sendMessage(jid, { text: '⚠️ Error al buscar la playlist, intenta nuevamente.' }, { quoted: msg });
  }
}

async function handle(inputText, context) {
  const { conn, msg, jid } = context;

  try {
    const platform = detectPlatform(inputText);
    if (!platform) return;

    const url = extractUrl(inputText);

    if (platform === 'playlist') {
      await handlePlaylist(inputText, context);
      return;
    }

    if (!url) {
      await conn.sendMessage(jid, { text: '⚠️ No encontré ningún enlace para descargar.' }, { quoted: msg });
      return;
    }

    console.log(`📥 Detectada plataforma: ${platform} | URL: ${url}`);


    const m = {
      ...msg,
      chat: jid,
      sender: msg.key.participant || msg.key.remoteJid,
      isGroup: jid.endsWith('@g.us')
    };

    const handlerContext = {
      conn,
      args: [url],
      command: '',
      usedPrefix: '/',
      text: url
    };

    try {
      if (platform === 'facebook') {
        handlerContext.command = 'fb';
        console.log('✅ Llamando a fbHandler...');
        await fbHandler(m, handlerContext);
        return;
      }
      
      if (platform === 'instagram') {
        handlerContext.command = 'ig';
        console.log('✅ Llamando a igHandler...');
        await igHandler(m, handlerContext);
        return;
      }
      
      if (platform === 'tiktok') {
        handlerContext.command = 'tt';
        console.log('✅ Llamando a tiktokHandler...');
        await tiktokHandler(m, handlerContext);
        return;
      }
      
    } catch (handlerError) {
      console.error(`❌ Error en ${platform} handler:`, handlerError.message);
      console.error('Stack:', handlerError.stack);
      
      
    }

  } catch (error) {
    console.error('❌ Error general en download-plugin:', error.message);
    console.error('Stack:', error.stack);
  }
}

export default {
  canHandle,
  handle,
  name: 'download',
  description: 'Plugin unificado para descargar videos de TikTok, Facebook, Instagram y playlists de YouTube'
};
