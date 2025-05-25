import fs from 'fs'
import { loadAFK, saveAFK } from '../lib/afkDB.js'

const handler = async (m, { text, conn }) => {
  const idioma = global.db.data.users[m.sender].language || global.defaultLenguaje
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`))
  const tradutor = _translate.plugins.afk_afk

  const afk = loadAFK()
  afk[m.sender] = {
    reason: text,
    lastseen: Date.now()
  }
  saveAFK(afk)

  m.reply(`${tradutor.texto1[0]} ${conn.getName(m.sender)} ${tradutor.texto1[1]} ${text ? ': ' + text : ''}*`)
}

handler.help = ['afk [motivo]']
handler.tags = ['main']
handler.command = /^afk$/i

export default handler