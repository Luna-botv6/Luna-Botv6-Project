import { addWarning, resetWarnings } from '../lib/advertencias.js'

const handler = async (m, { conn, text, isOwner, usedPrefix, command, participants }) => {
  if (!m.isGroup) return m.reply('*[❗] Este comando solo funciona en grupos.*')

  const groupMetadata = await conn.groupMetadata(m.chat)
  const groupAdmins = groupMetadata.participants.filter(p => p.admin !== null).map(p => p.id)

  let realUserJid = m.sender
  if (m.sender.includes('@lid')) {
    const pdata = groupMetadata.participants.find(p => p.lid === m.sender)
    if (pdata?.id) realUserJid = pdata.id
  }

  const isUserAdmin = groupAdmins.includes(realUserJid)
  if (!isUserAdmin && !isOwner) return m.reply('⚠️ Solo administradores pueden usar este comando.')

  let target = m.mentionedJid?.[0] || m.quoted?.sender
  if (!target) return m.reply(`🚫 Uso: *${usedPrefix + command} @usuario*`)
  if (target === conn.user.jid) return m.reply('❌ No puedo advertirme a mí mismo.')

  const findUserInGroup = (jid) =>
    groupMetadata.participants.find(p =>
      p.id === jid ||
      (p.lid && p.lid === jid) ||
      p.id === jid.replace(/[^0-9]/g, '') + '@s.whatsapp.net'
    )

  const finalCheck = findUserInGroup(target)
  if (!finalCheck) return m.reply('❗ El usuario mencionado no se encuentra en este grupo.')

  const reason = text?.replace(/@\d+/g, '').trim() || 'Sin motivo especificado.'
  const warns = await addWarning(finalCheck.id)

  await m.reply(`⚠️ El usuario @${finalCheck.id.split('@')[0]} ha sido advertido.\n📄 Motivo: ${reason}\n📊 Advertencias: ${warns}/3`, null, { mentions: [finalCheck.id] })

  if (warns >= 3) {
    await resetWarnings(finalCheck.id)
    await conn.groupParticipantsUpdate(m.chat, [finalCheck.id], 'remove')
    await m.reply(`🚷 El usuario @${finalCheck.id.split('@')[0]} fue expulsado por acumular 3 advertencias.`, null, { mentions: [finalCheck.id] })
  }
}

handler.command = /^(warn|advertir|advertencia|warning)$/i
handler.group = true

export default handler

