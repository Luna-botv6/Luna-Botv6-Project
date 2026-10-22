import fs from 'fs'
import { getUserStats, setUserStats } from '../lib/stats.js'
import { sancionarManual } from '../lib/antiCheat.js'

const handler = async (m, { conn }) => {
  const idioma = global.db?.data?.users?.[m.sender]?.language || global.defaultLenguaje || 'es'
  let tradutor = {}
  try {
    tradutor = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`, 'utf8')).plugins?.owner_chetar || {}
  } catch {}

  const user = getUserStats(m.sender)
  sancionarManual(m.sender, user, 'uso del comando .chetar')
  setUserStats(m.sender, user)

  const texto = tradutor.texto2 || 'intentó usar el comando de trampa. Sus recursos fueron reseteados y quedó marcado como tramposo.'
  await conn.sendMessage(m.chat, {
    text: `🕵️ *ANTI-CHEAT*\n\n@${m.sender.split('@')[0]} ${texto}`,
    mentions: [m.sender]
  }, { quoted: m })
}

handler.help = []
handler.tags = ['owner']
handler.command = /^(ilimitado|infiniy|chetar)$/i
handler.rowner = true
handler.fail = null
export default handler
