import fs from 'fs'
import { addExif } from '../src/libraries/sticker.js'

const handler = async (m, { conn, text, usedPrefix, command }) => {
  if (usedPrefix === 'a' || usedPrefix === 'A') return

  const idioma = global.db.data.users[m.sender]?.language || global.defaultLenguaje
  let tradutor = {}
  try {
    const raw = await fs.promises.readFile(`./src/languages/${idioma}.json`, 'utf8')
    tradutor = JSON.parse(raw).plugins?.sticker_wm || {}
  } catch (e) {}

  if (!m.quoted) return m.reply(tradutor.texto1 || '❌ Responde a un sticker.')

  const mime = (m.quoted.msg || m.quoted).mimetype || m.quoted.mediaType || ''
  if (!/webp/i.test(mime)) return m.reply(tradutor.texto2 || '❌ Solo funciona con stickers (.webp).')

  let img
  try {
    img = await m.quoted.download()
  } catch (e) {
    return m.reply('❌ No pude descargar el sticker. Intenta de nuevo.')
  }

  if (!img?.length) return m.reply(tradutor.texto3 || '❌ No pude procesar el sticker.')

  const parts = text.split('|')
  const packname = parts[0]?.trim() || global.packname
  const author = parts.slice(1).join('|').trim() || global.author

  let stiker
  try {
    stiker = await addExif(img, packname, author, [], {})
  } catch (e) {
    return m.reply(tradutor.texto3 || '❌ Error al agregar los datos al sticker.')
  }

  if (!stiker) return m.reply(tradutor.texto3 || '❌ No pude crear el sticker.')

  try {
    const stickerBuffer = Buffer.isBuffer(stiker) ? stiker : Buffer.from(stiker)
    try {
      await conn.sendMessage(m.chat, { sticker: stickerBuffer }, { quoted: m })
    } catch (e1) {
      await conn.sendFile(m.chat, stickerBuffer, 'wm.webp', '', m, false, { asSticker: true })
    }
  } catch (e) {
    return m.reply('❌ Error al enviar el sticker. Intenta de nuevo.')
  }
}

handler.help = ['sr <packname>|<author>']
handler.tags = ['sticker']
handler.command = /^sr|take|robars|ws$/i

export default handler
