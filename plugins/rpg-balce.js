import fs from 'fs'
import { getUserStats } from '../lib/stats.js'

const handler = async (m, { conn, usedPrefix }) => {
  let who
  if (m.isGroup) {
    who = m.mentionedJid?.[0] || m.sender
  } else {
    who = m.sender
  }

  const name = conn.getName(who)
  const stats = getUserStats(who)

  // Idioma (solo si aún usas archivos por idioma)
  const idioma = stats.language || global.defaultLenguaje
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`))
  const tradutor = _translate.plugins.rpg_balance

  m.reply(`
${tradutor.texto1[0]}
${tradutor.texto1[1]} ${name}
${tradutor.texto1[2]} ${stats.money}💎
${tradutor.texto1[3]}
${tradutor.texto1[4]} 
${tradutor.texto1[5]}
❏ *${usedPrefix}buy ${tradutor.texto1[6]}
❏ *${usedPrefix}buyall*`)
}

handler.help = ['bal']
handler.tags = ['xp']
handler.command = ['bal', 'diamantes', 'diamond', 'balance']

export default handler
