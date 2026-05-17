import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js'
import fs from 'fs'

const WELCOME_DIR = './database/WELCOME'

const handler = async (m, { conn, isOwner }) => {
  const idioma = global.db.data.users[m.sender]?.language || global.defaultLenguaje
  const _translate = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`))
  const t = _translate.plugins.gc_imgwelc

  const { isAdmin } = await getGroupDataForPlugin(conn, m.chat, m.sender)
  if (!isAdmin && !isOwner) return m.reply(t.texto2)

  const chatClean = m.chat.replace('@g.us', '')
  const imgPath = `${WELCOME_DIR}/${chatClean}_welcome.jpg`

  const isDelete = /^(delwelcimg|eliminarwelcimg)$/i.test(m.text?.trim() || '')

  if (isDelete) {
    if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath)
    return m.reply(t.texto4)
  }

  let imageBuffer = null

  if (m.quoted?.mimetype?.startsWith('image/')) {
    imageBuffer = await m.quoted.download().catch(() => null)
  } else if (m.mimetype?.startsWith('image/')) {
    imageBuffer = await m.download().catch(() => null)
  }

  if (!imageBuffer) return m.reply(t.texto2)

  try {
    if (!fs.existsSync(WELCOME_DIR)) fs.mkdirSync(WELCOME_DIR, { recursive: true })
    fs.writeFileSync(imgPath, imageBuffer)
    return m.reply(t.texto1)
  } catch {
    return m.reply(t.texto3)
  }
}

handler.help = ['imgwelc']
handler.tags = ['group']
handler.command = /^(imgwelc|delwelcimg)$/i
handler.group = true

export default handler
