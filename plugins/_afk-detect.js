import fs from 'fs'
import { loadAFK, saveAFK } from '../lib/afkDB.js'

export function before(m) {
  if (m.fromMe) return true

  const chatId = m.chat
  const chatData = global.db.data.chats[chatId] || {}


  if (chatData.afkAllowed === false) return true

  const idioma = global.db.data.users[m.sender].language || global.defaultLenguaje
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`))
  const tradutor = _translate.plugins.afk__afk

  const afk = loadAFK()

  
  if (afk[m.sender]) {
    const userAfk = afk[m.sender]
    m.reply(` ${tradutor.texto2[0]} ${userAfk.reason ? `${tradutor.texto2[1]}` + userAfk.reason : ''}*

*${tradutor.texto2[2]} ${(new Date - userAfk.lastseen).toTimeString()}*`)
    
    delete afk[m.sender]
    saveAFK(afk)
  }

  const allowedCommandsBeforeAFK = ['robar', 'robard', '/robar', '/robard']
  const currentCommand = m.text?.toLowerCase().split(' ')[0]
  const isAllowedCommand = allowedCommandsBeforeAFK.includes(currentCommand)

  const jids = [...new Set([...(m.mentionedJid || []), ...(m.quoted ? [m.quoted.sender] : [])])]
  const destinatarios = jids.filter(jid => jid !== m.sender)

  if (isAllowedCommand) {
    const afkUsers = []
    for (const jid of destinatarios) {
      if (afk[jid]) {
        const target = afk[jid]
        afkUsers.push({
          jid,
          reason: target.reason || '',
          lastseen: target.lastseen
        })
      }
    }
    if (afkUsers.length > 0) m.afkUsers = afkUsers
    return true
  } else {
    const processedJids = new Set()
    for (const jid of destinatarios) {
      if (afk[jid] && !processedJids.has(jid)) {
        processedJids.add(jid)
        const target = afk[jid]
        const reason = target.reason || ''
        m.reply(`${tradutor.texto1[0]}

*—◉ ${tradutor.texto1[1]}*      
*—◉ ${reason ? `${tradutor.texto1[2]}` + reason : `${tradutor.texto1[3]}`}*
*—◉ ${tradutor.texto1[4]} ${(new Date - target.lastseen).toTimeString()}*`)
      }
    }
  }

  return true
}
