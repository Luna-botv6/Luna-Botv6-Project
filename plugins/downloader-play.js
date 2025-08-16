import { ogmp3 } from '../src/libraries/youtubedl.js';
import yts from 'yt-search';
import fs from 'fs';

const userRequestTimes = new Map();
const COOLDOWN_TIME = 3000; // 3 segundos de cooldown entre solicitudes múltiples

function checkRateLimit(userId) {
  const now = Date.now();
  const lastRequest = userRequestTimes.get(userId) || 0;
  const timeDiff = now - lastRequest;
  if (timeDiff < COOLDOWN_TIME && lastRequest > 0) {
    const remainingTime = Math.ceil((COOLDOWN_TIME - timeDiff) / 1000);
    return { allowed: false, waitTime: remainingTime };
  }
  userRequestTimes.set(userId, now);
  return { allowed: true, waitTime: 0 };
}

async function searchVideo(query, options = {}) {
  try {
    const search = await yts.search({
      query: query.substring(0, 100),
      hl: 'es', gl: 'ES',
      ...options
    });
    if (!search.videos || search.videos.length === 0) throw new Error('No se encontraron resultados para tu búsqueda');
    return search.videos;
  } catch {
    throw new Error('No pude encontrar videos con ese término. Intenta con palabras diferentes.');
  }
}

function formatNumber(n) {
  if (!n) return '0';
  return n.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
}

function formatDuration(seconds) {
  if (!seconds || seconds < 0) return '0 segundos';
  const h = Math.floor(seconds / 3600),
        m = Math.floor((seconds % 3600) / 60),
        s = Math.floor(seconds % 60);
  return [(h && h + 'h '), (m && m + 'm '), (s && s + 's')].join('').trim() || '0s';
}

const sanitizeTitle = title => title?.replace(/[<>:"\/\\|?*]/g, '').substring(0, 50) || 'Video';

let handler = async (m, { conn, args, text, usedPrefix, command }) => {
  try {
  
    if (m.isBaileys) return;              
    if (m.key?.fromMe) return;            
    if (m.quoted?.isBaileys) return;      

    const datas = global;
    const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje;
    const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
    const tradutor = _translate.plugins.descargas_play;

    if (!text) {
      throw `${tradutor.texto1[0]} ${usedPrefix + command} ${tradutor.texto1[1]}`;
    }
    const rateLimitCheck = checkRateLimit(m.sender);
    if (!rateLimitCheck.allowed) {
      return conn.reply(m.chat,
        `⏰ *¡Tranquilo!*\n\nDetecté que enviaste comandos muy rápido. Por favor espera *${rateLimitCheck.waitTime} segundos* antes de hacer otra solicitud.\n\n_Esto evita el spam y mantiene el servicio funcionando bien para todos_ 😊`,
        m
      );
    }

    const searchQuery = args.join(' ').trim();
    if (ogmp3.isUrl(searchQuery)) {
      await processDirectUrl(conn, m, searchQuery, command, usedPrefix);
    } else {
      await processSearch(conn, m, searchQuery, command, usedPrefix);
    }

  } catch (error) {
    const errorMessage = typeof error === 'string' ? error : 'Ups, algo salió mal. Por favor intenta de nuevo en unos momentos.';
    await conn.reply(m.chat, `🤖 *Oops!*\n\n${errorMessage}\n\n_Si el problema persiste, intenta con otro video o búsqueda diferente._`, m);
    console.log('❌ Error en handler:', errorMessage);
  }
};

async function processDirectUrl(conn, m, url, command, usedPrefix) {
  const videoId = ogmp3.youtube(url);
  if (!videoId) throw 'Esta URL no es válida. Por favor comparte un enlace de YouTube correcto.';
  try {
    const searchResults = await yts.search({ query: `https://youtu.be/${videoId}` });
    const video = searchResults.videos[0];
    if (command === 'play') {
      const texto = `*🎵 Video Encontrado*\n\n● *Título:* ${sanitizeTitle(video?.title || 'Desconocido')}\n● *Duración:* ${formatDuration(video?.duration?.seconds)}\n● *Vistas:* ${formatNumber(video?.views)}\n● *Autor:* ${video?.author?.name || 'Desconocido'}\n\n*¿En qué formato deseas descargar?*`;
      return await conn.sendButton(
        m.chat,
        texto,
        'Descarga YouTube',
        video?.thumbnail || `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
        [
          ['🎵 Audio MP3', `${usedPrefix}ytmp3 ${url}`],
          ['🎬 Video MP4', `${usedPrefix}ytmp4 ${url}`]
        ],
        null,
        null,
        m
      );
    }
    await downloadContent(conn, m, url, command, video);
  } catch {
    throw 'No pude obtener información de este video. Verifica que el enlace sea correcto y que el video esté disponible.';
  }
}

async function processSearch(conn, m, query, command, usedPrefix) {
  const results = await searchVideo(query);
  const video = results[0];
  if (command === 'play') {
    const texto = `*🎵 Música Encontrada*\n\n● *Título:* ${sanitizeTitle(video.title)}\n● *Publicado:* ${video.ago}\n● *Duración:* ${formatDuration(video.duration.seconds)}\n● *Vistas:* ${formatNumber(video.views)}\n● *Autor:* ${video.author.name}\n\n*¿En qué formato deseas descargar?*`;
    return await conn.sendButton(
      m.chat,
      texto,
      'Descarga YouTube',
      video.thumbnail,
      [
        ['🎵 Audio MP3', `${usedPrefix}ytmp3 ${video.url}`],
        ['🎬 Video MP4', `${usedPrefix}ytmp4 ${video.url}`]
      ],
      null,
      null,
      m
    );
  }
  await downloadContent(conn, m, video.url, command, video);
}

async function downloadContent(conn, m, url, command, videoInfo) {
  try {
    const isAudio = command === 'ytmp3';
    const type = isAudio ? 'audio' : 'video';
    const format = isAudio ? '320' : '720';
    await conn.sendMessage(m.chat, {
      image: { url: videoInfo?.thumbnail || `https://i.ytimg.com/vi/${ogmp3.youtube(url)}/maxresdefault.jpg` },
      caption: `*✨ Preparando tu descarga*\n\n● *Título:* ${sanitizeTitle(videoInfo?.title || 'Procesando...')}\n● *Tipo:* ${type.toUpperCase()}\n● *Calidad:* ${format}${isAudio ? 'kbps' : 'p'}\n\n> *_🔄 Descargando ${type}... esto puede tomar unos momentos_*`
    }, { quoted: m });

    const result = await ogmp3.download(url, format, type);
    if (!result.status) throw result.error || 'Error en la descarga';

    if (isAudio) {
      await conn.sendMessage(m.chat, {
        audio: { url: result.result.download },
        mimetype: 'audio/mpeg',
        fileName: `${sanitizeTitle(result.result.title)}.mp3`
      }, { quoted: m });
    } else {
      await conn.sendMessage(m.chat, {
        video: { url: result.result.download },
        fileName: `${sanitizeTitle(result.result.title)}.mp4`,
        mimetype: 'video/mp4',
        caption: `🎬 ${sanitizeTitle(result.result.title)}`
      }, { quoted: m });
    }
    console.log('✅ Descarga completada exitosamente');

  } catch (error) {
    let msg = 'No pude descargar este contenido en este momento.';
    if (error.toString().includes('age')) msg = 'Este video tiene restricciones de edad y no se puede descargar.';
    else if (error.toString().includes('private')) msg = 'Este video es privado y no se puede descargar.';
    else if (error.toString().includes('unavailable')) msg = 'Este video no está disponible en tu región.';
    else if (error.toString().includes('copyright')) msg = 'Este video tiene restricciones de derechos de autor.';
    else if (error.toString().includes('network')) msg = 'Hay problemas de conexión. Intenta de nuevo en unos momentos.';
    else if (error.toString().includes('timeout')) msg = 'La descarga tardó demasiado. Intenta con un video más corto.';
    await conn.reply(m.chat, `😅 *¡Ups! Algo salió mal*\n\n${msg}\n\n*💡 Sugerencias:*\n• Intenta con otro video\n• Verifica que el enlace funcione\n• Espera un momento y vuelve a intentar\n\n_Si el problema persiste, el video podría tener restricciones._`, m);
    console.log('❌ Error en descarga:', error);
  }
}

handler.help = ['play', 'ytmp3', 'ytmp4'];
handler.tags = ['downloader'];
handler.command = ['play', 'ytmp3', 'ytmp4'];

export default handler;