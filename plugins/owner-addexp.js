import fs from 'fs'
import { addExp, getUserStats, registerLidMapping } from '../lib/stats.js'
import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js'

const handler = async (m, { conn, args, participants, isOwner, isROwner, command }) => {
  try {
    const isLidOwner = global.lidOwners?.includes(m.sender) || false;
    
    if (!isOwner && !isROwner && !isLidOwner) {
      throw 'Este comando es solo para los *propietarios del bot*.';
    }
    const datas = global || {}
    const dbData = datas.db?.data?.users?.[m.sender] || {}
    const idioma = dbData.language || global.defaultLenguaje || 'es'
    
    let tradutor = {}
    try {
      const languageFile = `./src/languages/${idioma}.json`
      if (fs.existsSync(languageFile)) {
        const _translate = JSON.parse(fs.readFileSync(languageFile))
        tradutor = _translate.plugins?.owner_addexp || {}
      }
    } catch (error) {
      console.log('Error al cargar traducciones:', error)
    }

    const defaultTexts = {
      texto1: `Uso: *${command} <cantidad> @usuario*\nEjemplo: *${command} 3000 @tag*`,
      texto2: 'La cantidad de experiencia debe ser un número válido y mayor que cero.',
      texto3: 'Debes mencionar al usuario al que deseas añadir EXP.',
    }
    const texts = {
      texto1: tradutor.texto1 || defaultTexts.texto1,
      texto2: tradutor.texto2 || defaultTexts.texto2,
      texto3: tradutor.texto3 || defaultTexts.texto3,
    }

    if (args.length < 2) throw texts.texto1
    const exp = parseInt(args[0])
    if (isNaN(exp) || exp <= 0) throw texts.texto2

    const rawJid = m.mentionedJid && m.mentionedJid[0]
    if (!rawJid) throw texts.texto3

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

    addExp(mentionedJid, exp)
    const s = getUserStats(mentionedJid)

    const expFmt = exp >= 1000 ? `${(exp / 1000).toFixed(exp % 1000 === 0 ? 0 : 1)}K` : exp
    const expNowFmt = s.exp >= 1000 ? `${(s.exp / 1000).toFixed(1)}K` : s.exp

    const msg =
      `╭━━━〔 *⚡ EXP Añadida* 〕━━━⬣\n` +
      `┃ *👤 Para:* @${mentionedJid.split('@')[0]}\n` +
      `┃ *👑 Por:* @${senderJid.split('@')[0]}\n` +
      `┃\n` +
      `┃ *✨ EXP añadida:* +${expFmt}\n` +
      `┃\n` +
      `┃ *📈 Nivel actual:* ${s.level}\n` +
      `┃ *🏅 Rol:* ${s.role}\n` +
      `┃ *⚡ EXP actual:* ${expNowFmt}\n` +
      `╰━━━━━━━━━━━━━━━━━━━━⬣`

    m.reply(msg, null, { mentions: [mentionedJid, senderJid] })

  } catch (error) {
    if (typeof error === 'string') {
      m.reply(error)
    } else {
      console.error('Error en owner-addexp:', error)
      m.reply('⌛ Ocurrió un error al procesar el comando')
    }
  }
}
handler.command = /^addexp$/i
handler.rowner = true
export default handler