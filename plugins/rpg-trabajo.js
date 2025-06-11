import { getUserStats, addExp, addMoney, setUserStats } from '../lib/stats.js'

const handler = async (m, { conn }) => {
  if (handler.enviando) return
  handler.enviando = true

  const userId = m.sender
  const now = Date.now()
  const cooldown = 10 * 60 * 1000 // 10 minutos en ms

  const userStats = getUserStats(userId)

  if (userStats.lastwork && now - userStats.lastwork < cooldown) {
    const timeLeft = msToTime(cooldown - (now - userStats.lastwork))
    handler.enviando = false
    return conn.sendMessage(m.chat, { text: `⏳ *Espera un momento, aventurero!* \n\n🏃‍♂️ Vuelve a trabajar en: *${timeLeft}*` }, { quoted: m })
  }

  // Genera experiencia y dinero aleatorios
  const expGanada = Math.floor(Math.random() * 5000) + 500
  const moneyGanado = Math.floor(Math.random() * 1000) + 100

  // Añade exp y dinero
  addExp(userId, expGanada)
  addMoney(userId, moneyGanado)

  // Actualiza el último trabajo para cooldown
  setUserStats(userId, { lastwork: now })

  // Obtiene stats actualizadas
  const statsActualizados = getUserStats(userId)

  const mensajesTrabajo = [
    "Trabajaste duro y ganaste recompensas valiosas.",
    "Tu esfuerzo fue reconocido y te pagaron bien.",
    "Otro día de trabajo productivo, sigue así.",
    "Has completado tu jornada laboral con éxito.",
    "Ganaste experiencia y diamantes por tu trabajo."
  ]

  const msg = `
⚔️ *¡Aventura completada!*

🌟 Ganaste *${expGanada}* de experiencia.
💰 Ganaste *${moneyGanado}* diamantes.

🎖️ Nivel actual: *${statsActualizados.level}*
🏅 Rol: *${statsActualizados.role}*

${pickRandom(mensajesTrabajo)}
`.trim()

  await conn.sendMessage(m.chat, { text: msg }, { quoted: m })

  handler.enviando = false
}

handler.help = ['work']
handler.tags = ['xp']
handler.command = /^(work|trabajar|chambear)$/i

export default handler

function msToTime(duration) {
  let seconds = Math.floor((duration / 1000) % 60)
  let minutes = Math.floor((duration / (1000 * 60)) % 60)
  minutes = (minutes < 10) ? '0' + minutes : minutes
  seconds = (seconds < 10) ? '0' + seconds : seconds
  return `${minutes} minutos ${seconds} segundos`
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)]
}

