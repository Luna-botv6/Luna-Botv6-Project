import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import { generateWAMessageFromContent, prepareWAMessageMedia } from '@whiskeysockets/baileys'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const require = createRequire(import.meta.url)

const { buildLottieSticker } = require(path.resolve(__dirname, '../src/lottie/Lottie-Whatsapp-main/src/index.cjs'))

const LOTTIE_BASE = path.resolve(__dirname, '../src/lottie/Lottie-Whatsapp-main/src/exemple')
const TEMP_DIR = path.resolve(__dirname, '../tmp')

const handler = async (m, { conn }) => {
  let imageBuffer = null
  let mime = 'image/jpeg'

  const quoted = m.quoted
  const msg = quoted || m

  if (msg.mediaType === 'imageMessage' || msg?.message?.imageMessage) {
    imageBuffer = await msg.download()
    mime = msg?.message?.imageMessage?.mimetype || 'image/jpeg'
  } else if (m.mediaType === 'imageMessage' || m?.message?.imageMessage) {
    imageBuffer = await m.download()
    mime = m?.message?.imageMessage?.mimetype || 'image/jpeg'
  }

  if (!imageBuffer) return m.reply('⚠️ Mandá o respondé una imagen para convertirla en wink.')

  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true })

  const outputPath = path.join(TEMP_DIR, `wink_${Date.now()}.was`)

  await buildLottieSticker({
    baseFolder: LOTTIE_BASE,
    buffer: imageBuffer,
    mime,
    output: outputPath
  })

  const wasBuffer = fs.readFileSync(outputPath)

  const prepared = await prepareWAMessageMedia(
    { sticker: wasBuffer },
    { upload: conn.waUploadToServer }
  )

  prepared.stickerMessage.mimetype = 'application/was'
  prepared.stickerMessage.isLottie = true
  prepared.stickerMessage.isAnimated = true

  const waMsg = generateWAMessageFromContent(
    m.chat,
    prepared,
    { userJid: conn.user.id, quoted: m.raw ?? m }
  )

  await conn.relayMessage(m.chat, waMsg.message, { messageId: waMsg.key.id })

  fs.unlinkSync(outputPath)
}

handler.command = /^(wink|lottie)$/i
handler.tags = ['fun']
export default handler