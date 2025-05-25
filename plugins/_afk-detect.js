import fs from 'fs'
import { loadAFK, saveAFK } from '../lib/afkDB.js'

export function before(m) {
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

  const jids = [...new Set([...(m.mentionedJid || []), ...(m.quoted ? [m.quoted.sender] : [])])]
  for (const jid of jids) {
    if (afk[jid]) {
      const target = afk[jid]
      const reason = target.reason || ''
      m.reply(`${tradutor.texto1[0]}

*—◉ ${tradutor.texto1[1]}*      
*—◉ ${reason ? `${tradutor.texto1[2]}` + reason : `${tradutor.texto1[3]}`}*
*—◉ ${tradutor.texto1[4]} ${(new Date - target.lastseen).toTimeString()}*`)
    }
  }

  return true
}