import fs from 'fs'
import { addMoney, getMoney } from '../lib/stats.js'
import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js'

const handler = async (m, { conn, text, isOwner, isROwner }) => {
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
        tradutor = _translate.plugins?.owner_anadirdiamantes || {}
      }
    } catch (e) {}

    const t = (key, def) => tradutor[key] || def

    let rawJid = m.isGroup ? (m.mentionedJid?.[0] || null) : m.chat
    if (!rawJid) throw t('texto1', '⌛ Menciona a alguien o usa el comando en privado')

    let who = rawJid
    if (rawJid.includes('@lid') && m.isGroup) {
      const { participants } = await getGroupDataForPlugin(conn, m.chat, m.sender)
      const found = participants.find(p => p.lid === rawJid)
      if (found?.id) who = found.id
    }

    let senderJid = m.sender
    if (m.sender.includes('@lid') && m.isGroup) {
      const { participants } = await getGroupDataForPlugin(conn, m.chat, m.sender)
      const found = participants.find(p => p.lid === m.sender)
      if (found?.id) senderJid = found.id
    }

    const txt = text ? text.replace('@' + rawJid.split('@')[0], '').trim() : ''
    if (!txt) throw t('texto2', '⌛ Ingresa la cantidad de diamantes a añadir')
    if (isNaN(txt)) throw t('texto3', '⌛ Solo se permiten números')

    const amount = parseInt(txt)
    if (amount < 1) throw t('texto4', '⌛ La cantidad debe ser mayor a 0')

    const before = getMoney(who)
    addMoney(who, amount)
    const after = getMoney(who)

    const fmt = n => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n

    m.reply(
      `╭━〔 *💎 Diamantes Añadidos* ━⬣\n` +
      `┃ *👤 Para:* @${who.split('@')[0]}\n` +
      `┃ *👑 Por:* @${senderJid.split('@')[0]}\n` +
      `┃\n` +
      `┃ *✨ Diamantes añadidos:* +${fmt(amount)}\n` +
      `┃\n` +
      `┃ *💎 Diamantes anteriores:* ${fmt(before)}\n` +
      `┃ *💎 Diamantes actuales:* ${fmt(after)}\n` +
      `╰━━━━━━━━━━━━━━━━━━━━⬣`,
      null,
      { mentions: [who, senderJid] }
    )

  } catch (error) {
    if (typeof error === 'string') m.reply(error)
    else {
      console.error('Error en owner-anadirDiamantes:', error)
      m.reply('⌛ Ocurrió un error al procesar el comando')
    }
  }
}

handler.command = ['añadirdiamantes', 'addd', 'dard', 'dardiamantes']
handler.rowner = true
export default handler
