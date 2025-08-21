import fetch from "node-fetch"
import yts from 'yt-search'
import axios from "axios"

const youtubeRegexID = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([a-zA-Z0-9_-]{11})/

const handler = async (m, { conn, text, usedPrefix, command }) => {
  try {
    // Validación de entrada
    if (!text.trim()) {
      return conn.reply(m.chat, 
        `🎵 *YouTube Downloader*\n\n` +
        `⚠️ Escribe el nombre de la música\n` +
        `💡 Ejemplo: *${usedPrefix}${command} ozuna el mar*`, m)
    }

    // Búsqueda en YouTube
    let videoIdToFind = text.match(youtubeRegexID) || null
    let searchResults = await yts(videoIdToFind === null ? text : 'https://youtu.be/' + videoIdToFind[1])

    if (videoIdToFind) {
      const videoId = videoIdToFind[1]  
      searchResults = searchResults.all.find(item => item.videoId === videoId) || 
                     searchResults.videos.find(item => item.videoId === videoId)
    } 
    
    searchResults = searchResults.all?.[0] || searchResults.videos?.[0] || searchResults  
    
    if (!searchResults || searchResults.length == 0) {
      return conn.reply(m.chat,
        `❌ *Sin resultados*\n\n` +
        `No se encontró: *${text}*\n` +
        `💡 Intenta con otro término`, m)
    }

    // Extracción de datos
    let { title, thumbnail, timestamp, views, ago, url, author } = searchResults
    
    const videoInfo = {
      title: title || 'Sin título',
      thumbnail: thumbnail || '',
      duration: timestamp || 'N/A',
      views: formatViews(views) || 'N/A',
      uploadDate: ago || 'N/A',
      url: url || '',
      channel: author?.name || 'Canal desconocido'
    }

    // Si es comando específico de descarga directa, procesar
    if (['ytmp3', 'yta'].includes(command)) {
      return await processAudioDownload(conn, m, videoInfo)
    } else if (['ytmp4', 'ytv', 'mp4'].includes(command)) {
      return await processVideoDownload(conn, m, videoInfo)
    }

    // Para comando 'play' - mostrar búsqueda completa con botones
    if (command === 'play') {
      const resultMessage = 
        `🎵 *Resultado de búsqueda*\n\n` +
        `📋 *${videoInfo.title}*\n\n` +
        `📺 Canal: ${videoInfo.channel}\n` +
        `👁️ Vistas: ${videoInfo.views}\n` +
        `⏱️ Duración: ${videoInfo.duration}\n` +
        `📅 Publicado: ${videoInfo.uploadDate}\n` +
        `🔗 URL: ${videoInfo.url}\n\n` +
        `🎯 Selecciona el formato de descarga:`

      // Primero enviar la imagen del video si existe
      if (videoInfo.thumbnail) {
        try {
          await conn.sendMessage(m.chat, {
            image: { url: videoInfo.thumbnail },
            caption: `🎵 *${videoInfo.title}*\n📺 ${videoInfo.channel}`
          }, { quoted: m })
        } catch (imgError) {
          console.log('Error enviando imagen:', imgError.message)
        }
      }

      // Después enviar el mensaje con botones (sin imagen para evitar conflictos)
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
      )
    }

  } catch (error) {
    return conn.reply(m.chat, `❌ Error: ${error.message}`, m)
  }
}

// Función para procesar descarga de audio
async function processAudioDownload(conn, m, videoInfo) {
  // Mostrar información del video que se va a descargar
  const searchInfo = 
    `🎵 *Descargando Audio*\n\n` +
    `📋 *${videoInfo.title}*\n\n` +
    `📺 Canal: ${videoInfo.channel}\n` +
    `👁️ Vistas: ${videoInfo.views}\n` +
    `⏱️ Duración: ${videoInfo.duration}\n` +
    `📅 Publicado: ${videoInfo.uploadDate}\n\n` +
    `⏳ *Procesando descarga...*`

  await conn.reply(m.chat, searchInfo, m)

  try {
    const audioResponse = await fetch(`https://api.vreden.my.id/api/ytmp3?url=${videoInfo.url}`)
    const audioData = await audioResponse.json()
    
    if (!audioData.result?.download?.url) {
      throw new Error('No se pudo obtener el audio')
    }

    await conn.sendMessage(m.chat, { 
      audio: { url: audioData.result.download.url }, 
      fileName: `${audioData.result.title}.mp3`, 
      mimetype: 'audio/mpeg' 
    }, { quoted: m })

    return conn.reply(m.chat, `✅ *Audio descargado exitosamente*\n📂 ${audioData.result.title}.mp3`, m)

  } catch (error) {
    return conn.reply(m.chat,
      `❌ *Error al descargar audio*\n\n` +
      `⚠️ ${error.message}\n` +
      `💡 El archivo puede ser muy pesado o hay restricciones\n` +
      `🔄 Intenta con otro video o más tarde`, m)
  }
}

// Función para procesar descarga de video
async function processVideoDownload(conn, m, videoInfo) {
  // Mostrar información del video que se va a descargar
  const searchInfo = 
    `🎬 *Descargando Video*\n\n` +
    `📋 *${videoInfo.title}*\n\n` +
    `📺 Canal: ${videoInfo.channel}\n` +
    `👁️ Vistas: ${videoInfo.views}\n` +
    `⏱️ Duración: ${videoInfo.duration}\n` +
    `📅 Publicado: ${videoInfo.uploadDate}\n\n` +
    `⏳ *Procesando descarga...*`

  await conn.reply(m.chat, searchInfo, m)

  try {
    const videoResponse = await fetch(`https://api.neoxr.eu/api/youtube?url=${videoInfo.url}&type=video&quality=480p&apikey=GataDios`)
    const videoData = await videoResponse.json()
    
    if (!videoData.data?.url) {
      throw new Error('No se pudo obtener el video')
    }

    await conn.sendFile(m.chat, videoData.data.url, `${videoData.title || videoInfo.title}.mp4`, videoInfo.title, m)
    return conn.reply(m.chat, 
      `✅ *Video descargado exitosamente*\n` +
      `📂 ${videoData.title || videoInfo.title}.mp4\n` +
      `🎯 Calidad: 480p`, m)

  } catch (error) {
    return conn.reply(m.chat,
      `❌ *Error al descargar video*\n\n` +
      `⚠️ ${error.message}\n` +
      `💡 El archivo puede ser muy pesado o hay restricciones\n` +
      `🔄 Intenta con otro video o más tarde`, m)
  }
}

// Configuración del handler
handler.command = handler.help = ['play', 'ytmp3', 'ytmp4', 'yta', 'ytv', 'mp4']
handler.tags = ['downloader']
handler.description = '🎵 Descarga audio y video de YouTube'

export default handler

// Función auxiliar para formatear vistas
function formatViews(views) {
  if (!views || views === undefined) return "Sin datos"

  const numViews = parseInt(views)
  
  if (numViews >= 1_000_000_000) {
    return `${(numViews / 1_000_000_000).toFixed(1)}B`
  } else if (numViews >= 1_000_000) {
    return `${(numViews / 1_000_000).toFixed(1)}M`
  } else if (numViews >= 1_000) {
    return `${(numViews / 1_000).toFixed(1)}K`
  }
  
  return numViews.toLocaleString()
}