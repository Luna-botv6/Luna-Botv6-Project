import { removeWarning } from '../lib/advertencias.js'

const handler = async (m, { conn, isOwner, participants, usedPrefix, command }) => {
  const groupMetadata = await conn.groupMetadata(m.chat)
  const groupAdmins = groupMetadata.participants.filter(p => p.admin !== null).map(p => p.id)

  const realUserJid = m.sender
  const isUserAdmin = groupAdmins.includes(realUserJid)
  if (!isUserAdmin && !isOwner) return m.reply('⚠️ Solo los administradores pueden usar este comando.')

  let target = null
  if (m.mentionedJid && m.mentionedJid[0]) target = m.mentionedJid[0]
  else if (m.quoted && m.quoted.sender) target = m.quoted.sender

  if (!target) return m.reply(`🚫 Usa: *${usedPrefix + command} @usuario*`)

  const finalCheck = participants.find(p => p.id === target)
  if (!finalCheck) return m.reply('❗ El usuario mencionado no está en el grupo.')

  const warns = await removeWarning(target)
  await m.reply(`♻️ Se eliminó una advertencia a @${target.split('@')[0]}.\n📊 Advertencias actuales: ${warns}/3`, null, { mentions: [target] })
}

handler.command = /^(unwarn|delwarn|deladvertencia|deladvertir)$/i
handler.group = true
export default handler
