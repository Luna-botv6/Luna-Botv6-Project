import fs from 'fs'
import { getGroupDataForPlugin, clearGroupCache } from '../lib/funcion/pluginHelper.js'
import { addWarning, resetWarnings } from '../lib/advertencias.js'

const handler = async (m, { conn, text, isOwner, usedPrefix, command }) => {
  const idioma = global.db?.data?.users?.[m.sender]?.language || global.defaultLenguaje
  const t = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`)).plugins.gc_warn

  if (!m.isGroup) return m.reply(t.solo_grupos)

  const { participants, isAdmin, isBotAdmin } = await getGroupDataForPlugin(conn, m.chat, m.sender)

  if (!isAdmin && !isOwner) return m.reply(t.solo_admins)
  if (!isBotAdmin) return m.reply(t.bot_no_admin)

  let target = m.mentionedJid?.[0] || m.quoted?.sender
  if (!target) return m.reply(t.uso.replace('{prefix}', usedPrefix).replace('{cmd}', command))
  if (target === conn.user.jid) return m.reply(t.no_auto)

  const resolveLid = (jid) => {
    if (!jid?.includes('@lid')) return jid
    const p = participants.find(x => x.lid === jid)
    return p?.id || null
  }

  target = resolveLid(target) || target

  const finalCheck = participants.find(p => p.id === target)
  if (!finalCheck) return m.reply(t.no_en_grupo)

  target = finalCheck.id
  const reason = text?.replace(/@\d+/g, '').trim() || t.sin_motivo
  const resolvedSender = resolveLid(m.sender) || m.sender
  const senderTag = resolvedSender.split('@')[0]
  const warns = await addWarning(target, reason, senderTag, resolvedSender)
  const tag = target.split('@')[0]

  const now = new Date()
  const fecha = `${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()}`

  await m.reply(
    t.advertido
      .replace('{tag}', tag)
      .replace('{sancionadoPor}', senderTag)
      .replace('{fecha}', fecha)
      .replace('{motivo}', reason)
      .replace('{warns}', warns),
    null, { mentions: [target, m.sender] }
  )

  if (warns >= 3) {
    await resetWarnings(target)
    await conn.groupParticipantsUpdate(m.chat, [target], 'remove')
    clearGroupCache(m.chat)
    await m.reply(t.expulsado.replace('{tag}', tag), null, { mentions: [target] })
  }
}

handler.command = /^(warn|advertir|advertencia|warning|sancion|sanción)$/i
handler.group = true
export default handler
