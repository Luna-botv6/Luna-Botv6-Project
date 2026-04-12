import fs from 'fs'
import { setConfig } from '../lib/funcConfig.js'

const handler = async (m, { conn, args }) => {
  const idioma = global.db.data.users[m.sender].language || global.defaultLenguaje
  const tradutor = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`)).functions.banchat

  const motivo = args.join(' ') || tradutor.sin_motivo
  const senderTag = `@${m.sender.split('@')[0]}`

  setConfig(m.chat, { isBanned: true })

  await conn.sendMessage(m.chat, {
    text: tradutor.texto1
      .replace('{tag}', senderTag)
      .replace('{motivo}', motivo),
    mentions: [m.sender]
  })
}

handler.help = ['banchat']
handler.tags = ['owner']
handler.command = /^banchat$/i
handler.rowner = true

export default handler
