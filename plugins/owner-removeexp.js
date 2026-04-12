import fs from 'fs'
import { removeExp, getUserStats } from '../lib/stats.js'
import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js'

const handler = async (m, { conn, args, isOwner, isROwner, command }) => {
  try {
    const isLidOwner = global.lidOwners?.includes(m.sender) || false
    if (!isOwner && !isROwner && !isLidOwner) throw 'Este comando es solo para los *propietarios del bot*.'

    const idioma = global.db?.data?.users?.[m.sender]?.language || global.defaultLenguaje || 'es'
    let tradutor = {}
    try {
      const _translate = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`))
      tradutor = _translate.plugins?.owner_removeexp || {}
    } catch (e) {}

    if (args.length < 2) throw tradutor.texto1 || `Uso: *${command} <cantidad> @usuario*`
    const exp = parseInt(args[0])
    if (isNaN(exp) || exp <= 0) throw tradutor.texto2 || 'Cantidad inválida.'

    const rawJid = m.mentionedJid?.[0]
    if (!rawJid) throw tradutor.texto3 || 'Menciona al usuario.'

    let mentionedJid = rawJid
    if (rawJid.includes('@lid') && m.isGroup) {
      const { participants } = await getGroupDataForPlugin(conn, m.chat, m.sender)
      const found = participants.find(p => p.lid === rawJid)
      if (found?.id) mentionedJid = found.id
    }

    let senderJid = m.sender
    if (m.sender.includes('@lid') && m.isGroup) {
      const { participants } = await getGroupDataForPlugin(conn, m.chat, m.sender)
      const found = participants.find(p => p.lid === m.sender)
      if (found?.id) senderJid = found.id
    }

    const expBefore = getUserStats(mentionedJid).exp
    removeExp(mentionedJid, exp)
    const s = getUserStats(mentionedJid)

    const expFmt    = exp >= 1000 ? `${(exp / 1000).toFixed(exp % 1000 === 0 ? 0 : 1)}K` : exp
    const beforeFmt = expBefore >= 1000 ? `${(expBefore / 1000).toFixed(1)}K` : expBefore
    const afterFmt  = s.exp >= 1000 ? `${(s.exp / 1000).toFixed(1)}K` : s.exp

    m.reply(
      `╭━━━〔 *${tradutor.titulo}* 〕━━━⬣\n` +
      `┃ *👤 ${tradutor.para}:* @${mentionedJid.split('@')[0]}\n` +
      `┃ *👑 ${tradutor.por}:* @${senderJid.split('@')[0]}\n` +
      `┃\n` +
      `┃ *✨ ${tradutor.exp_eliminada}:* -${expFmt}\n` +
      `┃\n` +
      `┃ *📈 ${tradutor.nivel}:* ${s.level}\n` +
      `┃ *🏅 ${tradutor.rol}:* ${s.role}\n` +
      `┃ *⚡ ${tradutor.exp_antes}:* ${beforeFmt}\n` +
      `┃ *⚡ ${tradutor.exp_actual}:* ${afterFmt}\n` +
      `╰━━━━━━━━━━━━━━━━━━━━⬣`,
      null,
      { mentions: [mentionedJid, senderJid] }
    )

  } catch (error) {
    if (typeof error === 'string') m.reply(error)
    else {
      console.error('Error en owner-removeexp:', error)
      m.reply(tradutor?.error || '⌛ Ocurrió un error al procesar el comando')
    }
  }
}

handler.command = /^removeexp$/i
handler.rowner = true
export default handler