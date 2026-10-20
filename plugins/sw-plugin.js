import fs from 'fs'
import fetch from 'node-fetch'
import { obtenerMenuIuman, verificarMenuIuman } from '../src/assets/images/menu/languages/es/menu-img.js'
import { cargarOGenerarAPIKey } from '../src/libraries/api/apiKeyManager.js'
import { cabecerasDescarga } from '../src/libraries/api/clientIdentity.js'
import { webp2png } from '../src/libraries/webp2mp4.js'

const configContent = fs.readFileSync('./config.js', 'utf-8')
if (!configContent.includes('Luna-Botv6')) throw new Error('Handler bloqueado')
try { verificarMenuIuman() } catch { throw new Error('Archivo de configuracion faltante o invalido') }

const SERVER_URL = obtenerMenuIuman()
const API_KEY = cargarOGenerarAPIKey()
const DL_HEADERS = cabecerasDescarga(API_KEY)
const TIMEOUT = 60000

const BOT = () => global.BotName || 'LUNA'

const ft = async (url, options = {}) => {
  const c = new AbortController()
  const t = setTimeout(() => c.abort(), TIMEOUT)
  try { const r = await fetch(url, { ...options, signal: c.signal }); clearTimeout(t); return r }
  catch (e) { clearTimeout(t); throw e }
}

const safeEdit = async (conn, jid, text, key) => {
  try { if (key && jid) await conn.sendMessage(jid, { text, edit: key }) } catch {}
}

const handler = async (m, { conn, usedPrefix, command }) => {
  const q = m.quoted ? m.quoted : m
  const mime = (q.msg || q).mimetype || ''

  if (/video/i.test(mime)) {
    return conn.reply(m.chat, `🎞️ *${usedPrefix + command}* solo funciona con imágenes o stickers estáticos, no con videos/GIFs.`, m)
  }

  if (!/image|webp/i.test(mime)) {
    return conn.reply(m.chat, `🖼️ Responde a una imagen o sticker con *${usedPrefix + command}* para quitarle el fondo.`, m)
  }

  let editKey = null, jid = null
  try {
    const sent = await conn.sendMessage(m.chat, { text: `🪄 Quitando el fondo...\n🌙 ${BOT()}` }, { quoted: m })
    if (sent?.key) { editKey = sent.key; jid = sent.key.remoteJid }

    console.log(`[SW-DEBUG] mime detectado: "${mime}"`)

    let buffer = await q.download()
    if (!buffer || buffer.length < 100) throw new Error('No se pudo descargar la imagen')
    console.log(`[SW-DEBUG] buffer descargado: ${buffer.length} bytes | primeros bytes: ${buffer.slice(0, 12).toString('hex')}`)

    if (/webp/i.test(mime)) {
      console.log(`[SW-DEBUG] mime es webp, llamando a webp2png()`)
      const out = await webp2png(buffer)
      console.log(`[SW-DEBUG] webp2png devolvió tipo: ${typeof out} | esBuffer: ${Buffer.isBuffer(out)} | valor: ${Buffer.isBuffer(out) ? out.length + ' bytes' : String(out).slice(0, 120)}`)
      if (Buffer.isBuffer(out)) {
        buffer = out
      } else if (typeof out === 'string' && out) {
        console.log(`[SW-DEBUG] tratando resultado como URL, descargando: ${out}`)
        const r = await ft(out)
        buffer = Buffer.from(await r.arrayBuffer())
      } else {
        throw new Error('No se pudo convertir el sticker a imagen')
      }
      if (!buffer || buffer.length < 100) throw new Error('No se pudo convertir el sticker a imagen')
      console.log(`[SW-DEBUG] buffer final tras conversión: ${buffer.length} bytes | primeros bytes: ${buffer.slice(0, 12).toString('hex')}`)
    }

    const res = await ft(SERVER_URL + '/api/sticker/nobg', {
      method: 'POST',
      headers: { ...DL_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: buffer.toString('base64'), pack: BOT(), author: BOT() })
    })
    console.log(`[SW-DEBUG] respuesta del server: status=${res.status} ok=${res.ok}`)

    if (!res.ok) {
      let bodyText = ''
      try { bodyText = await res.text() } catch {}
      console.log(`[SW-DEBUG] body de error del server: ${bodyText.slice(0, 300)}`)
      let serverError = 'Error del servidor'
      try { serverError = JSON.parse(bodyText).error || serverError } catch {}
      throw new Error(serverError)
    }
    const stickerBuf = Buffer.from(await res.arrayBuffer())
    if (stickerBuf.length < 100) throw new Error('Sticker vacío')

    await conn.sendMessage(m.chat, { sticker: stickerBuf }, { quoted: m })
    try { if (editKey && jid) await conn.sendMessage(jid, { delete: editKey }) } catch {}
  } catch (e) {
    console.log(`[SW-DEBUG] error atrapado: ${e.message}`)
    await safeEdit(conn, jid, `❌ ${e.message}\n🌙 ${BOT()}`, editKey)
  }
}

handler.help = ['sw (responde una imagen)']
handler.tags = ['sticker']
handler.command = /^(sw|swep)$/i
export default handler
