import fs from 'fs'
import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js'

const handler = async (m, { conn }) => {
  if (m.fromMe) return

  const idioma = global.db?.data?.users?.[m.sender]?.language || global.defaultLenguaje
  const t = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`)).plugins.owner_autoadmin

  const { isAdmin, isBotAdmin } = await getGroupDataForPlugin(conn, m.chat, m.sender)

  if (!isBotAdmin) return m.reply(t.texto2)
  if (isAdmin) throw t.texto1

  try {
    await conn.groupParticipantsUpdate(m.chat, [m.sender], 'promote')
  } catch {
    await m.reply(t.texto2)
  }
}

handler.command = /^autoadmin$/i
handler.rowner = true
handler.group = true
export default handler