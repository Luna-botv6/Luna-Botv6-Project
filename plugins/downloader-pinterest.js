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
const TIMEOUT = 20000

const sleep = ms => new Promise(r => setTimeout(r, ms))
const ocultar = (m) => String(m || '').replace(/https?:\/\/\S+/g, '[enlace oculto]').replace(/key=\w+/gi, 'key=[oculta]')

const ft = async (url, headers = {}) => {
  const c = new AbortController()
  const t = setTimeout(() => c.abort(), TIMEOUT)
  try { const r = await fetch(url, { signal: c.signal, headers }); clearTimeout(t); return r }
  catch (e) { clearTimeout(t); throw e }
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
        await conn.sendMessage(m.chat, { video: { url: data.video }, caption: `🎬 ${data.titulo || 'Pinterest'}` }, { quoted: m })
      } else {
        await conn.sendMessage(m.chat, { image: { url: data.image }, caption: `📌 ${data.titulo || 'Pinterest'}` }, { quoted: m })
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
    const video = results.find(i => i.video)
    const images = results.filter(i => i.image && !i.video).slice(0, video ? 3 : 4)

    if (!images.length && !video) {
      return conn.reply(m.chat, '❌ No pude cargar los resultados. Intenta de nuevo.', m)
    }

    if (images.length) {
      const album = images.map(item => ({
        image: { url: item.image },
        caption: `📌 ${item.titulo?.trim() || 'Pinterest'}`
      }))
      try {
        await conn.sendMessage(m.chat, { album }, { quoted: m })
      } catch (e) {
        for (const item of images) {
          try {
            await conn.sendMessage(m.chat, { image: { url: item.image }, caption: `📌 ${item.titulo?.trim() || 'Pinterest'}` }, { quoted: m })
          } catch (e2) {}
        }
      }
    }

    if (video) {
      await sleep(2000)
      try {
        await conn.sendMessage(m.chat, { video: { url: video.video }, caption: `🎬 ${video.titulo?.trim() || 'Video - Pinterest'}` }, { quoted: m })
      } catch (e) {}
    }
  } catch (err) {
    conn.reply(m.chat, '❌ Error: ' + ocultar(err.message || err), m)
  }
}

handler.help = ['pinterest <búsqueda | enlace>']
handler.tags = ['downloader']
handler.command = /^(pinterest|pin)$/i

export default handler