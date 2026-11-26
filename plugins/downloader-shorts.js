import fs from 'fs'
import fetch from 'node-fetch'
import { obtenerMenuIuman, verificarMenuIuman } from '../src/assets/images/menu/languages/es/menu-img.js'
import { cargarOGenerarAPIKey } from '../src/libraries/api/apiKeyManager.js'
import { cabecerasDescarga } from '../src/libraries/api/clientIdentity.js'

const configContent = fs.readFileSync('./config.js', 'utf-8')
if (!configContent.includes('Luna-Botv6')) throw new Error('Handler bloqueado')
try { verificarMenuIuman() } catch { throw new Error('Archivo de configuracion faltante o invalido') }

const SERVER_URL = obtenerMenuIuman()
const API_KEY = cargarOGenerarAPIKey()
const DL_HEADERS = cabecerasDescarga(API_KEY)
const TIMEOUT = 180000

const BOT = () => global.BotName || 'LUNA'
const ocultar = (m) => String(m || '').replace(/https?:\/\/\S+/g, '[enlace oculto]').replace(/key=\w+/gi, 'key=[oculta]')

const ft = async (url, headers = {}) => {
  const c = new AbortController()
  const t = setTimeout(() => c.abort(), TIMEOUT)
  try { const r = await fetch(url, { signal: c.signal, headers }); clearTimeout(t); return r }
  catch (e) { clearTimeout(t); throw e }
}

const handler = async (m, { conn, text, usedPrefix, command }) => {
  let url = String(text || '').trim()
  const ejemplo = `${usedPrefix + command} https://www.youtube.com/shorts/VIDEO_ID`

  if (!url) {
    return conn.reply(m.chat,
      `📱 *YOUTUBE SHORTS*\n\n` +
      `Enviá el link del short o una búsqueda.\n\n` +
      `📌 *Ejemplo*\n${ejemplo}\n` +
      `🔍 También: ${usedPrefix + command} gatos graciosos\n` +
      `🌙 ${BOT()}`, m)
  }

  const esLink = /(?:youtube\.com\/(?:shorts\/|watch\?|live\/)|youtu\.be\/)/i.test(url)
  await conn.reply(m.chat, `📱 *YOUTUBE SHORTS*\n\n⏳ Descargando...\n🌙 ${BOT()}`, m)

  try {
    if (!esLink) {
      const busqueda = await ft(SERVER_URL + '/api/yt/search?q=' + encodeURIComponent(url), DL_HEADERS)
      const data = await busqueda.json().catch(() => null)
      const primero = data?.videos?.[0]
      if (!primero?.url) throw new Error('No encontré resultados para esa búsqueda')
      url = primero.url
    }

    const res = await ft(SERVER_URL + '/api/yt/shorts?url=' + encodeURIComponent(url), DL_HEADERS)
    const contentType = res.headers.get('content-type') || ''
    let buffer = null
    let titulo = null

    if (contentType.includes('application/json')) {
      const data = await res.json().catch(() => null)
      if (!data?.status) throw new Error(data?.error || 'No se pudo descargar el short')
      titulo = data.resultado?.titulo
      const enlace = data.resultado?.enlaceDescarga
      if (!enlace) throw new Error('El servidor no devolvió el video')
      const media = await ft(enlace, DL_HEADERS)
      if (!media.ok) throw new Error('Error bajando el video del servidor')
      buffer = Buffer.from(await media.arrayBuffer())
    } else {
      if (!res.ok) throw new Error('Error del servidor de descargas')
      titulo = decodeURIComponent(res.headers.get('x-title') || '')
      buffer = Buffer.from(await res.arrayBuffer())
    }

    if (!buffer || buffer.length < 10000) throw new Error('El video llegó vacío o inválido')

    await conn.sendMessage(m.chat, {
      video: buffer,
      mimetype: 'video/mp4',
      caption: `📱 *${(titulo || 'YouTube Short').slice(0, 120)}*\n🌙 ${BOT()}`,
      gifPlayback: false
    }, { quoted: m })
  } catch (e) {
    const mensaje = /500|502|503|504|fetch|abort/i.test(e.message)
      ? 'El servidor tardó demasiado. Probá de nuevo o usá un link directo.'
      : ocultar(e.message)
    await conn.reply(m.chat, `❌ *No se pudo descargar*\n\n${mensaje}\n🌙 ${BOT()}`, m)
  }
}

handler.help = ['shorts link/búsqueda']
handler.tags = ['downloader']
handler.command = /^(shorts|ytshorts|shortyts)$/i
export default handler
