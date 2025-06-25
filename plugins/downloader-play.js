import fetch from 'node-fetch';
import yts from 'yt-search';
import { ogmp3 } from '../src/libraries/youtubedl.js';
import fs from 'fs';

// ===== CONFIGURACIÓN SEGURA PARA WHATSAPP =====
const SECURITY_CONFIG = {
  // Límites de tasa para evitar spam
  MIN_DELAY_BETWEEN_REQUESTS: 5000,    // 5 segundos mínimo entre descargas
  API_TIMEOUT: 20000,                  // 20 segundos timeout
  MAX_FILE_SIZE_MB: 15,                // Límite de 15MB (WhatsApp limit ~16MB)
  MAX_DURATION_MINUTES: 10,            // Máximo 10 minutos de duración
  
  // Seguridad y privacidad
  REMOVE_SENSITIVE_DATA: true,         // Limpiar metadatos sensibles
  LOG_MINIMAL: true,                   // Logs mínimos por privacidad
  VALIDATE_CONTENT: true,              // Validar contenido antes de enviar
};

// Control de tasa de requests por usuario
const userRequestTimes = new Map();

// Función de delay seguro
const secureDelay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Validación de URL segura
function isValidYouTubeUrl(url) {
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/)|youtu\.be\/)[\w-]+/;
  return youtubeRegex.test(url);
}

// Control de rate limiting por usuario
function checkRateLimit(userId) {
  const now = Date.now();
  const lastRequest = userRequestTimes.get(userId) || 0;
  const timeDiff = now - lastRequest;
  
  if (timeDiff < SECURITY_CONFIG.MIN_DELAY_BETWEEN_REQUESTS) {
    const remainingTime = Math.ceil((SECURITY_CONFIG.MIN_DELAY_BETWEEN_REQUESTS - timeDiff) / 1000);
    return { allowed: false, waitTime: remainingTime };
  }
  
  userRequestTimes.set(userId, now);
  return { allowed: true, waitTime: 0 };
}

// Función de descarga segura usando solo ogmp3
async function secureDownload(videoUrl, quality = '320', type = 'audio') {
  try {
    // Timeout de seguridad
    const downloadPromise = ogmp3.download(videoUrl, quality, type);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout de seguridad alcanzado')), SECURITY_CONFIG.API_TIMEOUT)
    );
    
    const result = await Promise.race([downloadPromise, timeoutPromise]);
    
    if (!result) {
      throw new Error('No se recibió respuesta del servidor');
    }
    
    if (!result.result) {
      throw new Error('Respuesta sin campo result');
    }
    
    if (!result.result.download) {
      throw new Error('URL de descarga no disponible');
    }
    
    return result.result.download;
    
  } catch (error) {
    throw new Error(`Descarga falló: ${error.message}`);
  }
}

// Validación de contenido
function validateVideoContent(video) {
  if (!video) {
    throw new Error('Video no encontrado');
  }
  
  // Validar duración
  if (video.duration?.seconds > (SECURITY_CONFIG.MAX_DURATION_MINUTES * 60)) {
    throw new Error(`El video es demasiado largo. Máximo permitido: ${SECURITY_CONFIG.MAX_DURATION_MINUTES} minutos`);
  }
  
  // Validar que tenga información básica
  if (!video.title || !video.url) {
    throw new Error('Información del video incompleta');
  }
  
  // Validar URL
  if (!isValidYouTubeUrl(video.url)) {
    throw new Error('URL de YouTube inválida');
  }
  
  return true;
}

// Limpiar datos sensibles del video info
function sanitizeVideoInfo(video) {
  if (!SECURITY_CONFIG.REMOVE_SENSITIVE_DATA) return video;
  
  return {
    title: video.title?.replace(/[<>:"\/\\|?*]/g, '') || 'Video',
    url: video.url,
    duration: video.duration,
    views: video.views,
    ago: video.ago,
    author: {
      name: video.author?.name?.replace(/[<>:"\/\\|?*]/g, '') || 'Desconocido'
    },
    thumbnail: video.thumbnail,
    videoId: video.videoId
  };
}

let handler = async (m, { conn, args, text, usedPrefix, command }) => {
  try {
    // ===== VALIDACIONES DE SEGURIDAD =====
    const datas = global;
    const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje;
    const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
    const tradutor = _translate.plugins.descargas_play;

    if (!text) {
      throw `${tradutor.texto1[0]} ${usedPrefix + command} ${tradutor.texto1[1]}`;
    }

    // Control de rate limiting
    const rateLimitCheck = checkRateLimit(m.sender);
    if (!rateLimitCheck.allowed) {
      return conn.reply(m.chat, 
        `⏰ *Límite de velocidad*\n\nPor favor espera *${rateLimitCheck.waitTime} segundos* antes de hacer otra solicitud.\n\n_Esto ayuda a mantener el servicio estable para todos._`, 
        m
      );
    }

    // ===== BÚSQUEDA SEGURA =====
    const searchQuery = args.join(' ').trim();
    if (searchQuery.length < 2 || searchQuery.length > 100) {
      throw 'La búsqueda debe tener entre 2 y 100 caracteres';
    }

    const yt_play = await search(searchQuery);
    const video = yt_play[0];
    
    // Validar contenido
    validateVideoContent(video);
    const safeVideo = sanitizeVideoInfo(video);

    // ===== MODO SELECCIÓN (comando 'play') =====
    if (command === 'play') {
      const texto1 = `*🎵 Música Encontrada*\n\n● *Título:* ${safeVideo.title}\n● *Publicado:* ${safeVideo.ago}\n● *Duración:* ${secondString(safeVideo.duration.seconds)}\n● *Vistas:* ${MilesNumber(safeVideo.views)}\n● *Autor:* ${safeVideo.author.name}\n\n*¿En qué formato deseas descargar?* 🤔\n\n_⚡ Descarga optimizada y segura_`.trim();

      return await conn.sendButton(
        m.chat,
        texto1,
        'LunaBot V6 - Descargas Seguras',
        safeVideo.thumbnail,
        [
          ['🎵 Descargar Audio', `${usedPrefix}ytmp3 ${safeVideo.url}`],
          ['🎬 Descargar Video', `${usedPrefix}ytmp4 ${safeVideo.url}`]
        ],
        null,
        null,
        m
      );
    }

    // ===== INFORMACIÓN PREVIA =====
    let additionalText = command === 'ytmp3' ? 'audio' : 'vídeo';
    const texto1 = `*◉ Descarga Segura de YouTube*\n\n● *Título:* ${safeVideo.title}\n● *Publicado:* ${safeVideo.ago}\n● *Duración:* ${secondString(safeVideo.duration.seconds)}\n● *Vistas:* ${MilesNumber(safeVideo.views)}\n● *Autor:* ${safeVideo.author.name}\n\n> *_🔒 Procesando ${additionalText} de forma segura．．．_*`.trim();

    await conn.sendMessage(m.chat, { 
      image: { url: safeVideo.thumbnail }, 
      caption: texto1 
    }, { quoted: m });

    // Delay de seguridad
    await secureDelay(1000);

    // ===== DESCARGA DE AUDIO =====
    if (command === 'ytmp3') {
      try {
        const audioUrl = await secureDownload(safeVideo.url, '320', 'audio');
        
        await conn.sendMessage(m.chat, { 
          audio: { url: audioUrl }, 
          mimetype: 'audio/mpeg',
          fileName: `${safeVideo.title.substring(0, 50)}.mp3`
        }, { quoted: m });
        
      } catch (error) {
        await conn.reply(m.chat, 
          `❌ *Error al procesar audio*\n\n_${error.message}_\n\n*Sugerencias:*\n• Intenta con un video diferente\n• Verifica que el enlace sea válido\n• Espera unos minutos y vuelve a intentar\n\n_Servicio optimizado para WhatsApp_`, 
          m
        );
      }
    }

    // ===== DESCARGA DE VIDEO =====
    if (command === 'ytmp4') {
      try {
        const videoUrl = await secureDownload(safeVideo.url, '720', 'video');
        
        await conn.sendMessage(m.chat, { 
          video: { url: videoUrl }, 
          fileName: `${safeVideo.title.substring(0, 50)}.mp4`, 
          mimetype: 'video/mp4', 
          caption: `🎬 ${safeVideo.title}`
        }, { quoted: m });
        
        // Log de éxito (mínimo)
        if (SECURITY_CONFIG.LOG_MINIMAL) {
          console.log('✅ Video enviado exitosamente');
        }
        
      } catch (error) {
        await conn.reply(m.chat, 
          `❌ *Error al procesar video*\n\n_No se pudo descargar el video en este momento._\n\n*Sugerencias:*\n• Intenta con un video más corto\n• Verifica que el enlace funcione\n• Espera unos minutos y vuelve a intentar\n\n_El servicio está optimizado para tu seguridad._`, 
          m
        );
      }
    }

  } catch (error) {
    // Manejo de errores seguro
    const errorMessage = typeof error === 'string' ? error : 'Error interno del sistema';
    await conn.reply(m.chat, 
      `⚠️ *Error*\n\n${errorMessage}\n\n_Por favor intenta nuevamente._`, 
      m
    );
    
    if (SECURITY_CONFIG.LOG_MINIMAL) {
      console.log('❌ Error en handler:', errorMessage);
    }
  }
};

handler.command = ['play', 'ytmp3', 'ytmp4'];

export default handler;

// ===== FUNCIONES AUXILIARES SEGURAS =====

async function search(query, options = {}) {
  try {
    const search = await yts.search({ 
      query: query.substring(0, 100), // Limitar longitud de búsqueda
      hl: 'es', 
      gl: 'ES', 
      ...options 
    });
    
    if (!search.videos || search.videos.length === 0) {
      throw new Error('No se encontraron resultados');
    }
    
    return search.videos;
  } catch (error) {
    throw new Error('Error en la búsqueda: ' + error.message);
  }
}

function MilesNumber(number) {
  if (!number) return '0';
  const exp = /(\d)(?=(\d{3})+(?!\d))/g;
  const rep = '$1.';
  const arr = number.toString().split('.');
  arr[0] = arr[0].replace(exp, rep);
  return arr[1] ? arr.join('.') : arr[0];
}

function secondString(seconds) {
  if (!seconds || seconds < 0) return '0 segundos';
  
  seconds = Number(seconds);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  
  const hDisplay = h > 0 ? h + (h == 1 ? ' hora' : ' horas') : '';
  const mDisplay = m > 0 ? m + (m == 1 ? ' minuto' : ' minutos') : '';
  const sDisplay = s > 0 ? s + (s == 1 ? ' segundo' : ' segundos') : '';
  
  if (h > 0) return `${hDisplay}${m > 0 ? ', ' + mDisplay : ''}`;
  if (m > 0) return `${mDisplay}${s > 0 ? ', ' + sDisplay : ''}`;
  return sDisplay || '0 segundos';
}