import fs from 'fs'
import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js'

function clockString(ms) {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor(ms / 60000) % 60
  const s = Math.floor(ms / 1000) % 60
  return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':')
}

const handler = async (m, { conn, isOwner, args, usedPrefix, command }) => {
  const idioma = global.db.data.users[m.sender]?.language || global.defaultLenguaje
  const txt = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`, 'utf-8')).plugins.gc_config_time

  const { isAdmin } = await getGroupDataForPlugin(conn, m.chat, m.sender)

  if (!isAdmin && !isOwner) return m.reply(txt.no_admin)

  const modeMap = {
    open: 'not_announcement', buka: 'not_announcement',
    on: 'not_announcement', '1': 'not_announcement',
    close: 'announcement', tutup: 'announcement',
    off: 'announcement', '0': 'announcement',
  }

  const mode = modeMap[args[0] || '']

  if (mode === undefined) {
    return m.reply(
      txt.uso
        .replace('{prefix}', usedPrefix)
        .replace('{command}', command)
        .replace('{prefix2}', usedPrefix)
        .replace('{command2}', command)
    )
  }

  const isClosing = mode === 'announcement'
  const timeoutMs = args[1] ? 86400000 * Number(args[1]) / 24 : 0

  await conn.groupSettingUpdate(m.chat, mode)

  const estadoTexto = isClosing ? txt.cerrado : txt.abierto
  const tiempoTexto = timeoutMs ? ` ${txt.durante} *${clockString(timeoutMs)}*` : ''
  await m.reply(`⚠️ _${estadoTexto}${tiempoTexto}_`)

  if (timeoutMs) {
    setTimeout(async () => {
      const reverso = isClosing ? 'not_announcement' : 'announcement'
      await conn.groupSettingUpdate(m.chat, reverso)
      await conn.sendMessage(m.chat, { text: isClosing ? txt.reabrir : txt.recruzar })
    }, timeoutMs)
  }
}

handler.help = ['grouptime *<open/close>* *<número>*']
handler.tags = ['group']
handler.command = /^(grouptime|gctime)$/i
handler.botAdmin = true
handler.group = true

export default handler
