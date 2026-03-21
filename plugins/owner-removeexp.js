import fs from 'fs'
import { removeExp, getUserStats } from '../lib/stats.js'
import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js'

const handler = async (m, { conn, args, isOwner, isROwner, command }) => {
  try {
    const isLidOwner = global.lidOwners?.includes(m.sender) || false
    if (!isOwner && !isROwner && !isLidOwner) throw 'Este comando es solo para los *propietarios del bot*.'

    const dbData = global.db?.data?.users?.[m.sender] || {}
    const idioma = dbData.language || global.defaultLenguaje || 'es'

    let tradutor = {}
    try {
      const languageFile = `./src/languages/${idioma}.json`
      if (fs.existsSync(languageFile)) {
        const _translate = JSON.parse(fs.readFileSync(languageFile))
        tradutor = _translate.plugins?.owner_removeexp || {}
      }
    } catch (e) {}

    const t = (key, def) => tradutor[key] || def

    if (args.length < 2) throw t('texto1', `Uso: *${command} <cantidad> @usuario*\nEjemplo: *${command} 500 @tag*`)
    const exp = parseInt(args[0])
    if (isNaN(exp) || exp <= 0) throw t('texto2', 'La cantidad de experiencia debe ser un número válido y mayor que cero.')

    const rawJid = m.mentionedJid?.[0]
    if (!rawJid) throw t('texto3', 'Debes mencionar al usuario al que deseas restar EXP.')

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

    const expFmt = exp >= 1000 ? `${(exp / 1000).toFixed(exp % 1000 === 0 ? 0 : 1)}K` : exp
    const beforeFmt = expBefore >= 1000 ? `${(expBefore / 1000).toFixed(1)}K` : expBefore
    const afterFmt = s.exp >= 1000 ? `${(s.exp / 1000).toFixed(1)}K` : s.exp

    m.reply(
      `╭━━━〔 *💢 EXP Eliminada* 〕━━━⬣\n` +
      `┃ *👤 Para:* @${mentionedJid.split('@')[0]}\n` +
      `┃ *👑 Por:* @${senderJid.split('@')[0]}\n` +
      `┃\n` +
      `┃ *✨ EXP eliminada:* -${expFmt}\n` +
      `┃\n` +
      `┃ *📈 Nivel actual:* ${s.level}\n` +
      `┃ *🏅 Rol:* ${s.role}\n` +
      `┃ *⚡ EXP anterior:* ${beforeFmt}\n` +
      `┃ *⚡ EXP actual:* ${afterFmt}\n` +
      `╰━━━━━━━━━━━━━━━━━━━━⬣`,
      null,
      { mentions: [mentionedJid, senderJid] }
    )

  } catch (error) {
    if (typeof error === 'string') m.reply(error)
    else {
      console.error('Error en owner-removeexp:', error)
      m.reply('⌛ Ocurrió un error al procesar el comando')
    }
  }
}

handler.command = /^removeexp$/i
handler.rowner = true
export default handler
