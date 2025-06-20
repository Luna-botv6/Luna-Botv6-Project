import { getUserStats, getRoleByLevel } from '../lib/stats.js' // ← IMPORTAR getRoleByLevel
import { xpRange } from '../lib/levelling.js' // ← IMPORTAR para cálculo correcto de XP

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

  // Obtener el rol actualizado basado en el nivel actual
  const currentRole = getRoleByLevel(stats.level) // ← USAR LA FUNCIÓN ACTUALIZADA

  // Calcular experiencia para siguiente nivel usando xpRange
  const { min, max } = xpRange(stats.level, global.multiplier || 1)
  const expForNextLevel = max - stats.exp
  const expProgress = `${stats.exp}/${max}`
  
  // Construir el texto con información más detallada (usando @tag en lugar de nombre)
  const text = `
╭━━━〔 *📊 Estadísticas* 〕━━━⬣
┃ *👤 Usuario:* @${userId.split('@')[0]}
┃
┃ *📈 Nivel:* ${stats.level}
┃ *🏅 Rango:* ${currentRole}
┃ *⚡ Experiencia:* ${formatNumber(stats.exp)}
┃ *📊 Progreso:* ${expProgress}
┃ *🎯 Para subir:* ${formatNumber(expForNextLevel)} exp
┃
┃ *💰 Recursos:*
┃ *💎 Diamantes:* ${formatNumber(stats.money)}
┃ *🌙 Luna Coins:* ${formatNumber(stats.lunaCoins)}
┃ *🔮 Mystic Coins:* ${formatNumber(stats.mysticcoins)}
┃
┃ *📋 Otros datos:*
┃ *📦 Límite:* ${stats.limit}
┃ *🎮 Participaciones:* ${stats.joincount}
┃ *🪙 Premium:* ${stats.premiumTime > 0 ? 'Sí' : 'No'}
┃
╰━━━━━━━━━━━━━━━━━━━━⬣

💬 ${getMotivationalMessage(stats.level)}
  `.trim()

  // Enviar respuesta con la mención para que WhatsApp lo transforme en clickeable
  await m.reply(text, null, { mentions: [userId] })
}

// Función para formatear números grandes
function formatNumber(num) {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1) + 'B'
  } else if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

// Función para obtener mensaje motivacional basado en el nivel
function getMotivationalMessage(level) {
  if (level >= 500) return '🌌 ¡Eres una leyenda cósmica! Has alcanzado las estrellas.'
  if (level >= 400) return '⭐ ¡Poder supremo! Pocos han llegado tan lejos.'
  if (level >= 300) return '🌟 ¡Ser celestial! Tu dedicación es inspiradora.'
  if (level >= 200) return '👑 ¡Emperador divino! Dominas este reino.'
  if (level >= 150) return '🔱 ¡Titán imparable! Tu fuerza es legendaria.'
  if (level >= 120) return '⚡ ¡Semidiós! El poder fluye a través de ti.'
  if (level >= 100) return '🏆 ¡Campeón supremo! Has demostrado tu valía.'
  if (level >= 80) return '🦅 ¡Como un fénix! Renaces más fuerte.'
  if (level >= 70) return '🐉 ¡Dragón poderoso! Tu rugido se escucha en todo el reino.'
  if (level >= 60) return '👹 ¡Fuerza demoníaca! Nada puede detenerte.'
  if (level >= 50) return '💎 ¡Leyenda viviente! Tu nombre será recordado.'
  if (level >= 40) return '🌙 ¡Poder místico! La magia te acompaña.'
  if (level >= 30) return '🔥 ¡Maestro consumado! Tu habilidad es notable.'
  if (level >= 20) return '⚔️ ¡Guerrero épico! Tu valentía es admirable.'
  if (level >= 15) return '⭐ ¡Veterano respetado! La experiencia te respalda.'
  if (level >= 10) return '🏅 ¡Usuario avanzado! Sigues progresando bien.'
  if (level >= 5) return '📘 ¡Buen progreso! Estás aprendiendo rápido.'
  return '🧰 ¡Bienvenido novato! Tu aventura apenas comienza.'
}

handler.help = ['verexp', 'stats', 'estadisticas']
handler.tags = ['xp', 'rpg']
handler.command = /^(verexp|estadisticas|stats)$/i
export default handler