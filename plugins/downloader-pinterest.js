import fs from 'fs'
import fetch from 'node-fetch'
import { obtenerMenuIuman, verificarMenuIuman } from '../src/assets/images/menu/languages/es/menu-img.js'
import { cargarOGenerarAPIKey } from '../src/libraries/api/apiKeyManager.js'

const configContent = fs.readFileSync('./config.js', 'utf-8')
if (!configContent.includes('Luna-Botv6')) throw new Error('Handler bloqueado')
try { verificarMenuIuman() } catch { throw new Error('Archivo de configuracion faltante o invalido') }

const SERVER_URL = obtenerMenuIuman()
const API_KEY = cargarOGenerarAPIKey()
const DL_HEADERS = { 'X-Client-Name': 'luna-bot-v6', 'X-API-Key': API_KEY }
const TIMEOUT = 25000
const TIMEOUT_MEDIA = 60000

const sleep = ms => new Promise(r => setTimeout(r, ms))
const ocultar = (m) => String(m || '').replace(/https?:\/\/\S+/g, '[enlace oculto]').replace(/key=\w+/gi, 'key=[oculta]')

const ft = async (url, headers = {}, timeout = TIMEOUT) => {
  const c = new AbortController()
  const t = setTimeout(() => c.abort(), timeout)
  try { const r = await fetch(url, { signal: c.signal, headers }); clearTimeout(t); return r }
  catch (e) { clearTimeout(t); throw e }
}

const esImagen = buf => buf.length > 1000 && (
  (buf[0] === 0xff && buf[1] === 0xd8) ||
  (buf[0] === 0x89 && buf[1] === 0x50) ||
  (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) ||
  (buf.length > 12 && buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP')
)

const esVideo = buf => buf.length > 10000 && buf.slice(4, 8).toString('ascii') === 'ftyp'

const bajarMedia = async (url, tipo) => {
  const headers = typeof url === 'string' && url.startsWith(SERVER_URL) ? DL_HEADERS : {}
  const res = await ft(url, headers, TIMEOUT_MEDIA)
  if (!res.ok) throw new Error('Error descargando la media del servidor')
  const buffer = Buffer.from(await res.arrayBuffer())
  if (tipo === 'video' ? !esVideo(buffer) : !esImagen(buffer)) throw new Error('Media invalida desde el servidor')
  return buffer
}

const isUrl = (text) => {
  try {
    const url = new URL(text)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch { return false }
}

const isPinterestUrl = (text) => /pinterest\.(com|es|co\.uk|fr|de)|pin\.it/i.test(text)

const handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) {
    return conn.reply(m.chat,
`📌 *Pinterest* 

Con este comando puedes buscar imágenes y videos de Pinterest o descargar un pin directamente con su enlace.

🔎 *Buscar por palabra:*
${usedPrefix + command} Naruto
${usedPrefix + command} aesthetic wallpapers
${usedPrefix + command} recetas de cocina

⬇️ *Descargar con enlace:*
${usedPrefix + command} https://pin.it/xxxxxxx
${usedPrefix + command} https://pinterest.com/pin/123456

Te mostraré hasta 4 imágenes en un álbum y 1 video si está disponible 🎬`, m)
  }

  try {
    if (isUrl(text) && isPinterestUrl(text)) {
      await conn.reply(m.chat, '⬇️ Descargando pin...', m)
      const res = await ft(SERVER_URL + '/api/social/pinterest?url=' + encodeURIComponent(text), DL_HEADERS)
      if (!res.ok) throw new Error('Error del servidor')
      const data = await res.json()
      if (!data.status || data.tipo !== 'pin' || (!data.video && !data.image)) {
        return conn.reply(m.chat, '❌ No pude obtener el contenido de ese pin. Intenta con otro enlace.', m)
      }
      if (data.video) {
        const video = await bajarMedia(data.video, 'video')
        await conn.sendMessage(m.chat, { video, mimetype: 'video/mp4', caption: `🎬 ${data.titulo || 'Pinterest'}` }, { quoted: m })
      } else {
        const image = await bajarMedia(data.image, 'image')
        await conn.sendMessage(m.chat, { image, caption: `📌 ${data.titulo || 'Pinterest'}` }, { quoted: m })
      }
      return
    }

    await conn.reply(m.chat, '🔎 Buscando en Pinterest...', m)
    const res = await ft(SERVER_URL + '/api/social/pinterest?q=' + encodeURIComponent(text), DL_HEADERS)
    if (!res.ok) throw new Error('Error del servidor')
    const data = await res.json()
    if (!data.status || !Array.isArray(data.results) || !data.results.length) {
      return conn.reply(m.chat, '❌ No encontré resultados para: ' + text, m)
    }

    const results = [...data.results].sort(() => Math.random() - 0.5)
    const conVideo = results.find(i => i.video)
    const candidatas = results.filter(i => i.image && !i.video).slice(0, conVideo ? 3 : 4)

    const imagenes = []
    for (const item of candidatas) {
      try {
        const buffer = await bajarMedia(item.image, 'image')
        imagenes.push({ buffer, caption: `📌 ${item.titulo?.trim() || 'Pinterest'}` })
      } catch (e) {
        console.error('[pinterest] error bajando imagen:', e.message)
      }
    }

    let videoBuf = null
    let videoCaption = ''
    if (conVideo) {
      try {
        videoBuf = await bajarMedia(conVideo.video, 'video')
        videoCaption = `🎬 ${conVideo.titulo?.trim() || 'Video - Pinterest'}`
      } catch (e) {
        console.error('[pinterest] error bajando video:', e.message)
      }
    }

    if (!imagenes.length && !videoBuf) {
      return conn.reply(m.chat, '❌ No pude cargar los resultados. Intenta de nuevo.', m)
    }

    if (imagenes.length) {
      const album = imagenes.map(i => ({ image: i.buffer, caption: i.caption }))
      try {
        await conn.sendMessage(m.chat, { album }, { quoted: m })
      } catch (e) {
        for (const i of imagenes) {
          try {
            await conn.sendMessage(m.chat, { image: i.buffer, caption: i.caption }, { quoted: m })
          } catch (e2) {
            console.error('[pinterest] error enviando imagen:', e2.message)
          }
        }
      }
    }

    if (videoBuf) {
      await sleep(2000)
      try {
        await conn.sendMessage(m.chat, { video: videoBuf, mimetype: 'video/mp4', caption: videoCaption }, { quoted: m })
      } catch (e) {
        console.error('[pinterest] error enviando video:', e.message)
      }
    }
  } catch (err) {
    conn.reply(m.chat, '❌ Error: ' + ocultar(err.message || err), m)
  }
}

handler.help = ['pinterest <búsqueda | enlace>']
handler.tags = ['downloader']
handler.command = /^(pinterest|pin)$/i

export default handler
