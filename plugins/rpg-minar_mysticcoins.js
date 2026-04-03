import { readFileSync } from 'fs'
import { getLastMysticMiningTime, setLastMysticMiningTime, initMysticMiningUser } from '../lib/minarmystic.js'
import { addMysticCoins, getMysticCoins } from '../lib/stats.js'

const handler = async (m, { conn }) => {
  try {
    const userId = m.sender
    await initMysticMiningUser(userId)
    const idioma = global.db?.data?.users?.[userId]?.language || global.defaultLenguaje
    const _translate = JSON.parse(readFileSync(`./src/languages/${idioma}.json`, 'utf-8'))
    const cooldown = 600000
    const lastTime = getLastMysticMiningTime(userId)
    const now = Date.now()
    if (lastTime && (now - lastTime < cooldown)) {
      const remaining = cooldown - (now - lastTime)
      return m.reply(`⌛ *Aun estas agotado!*\n\n🔮 Podras canalizar energia mystica nuevamente en *${msToTime(remaining)}*\n\n✨ _Recupera tu energia y vuelve pronto_`)
    }
    const reward = calcularMystic()
    setLastMysticMiningTime(userId, now)
    addMysticCoins(userId, reward)
    const total = getMysticCoins(userId)
    await m.reply(`🔮 *CANALIZACION EXITOSA* 🔮\n\n✨ Has obtenido *${reward} MysticCoins*\n💜 Total acumulado: *${total} MysticCoins*\n⏱️ Podras canalizar de nuevo en *10 minutos*\n\n🌙 _Sigue canalizando para obtener mas MysticCoins!_ 🌙`)
  } catch (error) {
    console.error('Error en comando canalizar mystic:', error)
    await m.reply(`❌ *Error*\n\nHubo un problema al canalizar energia. Intenta nuevamente en unos momentos.`)
  }
}

handler.help = ['minarmystic']
handler.tags = ['economia']
handler.command = ['minarmystic', 'mysticmine', 'canalizar', 'mystic']
handler.fail = null
handler.exp = 0
handler.limit = false
export default handler

function msToTime(duration) {
  const seconds = Math.floor((duration / 1000) % 60)
  const minutes = Math.floor((duration / (1000 * 60)) % 60)
  const hours = Math.floor((duration / (1000 * 60 * 60)) % 24)
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

function calcularMystic() {
  const chance = Math.random()
  if (chance < 0.5) return rand([1, 2, 3, 5])
  if (chance < 0.75) return rand([8, 10, 12, 15])
  if (chance < 0.9) return rand([20, 25, 30])
  if (chance < 0.98) return rand([50, 75, 100])
  return rand([150, 200, 250])
}

function rand(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return 1
  return arr[Math.floor(Math.random() * arr.length)]
}
