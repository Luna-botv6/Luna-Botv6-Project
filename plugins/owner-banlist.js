import fs from 'fs'

const handler = async (m, { conn, isOwner }) => {
  const idioma = global.db.data.users[m.sender].language || global.defaultLenguaje
  const tradutor = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`)).functions.banlist

  const chats = Object.entries(global.db.data.chats).filter((chat) => chat[1].isBanned)
  const users = Object.entries(global.db.data.users).filter((user) => user[1].banned)

  const fmtUser = ([jid]) => `├ ${isOwner ? '@' + jid.split('@')[0] : jid}`
  const fmtChat = ([jid]) => `├ ${jid}`

  const caption = [
    `┌${tradutor.texto1}`,
    `├ ${tradutor.total}: ${users.length}`,
    ...(users.length ? users.map(fmtUser) : ['├']),
    '└────',
    '',
    `┌${tradutor.texto2}`,
    `├ ${tradutor.total}: ${chats.length}`,
    ...(chats.length ? chats.map(fmtChat) : ['├']),
    '└────',
  ].join('\n').trim()

  m.reply(caption, null, { mentions: conn.parseMention(caption) })
}

handler.command = /^banlist(ned)?|ban(ned)?list|daftarban(ned)?$/i
handler.rowner = true

export default handler
