import fetch from 'node-fetch'
import Jimp from 'jimp'

const handler = async (m, { conn, text }) => {

  const who = m.quoted
    ? m.quoted.sender
    : m.mentionedJid?.[0]
    ? m.mentionedJid[0]
    : m.fromMe
    ? conn.user.jid
    : m.sender

  const userText = text?.trim() || 'Licencia para dejarte en visto'

  const nombre = m.pushName || 'Usuario'
  const fecha = new Date().toLocaleDateString('es-ES')
  const vencimiento = 'nunca'

  await m.reply('⏳ Generando licencia...')

  try {

    
    const avatarUrl = await conn.profilePictureUrl(who, 'image')
      .catch(() => 'https://telegra.ph/file/24fa902ead26340f3df2c.png')

    const avatarRes = await fetch(avatarUrl)
    const avatarBuffer = Buffer.from(await avatarRes.arrayBuffer())

    
    const baseUrl = 'https://raw.githubusercontent.com/Luna-botv6/base-archivos/main/licencia.jpg'
    const baseRes = await fetch(baseUrl)
    const baseBuffer = Buffer.from(await baseRes.arrayBuffer())

    const base = await Jimp.read(baseBuffer)
    const avatar = await Jimp.read(avatarBuffer)

    avatar.resize(170, 165)

    base.composite(avatar, 385, 180)

    const fontWhite = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE)
    const fontBlack = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK)
    const fontSmall = await Jimp.loadFont(Jimp.FONT_SANS_16_BLACK)

    base.print(fontSmall, 260, 175, 'nombre:')
    base.print(fontSmall, 260, 195, nombre)

    base.print(fontSmall, 260, 225, 'fecha:')
    base.print(fontSmall, 260, 255, fecha)

    base.print(fontSmall, 260, 285, 'vencimiento:')
    base.print(fontSmall, 260, 315, vencimiento)

    const imgW = base.getWidth()
    const imgH = base.getHeight()

    const x = 10
    const y = imgH - 110
    const maxW = imgW - 20
    const maxH = 70

    
    base.print(fontBlack, x - 3, y, { text: userText, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER }, maxW, maxH)
    base.print(fontBlack, x + 3, y, { text: userText, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER }, maxW, maxH)
    base.print(fontBlack, x, y - 3, { text: userText, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER }, maxW, maxH)
    base.print(fontBlack, x, y + 3, { text: userText, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER }, maxW, maxH)

    base.print(fontBlack, x - 2, y - 2, { text: userText, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER }, maxW, maxH)
    base.print(fontBlack, x + 2, y - 2, { text: userText, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER }, maxW, maxH)
    base.print(fontBlack, x - 2, y + 2, { text: userText, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER }, maxW, maxH)
    base.print(fontBlack, x + 2, y + 2, { text: userText, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER }, maxW, maxH)

    base.print(fontWhite, x, y, { text: userText, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER }, maxW, maxH)

    const output = await base.getBufferAsync(Jimp.MIME_JPEG)

    await conn.sendMessage(
      m.chat,
      { image: output },
      { quoted: m }
    )

  } catch (e) {
    await m.reply(`❌ Error: ${e.message}`)
  }
}

handler.help = ['licencia <texto>']
handler.tags = ['maker']
handler.command = /^(licencia)$/i

export default handler