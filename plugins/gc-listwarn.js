import fs from 'fs'
import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js'
import { listWarnings } from '../lib/advertencias.js'

const handler = async (m, { conn, isOwner }) => {
  const idioma = global.db?.data?.users?.[m.sender]?.language || global.defaultLenguaje
  const t = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`)).plugins.gc_listwarn

  const { participants, isAdmin } = await getGroupDataForPlugin(conn, m.chat, m.sender)

  if (!isAdmin && !isOwner) return m.reply(t.solo_admins)

  const users = await listWarnings()
  const filtered = users.filter(u => participants.find(p => p.id === u.id))
  if (filtered.length === 0) return m.reply(t.sin_advertencias)

  let msg = t.titulo
  const allMentions = [...filtered.map(u => u.id)]

  for (const u of filtered) {
    const tag = u.id.split('@')[0]
    const reasons = u.reasons?.length ? u.reasons : []
    const porJids = []
    const motivosStr = reasons.length > 0
      ? reasons.map((r, i) => {
          const motivo = typeof r === 'object' ? r.motivo : r
          const fecha = typeof r === 'object' && r.fecha ? ` 📅 ${r.fecha}` : ''
          let por = ''
          if (typeof r === 'object' && r.porJid) {
            porJids.push(r.porJid)
            por = ` ${t.por} @${r.porJid.split('@')[0]}`
          } else if (typeof r === 'object' && r.por) {
            por = ` ${t.por} @${r.por}`
          }
          return t.motivo_item.replace('{n}', i + 1).replace('{motivo}', motivo || t.sin_motivo) + fecha + por + '\n'
        }).join('')
      : t.motivo_item.replace('{n}', 1).replace('{motivo}', t.sin_motivo) + '\n'

    msg += '\n' + t.entrada
      .replace('{tag}', tag)
      .replace('{warns}', u.warns)
      .replace('{motivos}', motivosStr)

    allMentions.push(...porJids)
  }

  msg += '\n' + t.footer

  await conn.sendMessage(m.chat, { text: msg.trim(), mentions: allMentions })
}

handler.command = /^(listwarn|veradvertencias|advertencias)$/i
handler.group = true
export default handler
