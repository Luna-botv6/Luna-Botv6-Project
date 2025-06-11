import { getUserStats, setUserStats } from '../lib/stats.js'
import fs from 'fs'
import path from 'path'

const cooldownFile = './database/limitgamecooldown.json'
const COOLDOWN_TIME = 10 * 60 * 1000 // 10 minutos

let cooldowns = {}
if (fs.existsSync(cooldownFile)) {
  cooldowns = JSON.parse(fs.readFileSync(cooldownFile))
} else {
  fs.writeFileSync(cooldownFile, JSON.stringify({}))
}

function saveCooldowns() {
  fs.writeFileSync(cooldownFile, JSON.stringify(cooldowns, null, 2))
}

const handler = async (m, { command, args, usedPrefix }) => {
  const id = m.sender
  const now = Date.now()

  // Cooldown
  if (cooldowns[id] && now - cooldowns[id] < COOLDOWN_TIME) {
    const remaining = ((COOLDOWN_TIME - (now - cooldowns[id])) / 60000).toFixed(1)
    return m.reply(`⏳ Espera ${remaining} minutos antes de volver a jugar.`)
  }

  const numero = Math.floor(Math.random() * 5) + 1 // número entre 1 y 5

  if (!args[0]) {
    return m.reply(`🎯 Adivina un número del 1 al 5.\nEjemplo de uso:\n*${usedPrefix + command} 3*`)
  }

  const guess = parseInt(args[0])
  if (isNaN(guess) || guess < 1 || guess > 5) {
    return m.reply('❌ Ingresa un número válido entre 1 y 5.')
  }

  if (guess === numero) {
    const recompensa = Math.floor(Math.random() * 5) + 1
    const user = getUserStats(id)
    user.limit += recompensa
    setUserStats(id, user)
    cooldowns[id] = now
    saveCooldowns()
    return m.reply(`🎉 ¡Correcto! Era *${numero}*.\nGanaste *${recompensa}* límites 🔋`)
  } else {
    cooldowns[id] = now
    saveCooldowns()
    return m.reply(`❌ Fallaste. Era *${numero}*.\n¡Suerte para la próxima!`)
  }
}

handler.help = ['juegolimit']
handler.tags = ['juegos']
handler.command = /^juegolimit$/i

export default handler
