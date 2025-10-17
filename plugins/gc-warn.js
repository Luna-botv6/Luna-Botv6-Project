import { addWarning, resetWarnings } from '../lib/advertencias.js'

const handler = async (m, { conn, text, isOwner, usedPrefix, command }) => {
  const groupMetadata = await conn.groupMetadata(m.chat)
  const groupAdmins = groupMetadata.participants.filter(p => p.admin !== null).map(p => p.id)

  const realUserJid = m.sender
  const isUserAdmin = groupAdmins.includes(realUserJid)
  if (!isUserAdmin && !isOwner) return m.reply('⚠️ Este comando solo puede ser usado por administradores del grupo.')

  let target = null
  if (m.mentionedJid && m.mentionedJid[0]) target = m.mentionedJid[0]
  else if (m.quoted && m.quoted.sender) target = m.quoted.sender
  if (!target) return m.reply(`🚫 Usa: *${usedPrefix + command} @usuario*`)
  if (target === conn.user.jid) return m.reply('❌ No puedo advertirme a mí mismo.')

  const findUserInGroup = (jid) =>
    groupMetadata.participants.find(p =>
      p.id === jid ||
      p.id === jid.replace(/[^0-9]/g, '') + '@s.whatsapp.net' ||
      (p.lid && p.lid === jid)
    )

  const finalCheck = findUserInGroup(target)
  if (!finalCheck) return m.reply('❗ El usuario mencionado no se encuentra en este grupo.')

  const reason = text?.replace(/@\d+/g, '').trim() || 'Sin motivo especificado.'
  const warns = await addWarning(target)
  let messageSent = false

  if (!messageSent) {
    await m.reply(`⚠️ El usuario @${target.split('@')[0]} ha sido advertido.\n📄 Motivo: ${reason}\n📊 Advertencias: ${warns}/3`, null, { mentions: [target] })
    messageSent = true
  }

  if (warns >= 3) {
    await resetWarnings(target)
    if (!messageSent) {
      await m.reply(`🚷 El usuario @${target.split('@')[0]} fue expulsado por acumular 3 advertencias.`, null, { mentions: [target] })
      messageSent = true
    } else {
      await m.reply(`🚷 El usuario @${target.split('@')[0]} fue expulsado por acumular 3 advertencias.`, null, { mentions: [target] })
    }
    await conn.groupParticipantsUpdate(m.chat, [finalCheck.id], 'remove')
  }
}

handler.command = /^(warn|advertir|advertencia|warning)$/i
handler.group = true
export default handler
