import fs from 'fs'

function handler(m, { conn, text, isOwner }) {

  const idioma = global.db.data.users[m.sender].language || global.defaultLenguaje
  const tradutor = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`)).plugins.desbloquear

  if (!isOwner) return m.reply(tradutor.soloOwner)

  const numero = text.replace(/\D/g, '') + '@s.whatsapp.net'

  if (!global.db.data.baneados || !global.db.data.baneados[numero])
    return m.reply(tradutor.noBaneado)

  delete global.db.data.baneados[numero]

  conn.updateBlockStatus(numero, 'unblock')
  m.reply(tradutor.usuarioDesbloqueado.replace('%numero%', numero))
}

handler.command = ['desbloquear']
handler.rowner = true
handler.help = ['desbloquear <número>']
handler.tags = ['owner']

export default handler
