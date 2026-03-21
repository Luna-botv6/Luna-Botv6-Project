import { sticker } from '../src/libraries/sticker.js'
import fetch from 'node-fetch'
import fs from 'fs'

const emojiToCodepoints = (emoji) => {
  const codepoints = []
  for (const char of emoji) {
    const cp = char.codePointAt(0)
    if (cp !== 0xFE0F && cp !== 0x200D) {
      codepoints.push(cp.toString(16).toLowerCase())
    }
  }
  return codepoints.join('-')
}

const getAnimatedEmojiUrl = (emoji) => {
  const code = emojiToCodepoints(emoji)
  return `https://fonts.gstatic.com/s/e/notoemoji/latest/${code}/512.gif`
}

const extractEmojis = (text) => {
  if (!text) return []
  const regex = /\p{Emoji_Presentation}|\p{Emoji}\uFE0F/gu
  return [...(text.match(regex) || [])]
}

const handler = async (m, { conn, text }) => {
  const idioma = global.db?.data?.users?.[m.sender]?.language || global.defaultLenguaje
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`))
  const tradutor = _translate.plugins?.sticker_animoji || {}

  let emoji = null

  if (m.quoted) {
    const quotedText = m.quoted.text || m.quoted.body || ''
    const emojis = extractEmojis(quotedText)
    if (emojis.length > 0) emoji = emojis[0]
  }

  if (!emoji && text) {
    const emojis = extractEmojis(text)
    if (emojis.length > 0) emoji = emojis[0]
  }

  if (!emoji) throw tradutor.texto1 || 'Responde a un mensaje con un emoji o escribe uno. Ej: .animoji 🥺'

  const url = getAnimatedEmojiUrl(emoji)

  let res
  try {
    res = await fetch(url)
  } catch (e) {
    throw tradutor.texto2 || `No se pudo obtener el emoji animado: ${emoji}`
  }

  if (!res.ok) {
    throw tradutor.texto3 || `No hay version animada para ${emoji} (intenta con otro)`
  }

  const buffer = Buffer.from(await res.arrayBuffer())

  await m.reply(tradutor.texto4 || 'Creando sticker animado...')

  try {
    const stik = await sticker(buffer, null, global.packname, global.author, { animated: true })
    await conn.sendFile(m.chat, stik, null, { asSticker: true }, m)
  } catch (e) {
    throw tradutor.texto5 || `Error creando sticker: ${e.message}`
  }
}

handler.help = ['animoji <emoji> o responde con .animoji']
handler.tags = ['fun', 'sticker']
handler.command = /^(animoji|emojianimado|emojigif)$/i

export default handler
