import { getUserStats } from '../lib/stats.js' // tu función para stats

async function handler(m, { conn }) {
  // Si mencionan a alguien, toma ese id, si no, usa el que manda el mensaje
  let userId = m.mentionedJid && m.mentionedJid.length ? m.mentionedJid[0] : m.sender

  // Intenta obtener el nombre real del contacto
  let name = userId.split('@')[0] // fallback si falla
  try {
    const contact = await conn.getContact(userId)
    name = contact.notify || contact.name || name
  } catch (e) {
    // console.log('No se pudo obtener el contacto:', e)
  }

  // Obtener estadísticas del usuario
  const stats = getUserStats(userId)

  // Construir el texto con el nombre real visible
  const text = `📊 *Estadísticas de ${name}*\n\n` +
               `✨ *Nivel:* ${stats.level || 0}\n` +
               `⚡ *Experiencia:* ${stats.exp || 0}\n` +
               `💎 *Diamantes:* ${stats.money || 0}\n` +
               `🔰 *Rol:* ${stats.role || 'Ninguno'}\n` +
               `📦 *Límite:* ${stats.limit || 0}`

  // Enviar respuesta con la mención para que WhatsApp lo transforme en clickeable
  await m.reply(text, null, { mentions: [userId] })
}

handler.help = ['verexp', 'stats']
handler.tags = ['xp', 'rpg']
handler.command = ['verexp', 'estadisticas', 'stats']
export default handler
