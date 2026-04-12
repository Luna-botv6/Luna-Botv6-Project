import fs from 'fs'
import fetch from 'node-fetch'
import { cargarOGenerarAPIKey } from '../src/libraries/api/apiKeyManager.js'
import { obtenerMenuIuman, verificarMenuIuman } from '../src/assets/images/menu/languages/es/menu-img.js'

const configContent = fs.readFileSync('./config.js', 'utf-8')
if (!configContent.includes('Luna-Botv6')) throw new Error('Handler bloqueado')

try {
  verificarMenuIuman()
} catch (err) {
  throw new Error('Archivo de configuración faltante')
}

const SERVER_URL = obtenerMenuIuman()
const API_KEY = cargarOGenerarAPIKey()
const CLIENT_NAME = 'luna-bot-v6'

function bar(n) {
  const total = 10
  return '🟩'.repeat(n) + '⬜'.repeat(total - n)
}

async function safeReply(conn, chat, text, quoted) {
  try {
    return await conn.reply(chat, text, quoted)
  } catch {
    return null
  }
}

async function safeSend(conn, chat, content, options) {
  try {
    return await conn.sendMessage(chat, content, options)
  } catch {
    return null
  }
}

async function safeEdit(conn, jid, text, key) {
  try {
    if (!key || !jid) return null
    return await conn.sendMessage(jid, { text, edit: key })
  } catch {
    return null
  }
}

async function fetchWithTimeout(url, timeout = 120000, method = 'GET', headers = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const response = await fetch(url, { signal: controller.signal, method, headers })
    clearTimeout(timer)
    return response
  } catch (err) {
    clearTimeout(timer)
    throw err
  }
}

async function generarGif(conn, m, estilo, texto) {
  let progressKey = null
  let progressJid = null

  try {
    const start = Date.now()

    const msg = await safeSend(conn, m.chat, {
      text: `🌙🤖 *Luna-Botv6*\n${bar(2)}\n⏳ Generando GIF...`
    }, { quoted: m })

    if (msg && msg.key) {
      progressKey = msg.key
      progressJid = msg.key.remoteJid
    }

    await safeEdit(conn, progressJid, `🌙🤖 *Luna-Botv6*\n${bar(4)}\n📌 Conectando con servidor...`, progressKey)

    const endpoint = `${SERVER_URL}/api/textstudio/generate?text=${encodeURIComponent(texto)}&style=${encodeURIComponent(estilo)}`

    const apiRes = await fetchWithTimeout(endpoint, 120000, 'GET', {
      'X-Client-Name': CLIENT_NAME,
      'X-API-Key': API_KEY
    })

    if (!apiRes.ok) {
      const contentType = apiRes.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        const json = await apiRes.json()
        throw new Error(json.error || 'Error en la generación')
      }
      throw new Error(`Error ${apiRes.status}`)
    }

    const contentType = apiRes.headers.get('content-type') || ''

    if (!contentType.includes('image') && !contentType.includes('video')) {
      throw new Error('Respuesta no es una imagen/video')
    }

    const arrayBuffer = await apiRes.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    if (buffer.length < 5000) {
      throw new Error(`Archivo muy pequeño (${buffer.length} bytes)`)
    }

    await safeSend(conn, m.chat, {
      video: buffer,
      mimetype: 'video/mp4',
      caption: `✨ *TextStudio*\n\n"${texto}"\n\n🌙 *Luna-Botv6*`,
      gifPlayback: true
    }, { quoted: m })

    const time = ((Date.now() - start) / 1000).toFixed(2)

    await safeEdit(
      conn,
      progressJid,
      `🌙🤖 *Luna-Botv6*\n${bar(10)}\n✅ GIF generado en ${time}s\n✨ Estilo: ${estilo}\n📝 "${texto}"\n🌙 *Luna-Botv6 TextStudio API*`,
      progressKey
    )

    return true

  } catch (err) {
    console.error('[TextStudio]', err.message)

    const errorMsg = `❌ Error en la generación\n\n📝 ${err.message}`

    if (progressKey) {
      await safeEdit(conn, progressJid, errorMsg, progressKey)
    } else {
      await safeReply(conn, m.chat, errorMsg, m)
    }

    return false
  }
}

const handler = async (m, { conn, text, command, usedPrefix }) => {
  if (command === 'st') {
    if (!text) {
      await safeReply(
        conn,
        m.chat,
        `🌙 *Generador de Texto Animado*\n\n📝 Uso: ${usedPrefix}st [ESTILO] [TEXTO]\n\nEjemplo:\n${usedPrefix}st 0 Hola mundo\n${usedPrefix}st 1 Luna Bot\n${usedPrefix}st 5 Increíble`,
        m
      )
      return
    }

    const partes = text.split(' ')

    if (partes.length < 2) {
      await safeReply(
        conn,
        m.chat,
        `❌ Uso: ${usedPrefix}st [ESTILO] [TEXTO]\n\nEjemplo: ${usedPrefix}st 0 Hola mundo`,
        m
      )
      return
    }

    const estilo = partes[0].trim()
    const texto = partes.slice(1).join(' ')

    if (!estilo || isNaN(estilo)) {
      await safeReply(conn, m.chat, '❌ El estilo debe ser un número (0, 1, 2, etc)', m)
      return
    }

    if (texto.length > 100) {
      await safeReply(conn, m.chat, '❌ El texto no puede exceder 100 caracteres', m)
      return
    }

    generarGif(conn, m, estilo, texto).catch(err => {
      safeReply(conn, m.chat, `❌ Error: ${err.message}`, m)
    })
    return
  }
}

handler.command = ['st']
handler.tags = ['generator']
handler.help = ['st [estilo] [texto]']

export default handler