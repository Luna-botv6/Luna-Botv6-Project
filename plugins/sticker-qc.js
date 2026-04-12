/* Codigo basado en GataBot-MD adaptado para LunaBot */

import { sticker } from '../src/libraries/sticker.js'
import axios from 'axios'
import fs from 'fs'

const handler = async (m, { conn, args }) => {
  const datas = global
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`))
  const tradutor = _translate.plugins.sticker_qc

  let text

  if (args.length >= 1) {
    text = args.slice(0).join(' ')
  } else if (m.quoted && m.quoted.text) {
    text = m.quoted.text
  } else throw tradutor.texto1

  if (!text) return m.reply(tradutor.texto2)

  const who = m.mentionedJid && m.mentionedJid[0]
    ? m.mentionedJid[0]
    : m.fromMe
    ? conn.user.jid
    : m.sender

  const mentionRegex = new RegExp(
    `@${who.split('@')[0].replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\s*`,
    'g'
  )

  const mishi = text.replace(mentionRegex, '')

  if (!mishi || !mishi.trim()) {
    return m.reply(tradutor.texto2)
  }

  if (mishi.length > 100) {
    return m.reply(tradutor.texto3)
  }

  let pp
  try {
    pp = await conn.profilePictureUrl(who, 'image')
  } catch {
    pp = 'https://telegra.ph/file/24fa902ead26340f3df2c.png'
  }

  let nombre
  try {
    nombre = await conn.getName(who)
  } catch {
    nombre = 'Usuario'
  }

  const safeName = typeof nombre === 'string' && nombre.length > 0 ? nombre : 'Usuario'

  const obj = {
    type: 'quote',
    format: 'png',
    backgroundColor: '#000000',
    width: 512,
    height: 768,
    scale: 2,
    messages: [
      {
        entities: [],
        avatar: true,
        from: {
          id: 1,
          name: safeName,
          photo: { url: pp }
        },
        text: mishi,
        replyMessage: {}
      }
    ]
  }

  try {
    const json = await axios.post(
      'https://bot.lyo.su/quote/generate',
      obj,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    )

    if (
      !json ||
      !json.data ||
      !json.data.result ||
      !json.data.result.image
    ) {
      return m.reply('No se pudo generar la imagen del quote.')
    }

    const buffer = Buffer.from(json.data.result.image, 'base64')
    const stiker = await sticker(buffer, false, global.packname, global.author)

    if (!stiker) {
      return m.reply('No se pudo generar el sticker.')
    }

    return conn.sendFile(m.chat, stiker, 'qc.webp', '', m)
  } catch (e) {
    console.error('Error en sticker-qc:', e?.response?.status || e)

    if (e?.response?.status === 403) {
      return m.reply('La API de quotes devolvió "forbidden". Es posible que el servicio haya bloqueado las peticiones. Intenta más tarde o con menos frecuencia.')
    }

    if (e?.code === 'ECONNABORTED') {
      return m.reply('La API tardó demasiado en responder.')
    }

    return m.reply('Ocurrió un error al generar el sticker de quote.')
  }
}

handler.help = ['qc']
handler.tags = ['sticker']
handler.command = /^(qc)$/i

export default handler
