import fs from 'fs'
import fetch from 'node-fetch'
import { interactiveUtils } from '../src/libraries/base/interactive.js'
import { obtenerMenuIuman, verificarMenuIuman } from '../src/assets/images/menu/languages/es/menu-img.js'
import { cargarOGenerarAPIKey } from '../src/libraries/api/apiKeyManager.js'

const configContent = fs.readFileSync('./config.js', 'utf-8')
if (!configContent.includes('Luna-Botv6')) throw new Error('Handler bloqueado')
try { verificarMenuIuman() } catch { throw new Error('Archivo de configuracion faltante o invalido') }

const SERVER_URL = obtenerMenuIuman()
const API_KEY = cargarOGenerarAPIKey()
const DL_HEADERS = { 'X-Client-Name': 'luna-bot-v6', 'X-API-Key': API_KEY }
const TIMEOUT = 60000

const BOT = () => global.BotName || 'LUNA'
const sleep = ms => new Promise(r => setTimeout(r, ms))

const safeEdit = async (conn, jid, text, key) => {
  try { if (key && jid) await conn.sendMessage(jid, { text, edit: key }) } catch {}
}

const ft = async (url, headers = {}) => {
  const c = new AbortController()
  const t = setTimeout(() => c.abort(), TIMEOUT)
  try { const r = await fetch(url, { signal: c.signal, headers }); clearTimeout(t); return r }
  catch (e) { clearTimeout(t); throw e }
}

const card = (tipo, estado, data = {}) => {
  let body = `📸 Instagram ${tipo === 'audio' ? 'Audio' : 'Video'}`

  if (estado === 'conectando') {
    body += `\n⏳ Conectando...`
  } else if (estado === 'descargando') {
    body += `\n⬇️ Descargando...`
  } else if (estado === 'listo') {
    body += `\n📌 ${data.titulo || 'Contenido encontrado'}`

    if (data.total > 1) {
      body += `\n📂 ${data.total} archivos`
    }

    body += `\n◀◀ • ▶ • ▶▶`
    body += `\n📥 Descarga lista`
  } else if (estado === 'error') {
    body += `\n❌ ${data.error || 'Error desconocido'}`
  }

  body += `\n🌙 ${BOT()}`
  return body
}

async function descargar(conn, msg, tipo, url) {
  let editKey = null, jid = null
  try {
    const sent = await conn.sendMessage(msg.chat, { text: card(tipo, 'conectando') }, { quoted: msg })
    if (sent?.key) { editKey = sent.key; jid = sent.key.remoteJid }
    await safeEdit(conn, jid, card(tipo, 'descargando'), editKey)

    if (tipo === 'audio') {
      const res = await ft(SERVER_URL + '/api/social/audio?url=' + encodeURIComponent(url) + '&plataforma=instagram', DL_HEADERS)
      if (!res.ok) throw new Error('Error del servidor')
      const titulo = decodeURIComponent(res.headers.get('x-title') || 'audio')
      const buffer = Buffer.from(await res.arrayBuffer())
      if (buffer.length < 10000) throw new Error('Audio muy pequeño')
      await safeEdit(conn, jid, card(tipo, 'listo', { titulo }), editKey)
      await conn.sendMessage(msg.chat, { audio: buffer, mimetype: 'audio/mpeg', fileName: titulo + '.mp3', ptt: false }, { quoted: msg })
      return
    }

    const res = await ft(SERVER_URL + '/api/instagram?url=' + encodeURIComponent(url), DL_HEADERS)
    const data = await res.json()
    if (!data.status || !data.video) throw new Error(data.error || 'Sin media')

    const items = data.items?.length ? data.items : [{ url: data.video, thumbnail: data.thumbnail }]
    await safeEdit(conn, jid, card(tipo, 'listo', { titulo: data.titulo, total: items.length }), editKey)

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const itemUrl = item.url || item.video
      const isVideo = itemUrl?.includes('.mp4') || !!item.thumbnail
      const caption = `📸 ${data.titulo || ''}${items.length > 1 ? ` (${i + 1}/${items.length})` : ''}`

      if (isVideo) {
        await conn.sendMessage(msg.chat, { video: { url: itemUrl }, mimetype: 'video/mp4', caption }, { quoted: msg })
      } else {
        await conn.sendMessage(msg.chat, { image: { url: itemUrl }, caption }, { quoted: msg })
      }
      if (i < items.length - 1) await sleep(1500)
    }
  } catch (e) {
    await safeEdit(conn, jid, card(tipo, 'error', { error: e.message }), editKey)
  }
}

const handler = async (m, { conn, text, usedPrefix, command }) => {
  const idioma = global.db.data.users[m.sender]?.language || global.defaultLenguaje
  const _t = await import(`../src/lunaidiomas/${idioma}.json`, { with: { type: 'json' } })
  const t = _t.default.plugins.instagram_dl
  const example = `${usedPrefix + command} https://www.instagram.com/reel/DP7RggwD_1t/`

  if (command === 'instagram' || command === 'ig' || command === 'instagramdl' || command === 'igdl') {
    if (!text) return conn.reply(m.chat, t.no_text.replace('{example}', example), m)
    if (!/(?:https?:\/\/)?(?:www\.)?instagram\.com\/(reel|p|tv)\//i.test(text))
      return conn.reply(m.chat, t.invalid_url.replace('{example}', example), m)

    const msg_carousel =
      `📸 Instagram\n🔗 Enlace detectado\n◀◀ • ▶ • ▶▶\n📥 Selecciona un formato\n🌙 ${BOT()}`

    try {
      await interactiveUtils.sendNCarousel(conn, m.chat, msg_carousel, BOT(),
        'https://i.imgur.com/5TWWBHJ.jpeg',
        [['🎬 Video', usedPrefix + 'igvideo ' + text], ['🎵 Audio', usedPrefix + 'igaudio ' + text]],
        null, null, null, m, {})
    } catch {
      await conn.reply(m.chat, `🎬 *${usedPrefix}igvideo url*\n🎵 *${usedPrefix}igaudio url*`, m)
    }
    return
  }

  if (command === 'igvideo' || command === 'instagram2' || command === 'ig2') {
    if (!text) return conn.reply(m.chat, t.no_text.replace('{example}', example), m)
    descargar(conn, m, 'video', text).catch(() => {})
    return
  }

  if (command === 'igaudio' || command === 'instagram3' || command === 'ig3') {
    if (!text) return conn.reply(m.chat, t.no_text.replace('{example}', example), m)
    descargar(conn, m, 'audio', text).catch(() => {})
    return
  }
}

handler.help = ['instagram url', 'igvideo url', 'igaudio url']
handler.tags = ['downloader']
handler.command = /^(instagramdl|instagram|igdl|ig|instagram2|ig2|instagram3|ig3|igvideo|igaudio)$/i
export default handler