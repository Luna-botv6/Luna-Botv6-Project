import { addWarning, resetWarnings } from '../lib/advertencias.js'

const handler = async (m, { conn, text, isOwner, participants, usedPrefix, command }) => {
  const groupMetadata = await conn.groupMetadata(m.chat)
  const groupAdmins = groupMetadata.participants.filter(p => p.admin !== null).map(p => p.id)

  let realUserJid = m.sender
  if (m.sender.includes('@lid')) {
    const pdata = groupMetadata.participants.find(p => p.lid === m.sender)
    if (pdata && pdata.id) realUserJid = pdata.id
  }

  const isUserAdmin = groupAdmins.includes(realUserJid)
  if (!isUserAdmin && !isOwner) return m.reply('⚠️ Este comando solo puede ser usado por administradores del grupo.')

  const resolveLidToId = (jidOrLid) => {
    if (!jidOrLid) return null
    if (!jidOrLid.includes('@lid')) return jidOrLid
    const pdata = groupMetadata.participants.find(p => p.lid === jidOrLid)
    return pdata ? pdata.id : null
  }

  let target = null
  if (m.mentionedJid && m.mentionedJid[0]) target = resolveLidToId(m.mentionedJid[0])
  else if (m.quoted && m.quoted.sender) target = resolveLidToId(m.quoted.sender)

  if (!target) return m.reply(`🚫 Usa: *${usedPrefix + command} @usuario*`)

  if (target === conn.user.jid) return m.reply('❌ No puedo advertirme a mí mismo.')

  const finalCheck = participants.find(p => p.id === target)
  if (!finalCheck) return m.reply('❗ El usuario mencionado no se encuentra en este grupo.')

  const reason = text?.replace(/@\d+/g, '').trim() || 'Sin motivo especificado.'
  const warns = await addWarning(target)

  await m.reply(`⚠️ El usuario @${target.split('@')[0]} ha sido advertido.\n📄 Motivo: ${reason}\n📊 Advertencias: ${warns}/3`, null, { mentions: [target] })

  if (warns >= 3) {
    await resetWarnings(target)
    await m.reply(`🚷 El usuario @${target.split('@')[0]} fue expulsado por acumular 3 advertencias.`, null, { mentions: [target] })
    await conn.groupParticipantsUpdate(m.chat, [target], 'remove')
  }
}

handler.command = /^(warn|advertir|advertencia|warning)$/i
handler.group = true
export default handler
