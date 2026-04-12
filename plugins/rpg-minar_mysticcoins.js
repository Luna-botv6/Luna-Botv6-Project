import { readFileSync } from 'fs'
import { getLastMysticMiningTime, setLastMysticMiningTime, initMysticMiningUser } from '../lib/minarmystic.js'
import { addMysticCoins, getMysticCoins } from '../lib/stats.js'

const handler = async (m, { conn }) => {
  try {
    const userId = m.sender
    await initMysticMiningUser(userId)
    const idioma = global.db.data.users[userId]?.language || global.defaultLenguaje
    const tradutor = JSON.parse(readFileSync(`./src/lunaidiomas/${idioma}.json`)).plugins.rpg_mystic

    const cooldown = 600000
    const lastTime = getLastMysticMiningTime(userId)
    const now = Date.now()

    if (lastTime && (now - lastTime < cooldown)) {
      const remaining = cooldown - (now - lastTime)
      return m.reply(`⌛ *${tradutor.texto1[0]}*\n\n🔮 ${tradutor.texto1[1]} *${msToTime(remaining)}*\n\n✨ _${tradutor.texto1[2]}_`)
    }

    const reward = calcularMystic()
    setLastMysticMiningTime(userId, now)
    addMysticCoins(userId, reward)
    const total = getMysticCoins(userId)

    await m.reply(`🔮 *${tradutor.texto2[0]}* 🔮\n\n✨ ${tradutor.texto2[1]} *${reward} MysticCoins*\n💜 ${tradutor.texto2[2]} *${total} MysticCoins*\n⏱️ ${tradutor.texto2[3]}\n\n🌙 _${tradutor.texto2[4]}_ 🌙`)
  } catch (error) {
    console.error(error)
    const idioma = global.db.data.users[m.sender]?.language || global.defaultLenguaje
    const tradutor = JSON.parse(readFileSync(`./src/lunaidiomas/${idioma}.json`)).plugins.rpg_mystic
    await m.reply(`❌ *${tradutor.texto3}*`)
  }
}

handler.help = ['minarmystic']
handler.tags = ['economia']
handler.command = ['minarmystic', 'mysticmine', 'canalizar', 'mystic']

export default handler

function msToTime(duration) {
  const seconds = Math.floor((duration / 1000) % 60)
  const minutes = Math.floor((duration / (1000 * 60)) % 60)
  return `${minutes}m ${seconds}s`
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
  return arr[Math.floor(Math.random() * arr.length)]
}
