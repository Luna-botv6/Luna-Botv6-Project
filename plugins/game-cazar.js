import fs from 'fs'
import path from 'path'
import { addExp, addMoney, removeExp, removeMoney } from '../lib/stats.js'

const COOLDOWN_FILE = './database/cazarcooldown.json'
const COOLDOWN_TIME = 5 * 60 * 1000 // 5 minutos

let cooldowns = {}

if (fs.existsSync(COOLDOWN_FILE)) {
  cooldowns = JSON.parse(fs.readFileSync(COOLDOWN_FILE))
}

function saveCooldowns() {
  fs.writeFileSync(COOLDOWN_FILE, JSON.stringify(cooldowns, null, 2))
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function getAnimal() {
  const animalesComunes = [
    { nombre: '🦌 Ciervo', exp: rand(500, 1200), money: rand(50, 200) },
    { nombre: '🐗 Jabalí', exp: rand(600, 1300), money: rand(80, 250) },
    { nombre: '🐍 Serpiente', exp: rand(500, 1000), money: rand(70, 180) },
    { nombre: '🐔 Gallina', exp: rand(500, 800), money: rand(60, 120) },
    { nombre: '🦊 Zorro', exp: rand(700, 1400), money: rand(100, 300) },
    { nombre: '🐻 Oso', exp: rand(1000, 1800), money: rand(150, 350) },
    { nombre: '🐅 Tigre', exp: rand(1300, 2000), money: rand(200, 400) },
    { nombre: '🐊 Cocodrilo', exp: rand(1400, 2100), money: rand(250, 450) },
    { nombre: '🐿️ Ardilla', exp: rand(500, 900), money: rand(50, 150) },
    { nombre: '🦘 Canguro', exp: rand(800, 1500), money: rand(100, 250) },
    { nombre: '🦓 Cebra veloz', exp: rand(600, 1100), money: rand(80, 200) },
    { nombre: '🦍 Gorila gigante', exp: rand(1000, 1800), money: rand(200, 350) },
    { nombre: '🦇 Murciélago nocturno', exp: rand(700, 1200), money: rand(90, 180) },
    { nombre: '🐫 Camello del desierto', exp: rand(800, 1400), money: rand(120, 250) },
    { nombre: '🦅 Águila real', exp: rand(1000, 1700), money: rand(180, 300) },
    { nombre: '🦒 Jirafa', exp: rand(900, 1500), money: rand(150, 270) },
    { nombre: '🦂 Escorpión venenoso', exp: rand(600, 1000), money: rand(90, 160) },
    { nombre: '🐸 Rana venenosa', exp: rand(550, 950), money: rand(70, 130) },
    { nombre: '🦡 Tejón salvaje', exp: rand(700, 1300), money: rand(100, 200) },
  ]

  const animalesRaros = [
    { nombre: '🐉 Dragón salvaje', exp: rand(1500, 2200), money: rand(300, 450) },
    { nombre: '🦄 Unicornio brillante', exp: rand(1500, 2200), money: rand(300, 450) }
  ]

  return Math.random() < 0.1
    ? animalesRaros[Math.floor(Math.random() * animalesRaros.length)]
    : animalesComunes[Math.floor(Math.random() * animalesComunes.length)]
}

const handler = async (m, { conn }) => {
  const id = m.sender
  const now = Date.now()

  if (cooldowns[id] && now - cooldowns[id] < COOLDOWN_TIME) {
    const remaining = Math.ceil((COOLDOWN_TIME - (now - cooldowns[id])) / 1000)
    return m.reply(`⏳ Espera *${remaining} segundos* antes de volver a cazar.`)
  }

  cooldowns[id] = now
  saveCooldowns()

  const animal = getAnimal()
  const success = Math.random() < 0.85 // 85% de éxito

  if (success) {
    addExp(id, animal.exp)
    addMoney(id, animal.money)
    return m.reply(
      `*¡Bien hecho cazador!*\n\n` +
      `Cazaste un ${animal.nombre}\n` +
      `Ganaste:\n` +
      `✨ *${animal.exp} Exp*\n` +
      `💎 *${animal.money} Diamantes*\n\n` +
      `¡Sigue explorando la naturaleza!`
    )
  } else {
    const perdidaExp = rand(100, 300)
    const perdidaMoney = rand(30, 80)
    removeExp(id, perdidaExp)
    removeMoney(id, perdidaMoney)
    return m.reply(
      `*¡Oh no! El animal era más fuerte que tú...*\n\n` +
      `Te mandaron al hospital 🏥\n` +
      `Perdiste:\n` +
      `- ✨ *${perdidaExp} Exp*\n` +
      `- 💎 *${perdidaMoney} Diamantes*\n\n` +
      `Recupérate pronto y vuelve a intentarlo.`
    )
  }
}

handler.help = ['cazar']
handler.tags = ['aventura']
handler.command = /^cazar$/i

export default handler