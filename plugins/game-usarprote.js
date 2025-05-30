import { getUserStats, setUserStats } from '../lib/stats.js'
import { activarProteccion, tieneProteccion } from '../lib/usarprote.js'

const handler = async (m, { conn, args }) => {
  const userId = m.sender

  if (tieneProteccion(userId).activa) {
    return conn.sendMessage(m.chat, { text: '⚠️ Ya tienes la protección activa. Espera a que termine para volver a activarla.' }, { quoted: m })
  }

  const userStats = getUserStats(userId)

  if ((userStats.mysticcoins ?? 0) === 0) {
    userStats.mysticcoins = 5
    setUserStats(userId, userStats)
    await conn.sendMessage(m.chat, { text: '🎁 ¡Felicidades! Se te han regalado 5 mysticcoins para que puedas activar la protección.' }, { quoted: m })
  }

  const duracionesValidas = ['5', '12', '24']

  if (args[0] && !duracionesValidas.includes(String(args[0]))) {
    return conn.sendMessage(m.chat, {
      text: '❌ Argumento inválido. Usa: /usarprote [5|12|24]'
    }, { quoted: m })
  }

  // Por defecto 2 horas si no se pasa argumento válido
  const horas = args[0] ? String(args[0]) : '2'

  await activarProteccion(m, conn, horas)
}

handler.help = ['usarprote']
handler.tags = ['econ']
handler.command = /^(usarprote|usarproteccion|proteccion)$/i

export default handler