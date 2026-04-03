import { readFileSync } from 'fs'
import { getLastDiamantMiningTime, setLastDiamantMiningTime, initDiamantMiningUser } from '../lib/minardiamantes.js'
import { addMoney, getMoney } from '../lib/stats.js'

const handler = async (m, { conn }) => {
  try {
    const userId = m.sender
    await initDiamantMiningUser(userId)
    const idioma = global.db?.data?.users?.[userId]?.language || global.defaultLenguaje
    const _translate = JSON.parse(readFileSync(`./src/languages/${idioma}.json`, 'utf-8'))
    const tradutor = _translate.plugins.rpg_minar
    const cooldown = 600000
    const lastTime = getLastDiamantMiningTime(userId)
    const now = Date.now()
    if (lastTime && (now - lastTime < cooldown)) {
      const remaining = cooldown - (now - lastTime)
      return m.reply(`⏰ *Aun estas cansado!*\n\n💎 Podras minar diamantes nuevamente en *${msToTime(remaining)}*\n\n✨ _Descansa un poco y vuelve pronto_`)
    }
    const reward = calcularDiamantes()
    setLastDiamantMiningTime(userId, now)
    addMoney(userId, reward)
    const total = getMoney(userId)
    await m.reply(`⛏️ *MINADO EXITOSO* ⛏️\n\n💎 Has encontrado *${reward} diamantes*\n💰 Total acumulado: *${total} diamantes*\n⏱️ Podras volver a minar en *10 minutos*\n\n✨ _Sigue minando para conseguir mas diamantes!_ ✨`)
  } catch (error) {
    console.error('Error en comando minar diamantes:', error)
    await m.reply(`❌ *Error*\n\nHubo un problema al minar diamantes. Intenta nuevamente en unos momentos.`)
  }
}

handler.help = ['minardiamantes']
handler.tags = ['economia']
handler.command = ['minardiamantes', 'minard', 'diamondmine', 'minar2']
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

function calcularDiamantes() {
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