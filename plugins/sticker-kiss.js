import fs from 'fs'
import { sticker } from '../src/libraries/sticker.js'
import fetch from 'node-fetch'

const handler = async (m, { conn }) => {
  const datas = global
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje

  const _translate = JSON.parse(
    fs.readFileSync(`./src/lunaidiomas/${idioma}.json`)
  )

  const tradutor = _translate.plugins?.sticker_kiss

  if (!tradutor) {
    return m.reply('❌ Error: traducción "plugins.sticker_kiss" no encontrada')
  }

  try {
    const who = m.mentionedJid && m.mentionedJid[0]
      ? m.mentionedJid[0]
      : m.quoted?.sender
      ? m.quoted.sender
      : m.fromMe
      ? conn.user.jid
      : m.sender

    if (!who) throw tradutor.texto1

    const res = await fetch('https://nekos.life/api/kiss')
    const json = await res.json()
    const { url } = json

    const name_1 = conn.getName(m.sender)
    const name_2 = conn.getName(who)

    const stiker = await sticker(null, url, `${name_1} le dio besos a ${name_2}`)

    await conn.sendFile(m.chat, stiker, null, null, m, false, { asSticker: true })

  } catch (e) {
    m.reply(tradutor.texto1 || '❌ Error')
  }
}

handler.command = /^(kiss|skiss|kis|besos|beso)$/i
handler.group = true

export default handler
