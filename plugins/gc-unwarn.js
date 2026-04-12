import fs from 'fs'
import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js'
import { removeWarning } from '../lib/advertencias.js'

const handler = async (m, { conn, isOwner, usedPrefix, command }) => {
  const idioma = global.db?.data?.users?.[m.sender]?.language || global.defaultLenguaje
  const t = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`)).plugins.gc_unwarn

  const { participants, isAdmin } = await getGroupDataForPlugin(conn, m.chat, m.sender)

  if (!isAdmin && !isOwner) return m.reply(t.solo_admins)

  let target = m.mentionedJid?.[0] || m.quoted?.sender
  if (!target) return m.reply(t.uso.replace('{prefix}', usedPrefix).replace('{cmd}', command))

  const resolveLid = (jid) => {
    if (!jid?.includes('@lid')) return jid
    const p = participants.find(x => x.lid === jid)
    return p?.id || null
  }

  target = resolveLid(target) || target

  const finalCheck = participants.find(p => p.id === target)
  if (!finalCheck) return m.reply(t.no_en_grupo)

  target = finalCheck.id
  const warns = await removeWarning(target)
  const tag = target.split('@')[0]

  await m.reply(
    t.removida.replace('{tag}', tag).replace('{warns}', warns),
    null, { mentions: [target] }
  )
}

handler.command = /^(unwarn|delwarn|deladvertencia|deladvertir)$/i
handler.group = true
export default handler