import { listWarnings } from '../lib/advertencias.js'

const handler = async (m, { conn, isOwner }) => {
  const groupMetadata = await conn.groupMetadata(m.chat)
  const groupAdmins = groupMetadata.participants.filter(p => p.admin !== null).map(p => p.id)

  const realUserJid = m.sender
  const isUserAdmin = groupAdmins.includes(realUserJid)
  if (!isUserAdmin && !isOwner) return m.reply('⚠️ Solo los administradores pueden usar este comando.')

  const users = await listWarnings()
  const findUserInGroup = (jid) =>
    groupMetadata.participants.find(p =>
      p.id === jid ||
      p.id === jid.replace(/[^0-9]/g, '') + '@s.whatsapp.net' ||
      (p.lid && p.lid === jid)
    )

  const filtered = users.filter(u => findUserInGroup(u.id))
  if (filtered.length === 0) return m.reply('✅ No hay usuarios con advertencias en este grupo.')

  let msg = '📋 *Lista de advertencias actuales:*\n\n'
  for (const u of filtered) msg += `• @${u.id.split('@')[0]} — ${u.warns}/3\n`

  await conn.sendMessage(m.chat, { text: msg, mentions: filtered.map(u => u.id) })
}

handler.command = /^(listwarn|veradvertencias|advertencias)$/i
handler.group = true
export default handler
