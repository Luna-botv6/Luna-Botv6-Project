import fs from 'fs'
import ytSearch from 'yt-search'
import fetch from 'node-fetch'
import { interactiveUtils } from '../src/libraries/base/interactive.js'
import { obtenerMenuIuman, verificarMenuIuman } from '../src/assets/images/menu/languages/es/menu-img.js'
import { cargarOGenerarAPIKey } from '../src/libraries/api/apiKeyManager.js'
import { gcForce } from '../lib/gcHelper.js'

const configContent = fs.readFileSync('./config.js', 'utf-8')
if (!configContent.includes('Luna-Botv6')) throw new Error('Handler bloqueado')

try { verificarMenuIuman() } catch { throw new Error('Archivo de configuración faltante o inválido') }

const SERVER_URL = obtenerMenuIuman()
const API_KEY = cargarOGenerarAPIKey()
const FETCH_TIMEOUT = 90000
const DOWNLOAD_TIMEOUT = 180000
const CLIENT_NAME = 'luna-bot-v6'
const YT_RE = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i
const bar = n => '🟩'.repeat(n) + '⬜'.repeat(10 - n)
const DL_HEADERS = { 'X-Client-Name': CLIENT_NAME, 'X-API-Key': API_KEY }

const safeReply = async (conn, jid, text, msg) => {
  try { return await conn.reply(jid, text, msg) } catch { return null }
}

const safeSend = async (conn, jid, content, opts) => {
  try { return await conn.sendMessage(jid, content, opts) } catch { return null }
}

const safeEdit = async (conn, remoteJid, text, editKey) => {
  try {
    if (!editKey || !remoteJid) return null
    return await conn.sendMessage(remoteJid, { text, edit: editKey })
  } catch { return null }
}

const fetchWithTimeout = async (url, timeout = FETCH_TIMEOUT, method = 'GET', headers = {}) => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const res = await fetch(url, { signal: controller.signal, method, headers })
    clearTimeout(timer)
    return res
  } catch (e) {
    clearTimeout(timer)
    throw e
  }
}

const validarLink = async url => {
  try {
    const res = await fetchWithTimeout(url, 15000, 'HEAD', DL_HEADERS)
    if (res.ok) return true
  } catch {}
  try {
    const res = await fetchWithTimeout(url, 15000, 'GET', DL_HEADERS)
    return res.ok
  } catch { return false }
}

const sendAndFree = async (conn, jid, quotedMsg, tipo, buffer, titulo, servicio) => {
  if (tipo === 'ytmp3') {
    await safeSend(conn, jid, {
      audio: buffer,
      mimetype: 'audio/mpeg',
      fileName: titulo + '.mp3',
      ptt: false
    }, { quoted: quotedMsg })
  } else {
    await safeSend(conn, jid, {
      video: buffer,
      mimetype: 'video/mp4',
      caption: '🎬 ' + titulo + '\n📧 Servicio: ' + servicio,
      gifPlayback: false
    }, { quoted: quotedMsg })
  }
  buffer = null
  gcForce('sendAndFree')
}

async function downloadMedia(conn, msg, tipo, url, usedPrefix = '') {
  let editKey = null
  let remoteJid = null

  try {
    const startTime = Date.now()

    const sentMsg = await safeSend(conn, msg.chat, {
      text: '🌙🤖 *Luna-Botv6*\n' + bar(2) + '\n📌 Conectando con servidor...'
    }, { quoted: msg })

    if (sentMsg?.key) {
      editKey = sentMsg.key
      remoteJid = sentMsg.key.remoteJid
    }

    await safeEdit(conn, remoteJid,
      '🌙🤖 *Luna-Botv6*\n' + bar(4) + '\n⬇️ Descargando...',
      editKey
    )

    const endpoint = tipo === 'ytmp3' ? 'mp3' : 'mp4'
    const apiUrl = SERVER_URL + '/api/yt/' + endpoint + '?url=' + encodeURIComponent(url)

    const res = await fetchWithTimeout(apiUrl, DOWNLOAD_TIMEOUT, 'GET', DL_HEADERS)
    if (!res?.ok) {
      if (res?.status === 401) throw new Error('API_KEY_NO_VERIFICADA')
      if (res?.status === 403) throw new Error('API_KEY_NO_VERIFICADA')
      throw new Error('No se pudo completar la operación')
    }

    const contentType = res.headers.get('content-type') || ''
    const servicio = res.headers.get('x-service-used') || 'Desconocido'
    const tipoLabel = tipo === 'ytmp3' ? '🎵 Audio' : '🎬 Video'

    await safeEdit(conn, remoteJid,
      '🌙🤖 *Luna-Botv6*\n' + bar(6) + '\n⬇️ Descargando...\n📧 Servicio: ' + servicio,
      editKey
    )

    if (contentType.includes('audio/mpeg') || contentType.includes('video/mp4')) {
      let buffer = Buffer.from(await res.arrayBuffer())
      if (buffer.length < 10000) throw new Error('Archivo muy pequeño (' + buffer.length + ' bytes)')

      const titulo = decodeURIComponent(res.headers.get('x-title') || 'Media')

      await sendAndFree(conn, msg.chat, msg, tipo, buffer, titulo, servicio)

      const tiempo = ((Date.now() - startTime) / 1000).toFixed(2)
      await safeEdit(conn, remoteJid,
        '🌙🤖 *Luna-Botv6*\n' + bar(10) +
        '\n✅ ' + tipoLabel + ' descargada "' + titulo + '" en ' + tiempo +
        's\n📧 Servicio: ' + servicio +
        '\n🌐 *Luna-Botv6 music API*',
        editKey
      )
      return true
    }

    if (contentType.includes('application/json')) {
      const data = await res.json()
      if (!data.status || !data.resultado) throw new Error('No se pudo procesar la solicitud')

      const titulo = (data.resultado.titulo || 'Media').replace(/[\\/:*?"<>|]/g, '').slice(0, 80)
      const svc = data.resultado.servicio || 'Desconocido'
      const enlace = data.resultado.enlaceDescarga

      if (!enlace) throw new Error('No se recibió enlace de descarga')

      await safeEdit(conn, remoteJid,
        '🌙🤖 *Luna-Botv6*\n' + bar(7) + '\n⬇️ Descargando...\n📧 Servicio: ' + svc,
        editKey
      )

      if (!await validarLink(enlace)) throw new Error('Enlace de descarga inválido o expirado')

      const dlRes = await fetchWithTimeout(enlace, DOWNLOAD_TIMEOUT, 'GET', DL_HEADERS)
      if (!dlRes.ok) throw new Error('No se pudo completar la operación')

      let buffer = Buffer.from(await dlRes.arrayBuffer())
      if (buffer.length < 10000) throw new Error('Archivo muy pequeño (' + buffer.length + ' bytes)')

      await sendAndFree(conn, msg.chat, msg, tipo, buffer, titulo, svc)

      const tiempo = ((Date.now() - startTime) / 1000).toFixed(2)
      await safeEdit(conn, remoteJid,
        '🌙🤖 *Luna-Botv6*\n' + bar(10) +
        '\n✅ ' + tipoLabel + ' descargada "' + titulo + '" en ' + tiempo +
        's\n📧 Servicio: ' + svc +
        '\n🌐 *Luna-Botv6 music API*',
        editKey
      )
      return true
    }

    throw new Error('Respuesta no reconocida: ' + contentType)

  } catch (err) {
    console.error('[Sistema] Procesamiento interrumpido:', err.message)

    const retryCmd = tipo === 'ytmp3' ? 'ytmp3' : 'ytmp4'

    const esNoVerificada = err.message === 'API_KEY_NO_VERIFICADA'
    const errMsg = esNoVerificada
      ? '🔐 *Bot no autorizado*\n\n⚠️ Este bot no tiene permisos para usar la API de descargas\n\n_Contacta al administrador para verificar el acceso_'
      : '❌ *No se pudo procesar*\n\n📛 Intenta con otro enlace\n\n_💡 Si no funciona, prueba con otro nombre o verifica los permisos del bot_'

    const retryBtns = esNoVerificada ? [] : [['🔄 Reintentar', usedPrefix + retryCmd + ' ' + url]]

    if (editKey) await safeEdit(conn, remoteJid, errMsg, editKey)

    if (!esNoVerificada) {
      try {
        await interactiveUtils.sendNCarousel(conn, msg.chat, errMsg, 'Luna-Botv6', 'https://i.imgur.com/5TWWBHJ.jpeg', retryBtns, null, null, null, msg, {})
      } catch {
        await safeReply(conn, msg.chat, errMsg, msg)
      }
    }

    return false
  }
}

const handler = async (msg, { conn, text, command, usedPrefix }) => {
  if (command === 'play') {
    if (!text) {
      await safeReply(conn, msg.chat, '🎵 Escribe el nombre de la canción o pega el enlace de YouTube', msg)
      return
    }
    try {
      const esLink = YT_RE.test(text)
      const botones = [
        ['🎵 Audio', usedPrefix + 'ytmp3 ' + (esLink ? text : '')],
        ['🎬 Video', usedPrefix + 'ytmp4 ' + (esLink ? text : '')]
      ]

      if (esLink) {
        await interactiveUtils.sendNCarousel(conn, msg.chat,
          '🎶 *Descarga de YouTube*\n\n📺 ' + text + '\n\n_Usando API propia_',
          'Luna-Botv6', 'https://i.imgur.com/5TWWBHJ.jpeg',
          botones, null, null, null, msg, {}
        )
        return
      }

      const { videos } = await ytSearch(text)
      const video = videos?.[0]

      if (!video) {
        await safeReply(conn, msg.chat, '❌ No se encontró ningún resultado', msg)
        return
      }

      const videoUrl = 'https://youtu.be/' + video.videoId
      botones[0][1] = usedPrefix + 'ytmp3 ' + videoUrl
      botones[1][1] = usedPrefix + 'ytmp4 ' + videoUrl

      await interactiveUtils.sendNCarousel(conn, msg.chat,
        '🎶 *' + video.title + '*\n🎤 ' + (video.author?.name || 'Desconocido') +
        '\n⏱️ ' + (video.timestamp || '0:00') + '\n\n_Usando API propia_',
        'Luna-Botv6',
        video.thumbnail,
        botones, null, null, null, msg, {}
      )
    } catch (err) {
      await safeReply(conn, msg.chat, '❌ Error en la búsqueda: ' + err.message, msg)
    }
    return
  }

  if (command === 'ytmp3' || command === 'ytmp4') {
    if (!text) {
      await safeReply(conn, msg.chat, '❌ Falta el enlace de YouTube', msg)
      return
    }
    if (!YT_RE.test(text)) {
      await safeReply(conn, msg.chat, '❌ Enlace de YouTube inválido', msg)
      return
    }
    downloadMedia(conn, msg, command, text, usedPrefix)
      .catch(err => safeReply(conn, msg.chat, '❌ Error crítico: ' + err.message, msg))
  }
}

handler.command = ['play', 'ytmp3', 'ytmp4']
handler.tags = ['downloader']
handler.help = ['play nombre/url', 'ytmp3 url', 'ytmp4 url']

export default handler