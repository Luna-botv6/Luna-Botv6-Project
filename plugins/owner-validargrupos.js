const cooldown = new Map()

export async function before(m, { conn, isAdmin, isBotAdmin, isOwner, isROwner }) {
  const group = m.chat
  if (!m.isGroup) return
  if (!m.text) return
  if (isOwner || isROwner) return // No verificar si es dueño

  const time = 10 * 60 * 1000 // 10 minutos
  const now = Date.now()

  // Si ya se envió hace poco, salir
  if (cooldown.has(group) && (now - cooldown.get(group) < time)) return

  const botResponseExpected = /^([/!#A-Z])/i.test(m.text) // Si parece comando o spam

  // Comprobamos si el mensaje corresponde a un comando válido
  const pluginsArray = global.plugins ? Object.values(global.plugins) : []
  const isValidCommand = pluginsArray.some(p => {
    if (!p.command) return false
    const regex = p.command instanceof RegExp ? p.command : new RegExp(`^${p.command}$`, 'i')
    return regex.test(m.text.slice(1))
  })

  // Si no parece comando o es un comando válido, salir
  if (!botResponseExpected || isValidCommand) return

  // Contador de mensajes sospechosos en grupo
  const messageCount = (global.db.data.fxveri = global.db.data.fxveri || {})
  messageCount[group] = messageCount[group] || { count: 0, last: 0 }

  if (now - messageCount[group].last < 10000) {
    messageCount[group].count++
  } else {
    messageCount[group].count = 1
  }

  messageCount[group].last = now

  if (messageCount[group].count >= 3) { // Detectar 3 mensajes sospechosos seguidos
    cooldown.set(group, now) // Activar cooldown
    setTimeout(() => cooldown.delete(group), time)

    const msg = `
*🚨 PROBLEMAS CON TU GRUPO 🚨*

¡Hola! Parece que el bot no está respondiendo a tus mensajes, aunque los lee. No te preocupes, tenemos una solución simple.

*¿Qué puedes hacer?*
1. *Quita al bot de admin* o dale admin a alguien más en el grupo.
2. *Edita la descripción del grupo* (añade o cambia algo).
3. *Saca al bot y vuelve a meterlo*.

*¿Qué esperar?*
- Espera 1 minuto tras hacer algún cambio.
- Si el problema sigue, contacta con el Owner.

*¡Estamos aquí para ayudarte!*`.trim()

    await conn.sendMessage(group, { text: msg })
  }
}