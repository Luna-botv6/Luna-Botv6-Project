import fetch from 'node-fetch'
import Jimp from 'jimp'

const handler = async (m, { conn, text }) => {
  const who = m.quoted?.sender || m.mentionedJid?.[0] || (m.fromMe ? conn.user.jid : m.sender)
  const userText = text?.trim() || 'Licencia para dejarte en visto'
  const nombre = m.pushName || 'Usuario'
  const fecha = new Date().toLocaleDateString('es-ES')
  const vencimiento = 'nunca'

  await m.reply('⏳ Generando licencia...')

  let base = null
  let avatar = null

  try {
    const avatarUrl = await conn.profilePictureUrl(who, 'image')
      .catch(() => 'https://telegra.ph/file/24fa902ead26340f3df2c.png')

    const [avatarRes, baseRes] = await Promise.all([
      fetch(avatarUrl),
      fetch('https://raw.githubusercontent.com/Luna-botv6/base-archivos/main/licencia.jpg')
    ])

    const [avatarBuffer, baseBuffer] = await Promise.all([
      avatarRes.arrayBuffer().then(b => Buffer.from(b)),
      baseRes.arrayBuffer().then(b => Buffer.from(b))
    ])

    ;[base, avatar] = await Promise.all([
      Jimp.read(baseBuffer),
      Jimp.read(avatarBuffer)
    ])

    avatar.resize(170, 165)
    base.composite(avatar, 385, 180)
    avatar = null

    const [fontWhite, fontBlack, fontSmall] = await Promise.all([
      Jimp.loadFont(Jimp.FONT_SANS_32_WHITE),
      Jimp.loadFont(Jimp.FONT_SANS_32_BLACK),
      Jimp.loadFont(Jimp.FONT_SANS_16_BLACK)
    ])

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
    const opts = { text: userText, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER }

    for (const [dx, dy] of [[-3,0],[3,0],[0,-3],[0,3],[-2,-2],[2,-2],[-2,2],[2,2]]) {
      base.print(fontBlack, x + dx, y + dy, opts, maxW, maxH)
    }
    base.print(fontWhite, x, y, opts, maxW, maxH)

    const output = await base.getBufferAsync(Jimp.MIME_JPEG)
    base = null

    await conn.sendMessage(m.chat, { image: output }, { quoted: m })
  } catch (e) {
    await m.reply(`❌ Error: ${e.message}`)
  } finally {
    base = null
    avatar = null
    if (global.gc) global.gc()
  }
}

handler.help = ['licencia <texto>']
handler.tags = ['maker']
handler.command = /^(licencia)$/i
export default handler