import fs from 'fs'

const handler = async (m, { conn, text }) => {

  const idioma = global.db.data.users[m.sender].language || global.defaultLenguaje
  const tradutor = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`)).plugins.rpcancion

  conn.tebaklagu = conn.tebaklagu || {}
  const id = m.chat

  if (!(id in conn.tebaklagu)) return m.reply(tradutor.noActiva)
  if (!text) return m.reply(tradutor.sinRespuesta)

  const juego = conn.tebaklagu[id][1]
  const correcta = juego.jawaban.toLowerCase()
  const respuesta = text.trim().toLowerCase()

  if (respuesta === correcta) {
    m.reply(
      tradutor.correcto
        .replace('%respuesta%', juego.jawaban)
        .replace('%xp%', conn.tebaklagu[id][2])
    )
    clearTimeout(conn.tebaklagu[id][3])
    delete conn.tebaklagu[id]
  } else {
    m.reply(tradutor.incorrecto)
  }
}

handler.command = /^rpcancion$/i

export default handler