import fs from 'fs'

function handler(m, { conn, isOwner }) {
  if (!isOwner) return m.reply('🚫 Solo el owner puede usar esto.')

  const idioma = global.db.data.users[m.sender].language || global.defaultLenguaje
  const tradutor = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`)).plugins.verbaneados

  const baneados = global.db.data.baneados || {}
  const keys = Object.keys(baneados)

  if (!keys.length) return m.reply(tradutor.sinBaneados)

  let texto = `${tradutor.titulo}\n\n`

  for (const id of keys) {
    const info = baneados[id]
    const fecha = new Date(info.fecha).toLocaleString()
    texto += `🔸 *@${id.split('@')[0]}*\n` +
             `• ${tradutor.motivo}: ${info.motivo}\n` +
             `• ${tradutor.fecha}: ${fecha}\n` +
             `• ${tradutor.por}: ${info.bloqueadoPor}\n\n`
  }

  m.reply(texto.trim(), null, { mentions: keys })
}

handler.command = ['verbaneados']
handler.rowner = true
handler.help = ['verbaneados']
handler.tags = ['owner']

export default handler