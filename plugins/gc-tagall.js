import fs from 'fs'
import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js'

const cooldowns = new Map()

const handler = async (m, { conn, args, isOwner }) => {
  const idioma = global.db?.data?.users?.[m.sender]?.language || global.defaultLenguaje
  const t = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`)).plugins.gc_tagall

  try {
    if (!m.isGroup) return m.reply(t.solo_grupos)

    const { participants, isAdmin } = await getGroupDataForPlugin(conn, m.chat, m.sender)

    if (!isAdmin && !isOwner) return m.reply(t.solo_admins)

    const chatId = m.chat
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

    const resolveLid = jid => {
      if (!jid?.includes('@lid')) return conn.decodeJid(jid)
      const p = participants.find(x => x.lid === jid)
      return p ? conn.decodeJid(p.id) : null
    }

    const mentionSet = new Set()
    participants.forEach(p => mentionSet.add(conn.decodeJid(p.id)))

    let messageText = args.join(' ') || t.atencion

    if (m.mentionedJid?.length) {
      for (const lid of m.mentionedJid) {
        const real = resolveLid(lid)
        if (!real) continue
        mentionSet.add(real)
        messageText = messageText.replace(/@\S+/, `@${real.split('@')[0]}`)
      }
    }

    const total = mentionSet.size
    let teks = `${t.titulo}\n`
    teks += `┃\n`
    teks += `┃ ${t.mensaje_label}\n`
    teks += `┃ ${messageText}\n`
    teks += `┃\n`
    teks += `┃ ${t.usuarios_label} (${total})\n`
    for (const jid of mentionSet) {
      teks += `┃ 👤 @${jid.split('@')[0]}\n`
    }
    teks += `┃\n`
    teks += `${t.footer}`

    await conn.sendMessage(chatId, { text: teks, mentions: [...mentionSet] })
  } catch (e) {
    await m.reply(t.error)
  }
}

handler.help = ['tagall <mensaje>']
handler.tags = ['group']
handler.command = /^(tagall|invocar|invocacion|todos|invocación)$/i
handler.group = true

export default handler
