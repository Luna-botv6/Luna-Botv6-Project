import fs from 'fs'
import fetch from 'node-fetch'
import { cargarOGenerarAPIKey } from '../src/libraries/api/apiKeyManager.js'
import { obtenerMenuIuman } from '../src/assets/images/menu/languages/es/menu-img.js'
import { proto } from '@whiskeysockets/baileys'
import { smsg } from '../src/libraries/base/serialization.js'

const SERVER_URL = obtenerMenuIuman()
const API_KEY = cargarOGenerarAPIKey()
const sleep = ms => new Promise(r => setTimeout(r, ms))

const handler = async (m, { conn, text }) => {
  const idioma = global.db.data.users[m.sender]?.language || global.defaultLenguaje
  const _translate = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`))
  const tradutor = _translate.plugins.herramientas_topdf

  const q = m.quoted || m
  let targets = []

  if (q.mtype === 'albumMessage') {
    await conn.sendMessage(m.chat, { react: { text: '🔍', key: m.key } })
    await sleep(4000)

    const chatId = q.chat || m.chat
    const albumId = q.id
    const chatMsgs = conn.chats[chatId]?.messages || {}
    const allMsgs = Object.values(chatMsgs)

    const albumInStore = allMsgs.find(msg => msg?.key?.id === albumId)
    const albumTs = Number(albumInStore?.messageTimestamp)

    let imgMsgs = albumTs
      ? allMsgs.filter(msg => {
          const mtype = Object.keys(msg?.message || {})[0]
          if (mtype !== 'imageMessage') return false
          const ts = Number(msg?.messageTimestamp)
          return ts >= albumTs && ts <= albumTs + 2
        })
      : []

    if (!imgMsgs.length) {
      imgMsgs = allMsgs
        .filter(msg => Object.keys(msg?.message || {})[0] === 'imageMessage')
        .slice(-10)
    }

    if (!imgMsgs.length) return m.reply(tradutor.texto1)

    targets = imgMsgs.map(msg => smsg(conn, proto.WebMessageInfo.fromObject(msg)))

  } else if (q.mtype === 'imageMessage' || q.mediaType === 'imageMessage') {
    targets = [q]
  } else {
    return m.reply(tradutor.texto1)
  }

  await conn.sendMessage(m.chat, { react: { text: '⚙️', key: m.key } })

  const images = []
  for (const [i, target] of targets.entries()) {
    try {
      const buf = await target.download()
      if (buf?.length) images.push(buf.toString('base64'))
    } catch (e) {
      console.log(`[topdf] download[${i}] error:`, e?.message)
    }
  }

  if (!images.length) return m.reply(tradutor.texto1)

  let pdfBuffer
  try {
    const res = await fetch(SERVER_URL + '/api/topdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
      body: JSON.stringify({ images, filename: text || m.pushName || 'documento' }),
      signal: AbortSignal.timeout(60000)
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || `HTTP ${res.status}`)
    }

    const contentType = res.headers.get('content-type') || ''
    if (!contentType.includes('application/pdf')) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Respuesta no es PDF')
    }

    pdfBuffer = Buffer.from(await res.arrayBuffer())
  } catch (e) {
    console.error('[topdf] Error API:', e.message)
    return m.reply(e.message)
  }

  await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

  await conn.sendMessage(
    m.chat,
    {
      document: pdfBuffer,
      mimetype: 'application/pdf',
      fileName: `${text || m.pushName || 'documento'}.pdf`
    },
    { quoted: m }
  )
}

handler.help = ['topdf <nombre>']
handler.tags = ['herramientas']
handler.command = /^(topdf|imgtopdf|imagepdf)$/i

export default handler