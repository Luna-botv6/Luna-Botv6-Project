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
  let body = '🎵 TikTok ' + (tipo === 'audio' ? 'Audio' : 'Video')

  if (estado === 'conectando') {
    body += '\n⏳ Conectando...'
  } else if (estado === 'descargando') {
    body += '\n⬇️ Descargando...'
  } else if (estado === 'listo') {
    body += '\n📌 ' + (data.titulo || 'Contenido encontrado')

    if (data.autor) {
      body += '\n👤 ' + data.autor
    }

    body += '\n◀◀ • ▶ • ▶▶'
    body += '\n📥 Descarga lista'
  } else if (estado === 'error') {
    body += '\n❌ ' + (data.error || 'Error desconocido')
  }

  body += '\n🌙 ' + BOT()
  return body
}

async function descargar(conn, msg, tipo, url) {
  let editKey = null, jid = null
  try {
    const sent = await conn.sendMessage(msg.chat, { text: card(tipo, 'conectando') }, { quoted: msg })
    if (sent?.key) { editKey = sent.key; jid = sent.key.remoteJid }
    await safeEdit(conn, jid, card(tipo, 'descargando'), editKey)

    if (tipo === 'video') {
      const res = await ft(SERVER_URL + '/api/tiktok?url=' + encodeURIComponent(url), DL_HEADERS)
      const data = await res.json()
      if (!data.status || !data.video) throw new Error(data.error || 'Sin video')
      await safeEdit(conn, jid, card(tipo, 'listo', { titulo: data.titulo, autor: data.autor }), editKey)
      await conn.sendMessage(msg.chat, { video: { url: data.video }, caption: `🎵 ${data.titulo || ''}` }, { quoted: msg })
    } else {
      const res = await ft(SERVER_URL + '/api/social/audio?url=' + encodeURIComponent(url) + '&plataforma=tiktok', DL_HEADERS)
      if (!res.ok) throw new Error('Error del servidor')
      const titulo = decodeURIComponent(res.headers.get('x-title') || 'audio')
      const buffer = Buffer.from(await res.arrayBuffer())
      if (buffer.length < 10000) throw new Error('Audio muy pequeño')
      await safeEdit(conn, jid, card(tipo, 'listo', { titulo }), editKey)
      await conn.sendMessage(msg.chat, { audio: buffer, mimetype: 'audio/mpeg', fileName: titulo + '.mp3', ptt: false }, { quoted: msg })
    }
  } catch (e) {
    await safeEdit(conn, jid, card(tipo, 'error', { error: e.message }), editKey)
  }
}

const handler = async (m, { conn, text, usedPrefix, command }) => {
  const idioma = global.db.data.users[m.sender]?.language || global.defaultLenguaje
  const _t = await import(`../src/lunaidiomas/${idioma}.json`, { with: { type: 'json' } })
  const t = _t.default.plugins.tiktok_dl
  const example = `${usedPrefix + command} https://www.tiktok.com/@user/video/123`

  if (command === 'tiktok' || command === 'tt' || command === 'tiktokdl' || command === 'ttdl') {
    if (!text) return conn.reply(m.chat, t.no_text.replace('{example}', example), m)
    if (!/(?:https?:\/\/)?(?:www|vm|vt|t)?\.?tiktok\.com\/([^\s&]+)/gi.test(text))
      return conn.reply(m.chat, t.invalid_url.replace('{example}', example), m)

    const msg_carousel =
  '🎵 TikTok\n' +
  '🔗 Enlace detectado\n' +
  '◀◀ • ▶ • ▶▶\n' +
  '📥 Selecciona un formato\n' +
  '🌙 ' + BOT()


    try {
      await interactiveUtils.sendNCarousel(conn, m.chat, msg_carousel, BOT(),
        'https://i.imgur.com/5TWWBHJ.jpeg',
        [['🎬 Video', usedPrefix + 'ttvideo ' + text], ['🎵 Audio', usedPrefix + 'ttaudio ' + text]],
        null, null, null, m, {})
    } catch {
      await conn.reply(m.chat, `🎬 *${usedPrefix}ttvideo url*\n🎵 *${usedPrefix}ttaudio url*`, m)
    }
    return
  }

  if (command === 'ttvideo' || command === 'tiktoknowm') {
    if (!text) return conn.reply(m.chat, t.no_text.replace('{example}', example), m)
    descargar(conn, m, 'video', text).catch(() => {})
    return
  }

  if (command === 'ttaudio' || command === 'tiktokaudio' || command === 'ttnowm') {
    if (!text) return conn.reply(m.chat, t.no_text.replace('{example}', example), m)
    descargar(conn, m, 'audio', text).catch(() => {})
    return
  }
}

handler.help = ['tiktok url', 'ttvideo url', 'ttaudio url']
handler.tags = ['downloader']
handler.command = /^(tiktok|ttdl|tiktokdl|tiktoknowm|tt|ttnowm|tiktokaudio|ttvideo|ttaudio)$/i
export default handler
