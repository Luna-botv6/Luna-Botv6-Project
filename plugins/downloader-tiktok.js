import fs from 'fs'
import fetch from 'node-fetch'
import { interactiveUtils } from '../src/libraries/base/interactive.js'
import { obtenerMenuIuman, verificarMenuIuman } from '../src/assets/images/menu/languages/es/menu-img.js'
import { cargarOGenerarAPIKey } from '../src/libraries/api/apiKeyManager.js'

const configContent = fs.readFileSync('./config.js', 'utf-8')
if (!configContent.includes('Luna-Botv6')) throw new Error('Handler bloqueado')

try { verificarMenuIuman() } catch { throw new Error('Archivo de configuración faltante o inválido') }

const SERVER_URL = obtenerMenuIuman()
const API_KEY = cargarOGenerarAPIKey()
const CLIENT_NAME = 'luna-bot-v6'
const DL_HEADERS = { 'X-Client-Name': CLIENT_NAME, 'X-API-Key': API_KEY }

const sleep = ms => new Promise(r => setTimeout(r, ms))

const progressBar = (step, total = 5) => {
  const filled = '█'.repeat(step)
  const empty = '░'.repeat(total - step)
  const percent = Math.round((step / total) * 100)
  return filled + empty + ` ${percent}%`
}

const handler = async (m, { conn, text, args, usedPrefix, command }) => {
  const idioma = global.db.data.users[m.sender].language || global.defaultLenguaje
  const _translate = await import(`../src/lunaidiomas/${idioma}.json`, { assert: { type: 'json' } })
  const t = _translate.default.plugins.tiktok_dl

  const example = `${usedPrefix + command} https://www.tiktok.com/@lunabotv6/video/7562318278455037191`

  if (!text) return conn.reply(m.chat, t.no_text.replace('{example}', example), m)

  if (!/(?:https?:\/\/)?(?:www|vm|vt|t)?\.?tiktok\.com\/([^\s&]+)/gi.test(text)) {
    return conn.reply(m.chat, t.invalid_url.replace('{example}', example), m)
  }

  await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

  const steps = [
    t.step1.replace('{progress}', progressBar(1)),
    t.step2.replace('{progress}', progressBar(2)),
    t.step3.replace('{progress}', progressBar(3)),
    t.step4.replace('{progress}', progressBar(4)),
    t.step5.replace('{progress}', progressBar(5)),
  ]

  const sent = await conn.reply(m.chat, steps[0], m)

  for (let i = 1; i < steps.length; i++) {
    await sleep(800)
    await conn.sendMessage(m.chat, { text: steps[i], edit: sent.key })
  }

  try {
    const apiUrl = SERVER_URL + '/api/tiktok?url=' + encodeURIComponent(args[0])
    const res = await fetch(apiUrl, { headers: DL_HEADERS, timeout: 30000 })
    const data = await res.json()

    if (!data.status || !data.video) {
      await conn.sendMessage(m.chat, { text: t.no_video.replace('{progress}', progressBar(0)), edit: sent.key })
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
      return
    }

    await conn.sendMessage(m.chat, { text: t.ready.replace('{progress}', progressBar(5)), edit: sent.key })

    await conn.sendMessage(m.chat, { video: { url: data.video }, caption: t.caption }, { quoted: m })

    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

  } catch (e) {
    await conn.sendMessage(m.chat, {
      text: t.error.replace('{error}', e?.message || 'unknown').replace('{progress}', progressBar(0)),
      edit: sent.key
    })
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
  }
}

handler.help = ['tiktok', 'tt']
handler.tags = ['downloader']
handler.command = /^(tiktok|ttdl|tiktokdl|tiktoknowm|tt|ttnowm|tiktokaudio)$/i

export default handler
