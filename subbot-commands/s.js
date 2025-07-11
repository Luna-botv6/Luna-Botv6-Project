import { downloadContentFromMessage } from '@whiskeysockets/baileys'
import { sticker } from '../src/libraries/sticker.js'  // ajusta ruta si hace falta

export default async function handler(sock, m, args) {
  try {
    if (!m.quoted) {
      return await sock.sendMessage(m.chat, { text: '❌ Responde a una imagen, video o sticker para crear un sticker.' }, { quoted: m })
    }

    // Extraemos el mensaje citado completo (p.ej. imageMessage, videoMessage, stickerMessage)
    let quotedMsg = m.quoted

    // En subbots, el mensaje citado puede estar en extendedTextMessage.contextInfo.quotedMessage
    if (m.message.extendedTextMessage?.contextInfo?.quotedMessage) {
      quotedMsg = m.message.extendedTextMessage.contextInfo.quotedMessage
    }

    // Busca la key del contenido multimedia (imageMessage, videoMessage o stickerMessage)
    const mediaTypes = ['imageMessage', 'videoMessage', 'stickerMessage']
    const mediaType = mediaTypes.find(type => quotedMsg[type])

    if (!mediaType) {
      return await sock.sendMessage(m.chat, { text: '❌ El mensaje citado no contiene imagen, video ni sticker.' }, { quoted: m })
    }

    // Descarga el stream del contenido multimedia
    const stream = await downloadContentFromMessage(quotedMsg[mediaType], mediaType.replace('Message', ''))
    let buffer = Buffer.from([])
    for await (const chunk of stream) {
      buffer = Buffer.concat([buffer, chunk])
    }

    // Crea el sticker usando tu función, ajusta packname y author si quieres
    const stickerBuffer = await sticker(buffer, false, 'MiBot', 'SubBot')

    // Envía el sticker
    await sock.sendMessage(m.chat, { sticker: stickerBuffer }, { quoted: m })

  } catch (e) {
    console.error('Error creando sticker:', e)
    await sock.sendMessage(m.chat, { text: `❌ Error creando sticker: ${e.message}` }, { quoted: m })
  }
}
