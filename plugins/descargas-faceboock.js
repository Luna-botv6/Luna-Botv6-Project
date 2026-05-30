import fs from 'fs'
import fetch from 'node-fetch'
import { obtenerMenuIuman, verificarMenuIuman } from '../src/assets/images/menu/languages/es/menu-img.js'
import { cargarOGenerarAPIKey } from '../src/libraries/api/apiKeyManager.js'

const configContent = fs.readFileSync('./config.js', 'utf-8')
if (!configContent.includes('Luna-Botv6')) throw new Error('Handler bloqueado')

try { verificarMenuIuman() } catch { throw new Error('Archivo de configuración faltante o inválido') }

const SERVER_URL = obtenerMenuIuman()
const API_KEY = cargarOGenerarAPIKey()
const CLIENT_NAME = 'luna-bot-v6'
const DL_HEADERS = { 'X-Client-Name': CLIENT_NAME, 'X-API-Key': API_KEY }

const handler = async (m, { conn, text, usedPrefix, command }) => {
  const idioma = global.db.data.users[m.sender]?.language || global.defaultLenguaje
  const _translate = await import(`../src/lunaidiomas/${idioma}.json`, { with: { type: 'json' } })
  const t = _translate.default.plugins.facebook_dl
  const example = `${usedPrefix + command} https://www.facebook.com/reel/1341328334215918`

  if (!text) return conn.reply(m.chat, t.no_text.replace('{example}', example), m)

  if (!/(?:https?:\/\/)?(?:www\.|m\.)?(?:facebook\.com|fb\.watch)\/\S+/i.test(text)) {
    return conn.reply(m.chat, t.invalid_url.replace('{example}', example), m)
  }

  await conn.sendMessage(m.chat, { react: { text: '⏱️', key: m.key } })
  await conn.reply(m.chat, t.downloading, m)

  try {
    const apiUrl = SERVER_URL + '/api/facebook?url=' + encodeURIComponent(text)
    const res = await fetch(apiUrl, { headers: DL_HEADERS, timeout: 30000 })
    const data = await res.json()

    if (!data.status || !data.video) {
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
      return conn.reply(m.chat, t.no_url, m)
    }

    await conn.sendMessage(m.chat, { video: { url: data.video }, mimetype: 'video/mp4', caption: t.success_caption }, { quoted: m })
    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

  } catch (error) {
    console.error('[FB-DL] Error:', error?.message)
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    return conn.reply(m.chat, t.error, m)
  }
}

handler.help = ['facebook', 'fb']
handler.tags = ['downloader']
handler.command = /^(facebook|fb|facebookdl|fbdl)$/i
export default handler
