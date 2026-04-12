import fetch from 'node-fetch'

const GIPHY_API_KEY = 'TU_API_KEY_AQUI'

const handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) return m.reply(`🔍 Uso: *${usedPrefix + command} <término>*\nEjemplo: ${usedPrefix + command} gato`)

  await m.reply('🔍 Buscando sticker...')

  try {
    const query = encodeURIComponent(text.trim())
    const url = `https://api.giphy.com/v1/stickers/search?api_key=${GIPHY_API_KEY}&q=${query}&limit=5&rating=g&lang=es`

    const res = await fetch(url)
    const json = await res.json()

    if (!json.data || json.data.length === 0) return m.reply('❌ No se encontraron stickers para ese término.')

    const sticker = json.data[Math.floor(Math.random() * json.data.length)]
    const webpUrl = sticker.images?.original?.webp || sticker.images?.fixed_height?.webp

    if (!webpUrl) return m.reply('❌ No se pudo obtener el sticker.')

    const imgRes = await fetch(webpUrl)
    if (!imgRes.ok) return m.reply('❌ No se pudo descargar el sticker.')

    const buffer = Buffer.from(await imgRes.arrayBuffer())

    await conn.sendMessage(m.chat, { sticker: buffer }, { quoted: m })

  } catch (e) {
    console.error('[stickerly]', e)
    m.reply('❌ Error al buscar el sticker.')
  }
}

handler.command = /^(stickerly|buscarsticker|searchsticker)$/i
handler.group = true
export default handler
