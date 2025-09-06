import fetch from "node-fetch"
import yts from 'yt-search'
import youtubedl from 'youtube-dl-exec'
import fs from 'fs'
import path from 'path'

const youtubeRegexID = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([a-zA-Z0-9_-]{11})/

const handler = async (m, { conn, text, usedPrefix, command }) => {
  try {
    if (!text.trim()) {
      return conn.reply(m.chat, 
        `🎵 *YouTube Downloader*\n\n` +
        `⚠️ Escribe el nombre de la música\n` +
        `💡 Ejemplo: *${usedPrefix}${command} ozuna el mar*`, m)
    }

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

    if (['ytmp3', 'yta'].includes(command)) {
      return await processAudioDownload(conn, m, videoInfo)
    } else if (['ytmp4', 'ytv', 'mp4'].includes(command)) {
      return await processVideoDownload(conn, m, videoInfo)
    }

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

async function processAudioDownload(conn, m, videoInfo) {
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
    try {
      console.log('🔄 Intentando método: youtube-dl-exec')
      
      const tempDir = './temp'
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir)
      }

      const options = {
        format: 'bestaudio[ext=m4a]/best[height<=480]',
        extractAudio: true,
        audioFormat: 'mp3',
        audioQuality: '192K',
        output: path.join(tempDir, `${Date.now()}_%(title)s.%(ext)s`),
        noWarnings: true,
        noCallHome: true,
        addHeader: [
          'referer:youtube.com',
          'user-agent:Mozilla/5.0 (compatible; Googlebot/2.1)'
        ]
      }

      await youtubedl(videoInfo.url, options)

      const files = fs.readdirSync(tempDir)
      const downloadedFile = files.find(file => 
        file.includes(Date.now().toString().substring(0, 8)) && 
        file.endsWith('.mp3')
      )

      if (downloadedFile) {
        const filePath = path.join(tempDir, downloadedFile)
        const buffer = fs.readFileSync(filePath)

        await conn.sendMessage(m.chat, {
          audio: buffer,
          fileName: `${videoInfo.title}.mp3`,
          mimetype: 'audio/mpeg',
          ptt: false
        }, { quoted: m })

        fs.unlinkSync(filePath)
        
        return conn.reply(m.chat, 
          `✅ *Audio descargado exitosamente*\n` +
          `📂 ${videoInfo.title}.mp3\n` +
          `🎯 Método usado: youtube-dl-exec`, m)
      }

    } catch (youtubedlError) {
      console.log('❌ youtube-dl-exec falló:', youtubedlError.message)
    }

    return await fallbackAudioDownload(conn, m, videoInfo)

  } catch (error) {
    return conn.reply(m.chat,
      `❌ *Error al descargar audio*\n\n` +
      `⚠️ ${error.message}\n` +
      `💡 El archivo puede ser muy pesado o hay restricciones\n` +
      `🔄 Intenta con otro video o más tarde`, m)
  }
}

async function processVideoDownload(conn, m, videoInfo) {
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
    try {
      console.log('🔄 Intentando método: youtube-dl-exec')
      
      const tempDir = './temp'
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir)
      }

      const options = {
        format: 'best[height<=720]/best',
        output: path.join(tempDir, `${Date.now()}_%(title)s.%(ext)s`),
        noWarnings: true,
        noCallHome: true,
        addHeader: [
          'referer:youtube.com',
          'user-agent:Mozilla/5.0 (compatible; Googlebot/2.1)'
        ]
      }

      await youtubedl(videoInfo.url, options)

      const files = fs.readdirSync(tempDir)
      const downloadedFile = files.find(file => 
        file.includes(Date.now().toString().substring(0, 8)) && 
        (file.endsWith('.mp4') || file.endsWith('.webm'))
      )

      if (downloadedFile) {
        const filePath = path.join(tempDir, downloadedFile)
        const buffer = fs.readFileSync(filePath)

        await conn.sendFile(m.chat, buffer, `${videoInfo.title}.mp4`, videoInfo.title, m)
        
        fs.unlinkSync(filePath)
        
        return conn.reply(m.chat, 
          `✅ *Video descargado exitosamente*\n` +
          `📂 ${videoInfo.title}.mp4\n` +
          `🎯 Método usado: youtube-dl-exec`, m)
      }

    } catch (youtubedlError) {
      console.log('❌ youtube-dl-exec falló:', youtubedlError.message)
    }

    return await fallbackVideoDownload(conn, m, videoInfo)

  } catch (error) {
    return conn.reply(m.chat,
      `❌ *Error al descargar video*\n\n` +
      `⚠️ ${error.message}\n` +
      `💡 El archivo puede ser muy pesado o hay restricciones\n` +
      `🔄 Intenta con otro video o más tarde`, m)
  }
}

async function fallbackAudioDownload(conn, m, videoInfo) {
  const fallbackAPIs = [
    {
      name: 'Vreden API',
      url: `https://api.vreden.my.id/api/ytmp3?url=${videoInfo.url}`,
      parser: (data) => data.result?.download?.url
    },
    {
      name: 'NeoXR API',
      url: `https://api.neoxr.eu/api/youtube?url=${videoInfo.url}&type=audio&apikey=GataDios`,
      parser: (data) => data.data?.url
    }
  ]

  for (const api of fallbackAPIs) {
    try {
      console.log(`🔄 Intentando API: ${api.name}`)
      const response = await fetch(api.url)
      const data = await response.json()
      const downloadUrl = api.parser(data)
      
      if (downloadUrl) {
        await conn.sendMessage(m.chat, { 
          audio: { url: downloadUrl }, 
          fileName: `${videoInfo.title}.mp3`, 
          mimetype: 'audio/mpeg' 
        }, { quoted: m })

        return conn.reply(m.chat, 
          `✅ *Audio descargado exitosamente*\n` +
          `📂 ${videoInfo.title}.mp3\n` +
          `🎯 Método usado: ${api.name}`, m)
      }
    } catch (error) {
      console.log(`❌ ${api.name} falló:`, error.message)
      continue
    }
  }

  return conn.reply(m.chat,
    `❌ *Error al descargar audio*\n\n` +
    `⚠️ Todos los métodos fallaron\n` +
    `💡 Intenta con otro video o más tarde`, m)
}

async function fallbackVideoDownload(conn, m, videoInfo) {
  const fallbackAPIs = [
    {
      name: 'NeoXR API',
      url: `https://api.neoxr.eu/api/youtube?url=${videoInfo.url}&type=video&quality=480p&apikey=GataDios`,
      parser: (data) => data.data?.url
    },
    {
      name: 'Vreden API',
      url: `https://api.vreden.my.id/api/ytmp4?url=${videoInfo.url}`,
      parser: (data) => data.result?.download?.url
    }
  ]

  for (const api of fallbackAPIs) {
    try {
      console.log(`🔄 Intentando API: ${api.name}`)
      const response = await fetch(api.url)
      const data = await response.json()
      const downloadUrl = api.parser(data)
      
      if (downloadUrl) {
        await conn.sendFile(m.chat, downloadUrl, `${videoInfo.title}.mp4`, videoInfo.title, m)
        return conn.reply(m.chat, 
          `✅ *Video descargado exitosamente*\n` +
          `📂 ${videoInfo.title}.mp4\n` +
          `🎯 Método usado: ${api.name}`, m)
      }
    } catch (error) {
      console.log(`❌ ${api.name} falló:`, error.message)
      continue
    }
  }

  return conn.reply(m.chat,
    `❌ *Error al descargar video*\n\n` +
    `⚠️ Todos los métodos fallaron\n` +
    `💡 Intenta con otro video o más tarde`, m)
}

handler.command = handler.help = ['play', 'ytmp3', 'ytmp4', 'yta', 'ytv', 'mp4']
handler.tags = ['downloader']
handler.description = '🎵 Descarga audio y video de YouTube - Versión mejorada con youtube-dl-exec'

export default handler

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