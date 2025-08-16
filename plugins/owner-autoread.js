import { enableFunction, disableFunction, isFunctionEnabled } from '../lib/owner-funciones.js'  // Ajusta ruta

const handler = async (m, { args, usedPrefix, command, conn }) => {
  const jid = conn.user.jid
  const keyMap = { autoread: 'auread', autoread2: 'autoread2' } // Mapea comando a key de JSON
  const key = keyMap[command] || 'auread'

  // Asegurar estructura
  if (!global.db.data.settings) global.db.data.settings = {}
  if (!global.db.data.settings[jid]) global.db.data.settings[jid] = {}

  if (args[0] === 'on') {
    global.db.data.settings[jid][command] = true   // Cambia en memoria para bot
    enableFunction(key)                             // Cambia en JSON para persistencia
    m.reply(`✅ ${command} activado correctamente.`)
  } else if (args[0] === 'off') {
    global.db.data.settings[jid][command] = false
    disableFunction(key)
    m.reply(`🚫 ${command} desactivado correctamente.`)
  } else if (!args[0] || args[0] === 'status') {
    const estadoMemoria = global.db.data.settings[jid][command] ? 'activado' : 'desactivado'
    const estadoJSON = isFunctionEnabled(key) ? 'activado' : 'desactivado'
    m.reply(
      `📌 Estado actual de ${command}:\n- En memoria: ${estadoMemoria}\n- En JSON: ${estadoJSON}\n\n` +
      `Usa:\n${usedPrefix}${command} on\n${usedPrefix}${command} off`
    )
  } else {
    m.reply(`📌 Uso correcto:\n${usedPrefix}${command} on\n${usedPrefix}${command} off`)
  }
}

handler.command = ['autoread', 'autoread2']
handler.owner = true
handler.desc = 'Activa o desactiva la lectura automática de mensajes.'
export default handler

