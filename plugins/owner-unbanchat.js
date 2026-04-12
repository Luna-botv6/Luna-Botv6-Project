import fs from 'fs'
import { setConfig } from '../lib/funcConfig.js'

const handler = async (m, { conn }) => {
  const idioma = global.db.data.users[m.sender].language || global.defaultLenguaje
  const tradutor = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`)).functions.unbanchat

  const senderTag = `@${m.sender.split('@')[0]}`

  setConfig(m.chat, { isBanned: false })

  await conn.sendMessage(m.chat, {
    text: tradutor.texto1.replace('{tag}', senderTag),
    mentions: [m.sender]
  })
}

handler.help = ['unbanchat']
handler.tags = ['owner']
handler.command = /^unbanchat$/i
handler.rowner = true

export default handler
