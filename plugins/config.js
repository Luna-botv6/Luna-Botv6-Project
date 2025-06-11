import { setConfig } from '../lib/funcConfig.js'
import { setOwnerFunction } from '../lib/owner-funciones.js'

let handler = async (m, { conn, args, command, isOwner }) => {
  const enable = command === 'enable'
  const option = args[0]?.toLowerCase()
  const chatId = m.chat

  const groupFeatures = ['welcome', 'antilink', 'detect']
  const ownerFeatures = ['modopublico', 'auread', 'vierwimage', 'antiprivado', 'modogrupos']

  if (!option) {
    return conn.reply(m.chat, '❌ Debes escribir una opción.\n📌 Ejemplo: *.enable welcome*', m)
  }

  if (groupFeatures.includes(option)) {
    if (!global.db.data.chats[chatId]) global.db.data.chats[chatId] = {}
    global.db.data.chats[chatId][option] = enable
    setConfig(chatId, option, enable)
    conn.reply(m.chat, `✅ Función *${option}* ${enable ? 'activada' : 'desactivada'} para este grupo.`, m)
  } else if (ownerFeatures.includes(option)) {
    if (!isOwner) return conn.reply(m.chat, '❌ Solo el owner puede usar esta opción.', m)
    const ok = setOwnerFunction(option, enable)
    conn.reply(m.chat, `✅ Función *${option}* ${enable ? 'activada' : 'desactivada'} globalmente.`, m)
  } else {
    conn.reply(m.chat, '❌ Opción no válida.\n✔️ Opciones de grupo: welcome, antilink, detect\n🔒 Opciones del owner: modopublico, auread, modogrupos, etc.', m)
  }
}

handler.help = ['enable <función>', 'disable <función>']
handler.tags = ['tools']
handler.command = /^\/(enable|disable)$/i
handler.group = false
handler.register = true
handler.rowner = true

export default handler
