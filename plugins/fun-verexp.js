import { getUserStats } from '../lib/stats.js'

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

  // Calcular experiencia para siguiente nivel (fórmula simple basada en nivel)
  const expForNextLevel = (stats.level + 1) * 1000 - stats.exp
  
  // Construir el texto con el nombre real visible
  const text = `📊 *Estadísticas de ${name}*\n\n` +
               `✨ *Nivel:* ${stats.level}\n` +
               `⚡ *Experiencia:* ${stats.exp}\n` +
               `📈 *Para siguiente nivel:* ${expForNextLevel} exp\n` +
               `💎 *Diamantes:* ${stats.money}\n` +
               `🌙 *Luna Coins:* ${stats.lunaCoins}\n` +
               `🔮 *Mystic Coins:* ${stats.mysticcoins}\n` +
               `🔰 *Rol:* ${stats.role}\n` +
               `📦 *Límite:* ${stats.limit}\n` +
               `🎮 *Uniones:* ${stats.joincount}`

  // Enviar respuesta con la mención para que WhatsApp lo transforme en clickeable
  await m.reply(text, null, { mentions: [userId] })
}

// Función para formatear números grandes
function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

handler.help = ['verexp', 'stats']
handler.tags = ['xp', 'rpg']
handler.command = ['verexp', 'estadisticas', 'stats']
export default handler
