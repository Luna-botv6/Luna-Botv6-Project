import { canLevelUp, xpRange } from '../lib/levelling.js'
import { levelup } from '../lib/canvas.js'
import {
  getUserStats,
  setUserStats,
  getRoleByLevel,
  addExp,
  addMoney
} from '../lib/stats.js'

const handler = async (m, { conn }) => {
  const id = m.sender
  let user = getUserStats(id)
  const beforeLevel = user.level
  let leveledUp = false

  // 🔄 Procesar todos los level ups pendientes
  while (canLevelUp(user.level, user.exp)) {
    const { max } = xpRange(user.level)
    if (user.exp >= max) {
      user.exp -= max
      user.level++
      leveledUp = true
    } else break
  }

  // 🔄 Actualizar rol después de los level ups
  if (leveledUp) {
    user.role = getRoleByLevel(user.level)
    setUserStats(id, user)
  }

  // 🎁 Si subió de nivel, dar recompensas y mostrar mensaje
  if (user.level > beforeLevel) {
    // Dar recompensas por cada nivel subido
    const levelsGained = user.level - beforeLevel
    const expBonus = levelsGained * 1000
    const moneyBonus = levelsGained * 600
    
    addExp(id, expBonus)
    addMoney(id, moneyBonus)

    try {
      const img = await levelup(`🏰 Gremio de Aventureros\n¡Felicidades, ${await conn.getName(id)}!`, user.level)
      await conn.sendFile(m.chat, img, 'levelup.jpg',
        `🎉 *¡Subiste de Nivel!*\n\n◉ Nivel anterior: ${beforeLevel}\n◉ Nivel actual: ${user.level}\n◉ Rango: ${user.role}\n\n🎁 Bonus: +${expBonus} XP, +${moneyBonus} diamantes`, m)
    } catch {
      m.reply(`🎉 *¡Subiste de Nivel!*\n\n◉ Nivel anterior: ${beforeLevel}\n◉ Nivel actual: ${user.level}\n◉ Rango: ${user.role}\n\n🎁 Bonus: +${expBonus} XP, +${moneyBonus} diamantes`)
    }
  } else {
    // 📊 Si NO subió de nivel, mostrar progreso actual
    const { max } = xpRange(user.level)
    const xpNeeded = Math.max(0, max - user.exp)
    const percent = Math.max(0, Math.min(100, Math.floor((user.exp / max) * 100)))
    const bars = progressBar(percent)

    return m.reply(
      `🏰 *Gremio de Aventureros*\n*¡Bienvenido, ${await conn.getName(id)}!*\n\n` +
      `◉ Nivel actual: ${user.level}\n` +
      `◉ Rango actual: ${user.role}\n` +
      `◉ Puntos de experiencia: ${user.exp}/${max} (${percent}%)\n` +
      `◉ Progreso: ${bars}\n\n` +
      `—◉ Te faltan ${xpNeeded} XP para subir. ¡Sigue interactuando!`)
  }
}

// 📊 Función auxiliar para generar barra de progreso
function progressBar(percent) {
  const totalBars = 10
  const filledBars = Math.floor(percent / 10)
  const emptyBars = totalBars - filledBars
  return '▰'.repeat(filledBars) + '▱'.repeat(emptyBars)
}

handler.help = ['nivel', 'lvl', 'levelup']
handler.tags = ['xp']
handler.command = ['nivel', 'lvl', 'levelup']
export default handler
