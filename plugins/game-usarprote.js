import { getUserStats, setUserStats } from '../lib/stats.js'
import { usarProteccion, tieneProteccion } from '../lib/usarprote.js'

const handler = async (m, { conn }) => {
  const userId = m.sender

  if (tieneProteccion(userId)) {
    return conn.sendMessage(m.chat, { text: '⚠️ Ya tienes la protección activa. Espera a que termine para volver a activarla.' }, { quoted: m })
  }

  const userStats = getUserStats(userId)

  if ((userStats.mysticcoins ?? 0) === 0) {
    userStats.mysticcoins = 5
    setUserStats(userId, userStats)
    await conn.sendMessage(m.chat, { text: '🎁 ¡Felicidades! Se te han regalado 5 mysticcoins para que puedas activar la protección.' }, { quoted: m })
  }

  await usarProteccion(m, conn)
}

handler.help = ['usarprote']
handler.tags = ['econ']
handler.command = /^(usarprote|usarproteccion|proteccion)$/i

export default handler
