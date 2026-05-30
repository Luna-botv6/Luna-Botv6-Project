import fs from 'fs'
import { getGroupDataForPlugin, isAdminNoTTL } from '../lib/funcion/pluginHelper.js'
import { hasGroup, getJids, setGroupData } from '../lib/funcion/hidetag-cache.js'

const cooldowns = new Map()
const _langCache = new Map()

function getLang(idioma) {
  if (_langCache.has(idioma)) return _langCache.get(idioma)
  const t = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`)).plugins.gc_tagall
  _langCache.set(idioma, t)
  return t
}

const handler = async (m, { conn, args, isOwner }) => {
  const idioma = global.db?.data?.users?.[m.sender]?.language || global.defaultLenguaje
  const t = getLang(idioma)

  try {
    if (!m.isGroup) return m.reply(t.solo_grupos)

    const chatId = m.chat
    let jids

    if (hasGroup(chatId)) {
      if (!isAdminNoTTL(chatId, m.sender) && !isOwner) return m.reply(t.solo_admins)
      jids = getJids(chatId)
    } else {
      const data = await getGroupDataForPlugin(conn, chatId, m.sender)
      if (!data.isAdmin && !isOwner) return m.reply(t.solo_admins)
      setGroupData(chatId, data.participants)
      jids = data.participants.map(p => p.id).filter(j => j && !j.includes('@lid'))
    }

    const cooldownTime = 2 * 60 * 1000
    const now = Date.now()

    if (cooldowns.has(chatId)) {
      const expire = cooldowns.get(chatId) + cooldownTime
      if (now < expire) {
        const left = expire - now
        return m.reply(t.cooldown.replace('{min}', Math.floor(left / 60000)).replace('{seg}', Math.floor((left % 60000) / 1000)))
      }
    }
    cooldowns.set(chatId, now)

    const mentionSet = new Set(jids)
    const messageText = args.join(' ') || t.atencion
    const total = mentionSet.size

    const lines = [
      t.titulo,
      `┃`,
      `┃ ${t.mensaje_label}`,
      `┃ ${messageText}`,
      `┃`,
      `┃ ${t.usuarios_label} (${total})`
    ]
    for (const jid of mentionSet) lines.push(`┃ 👤 @${jid.split('@')[0]}`)
    lines.push(`┃`, t.footer)

    await conn.sendMessage(chatId, { text: lines.join('\n'), mentions: [...mentionSet] })
  } catch {
    await m.reply(t.error)
  }
}

handler.help = ['tagall <mensaje>']
handler.tags = ['group']
handler.command = /^(tagall|invocar|invocacion|todos|invocación)$/i
handler.group = true

export default handler
