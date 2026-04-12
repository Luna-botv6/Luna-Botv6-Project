import fs from 'fs'

const handler = async (m, { conn, text }) => {
  const idioma = global.db.data.users[m.sender].language || global.defaultLenguaje
  const tradutor = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`)).plugins.owner_unbanuser

  if (!text) throw tradutor.texto1
  let who
  if (m.isGroup) who = m.mentionedJid[0]
  else who = m.chat
  if (!who) throw tradutor.texto2
  const users = global.db.data.users
  if (!users[who]) users[who] = {}
  users[who].banned = false
  conn.reply(m.chat, tradutor.texto3, m)
}

handler.help = ['unbanuser']
handler.tags = ['owner']
handler.command = /^unbanuser$/i
handler.rowner = true
export default handler
