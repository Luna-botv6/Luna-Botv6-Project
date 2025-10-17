import { removeWarning } from '../lib/advertencias.js'

const handler = async (m, { conn, isOwner, participants, usedPrefix, command }) => {
  const groupMetadata = await conn.groupMetadata(m.chat)
  const groupAdmins = groupMetadata.participants.filter(p => p.admin !== null).map(p => p.id)

  let realUserJid = m.sender
  if (m.sender.includes('@lid')) {
    const pdata = groupMetadata.participants.find(p => p.lid === m.sender)
    if (pdata && pdata.id) realUserJid = pdata.id
  }

  const isUserAdmin = groupAdmins.includes(realUserJid)
  if (!isUserAdmin && !isOwner) return m.reply('⚠️ Solo los administradores pueden usar este comando.')

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

  const finalCheck = participants.find(p => p.id === target)
  if (!finalCheck) return m.reply('❗ El usuario mencionado no está en el grupo.')

  const warns = await removeWarning(target)
  await m.reply(`♻️ Se eliminó una advertencia a @${target.split('@')[0]}.\n📊 Advertencias actuales: ${warns}/3`, null, { mentions: [target] })
}

handler.command = /^(unwarn|delwarn|deladvertencia|deladvertir)$/i
handler.group = true
export default handler
