import fs from 'fs'
import path from 'path'
import { addExp, addLunaCoins, getUserStats } from '../lib/stats.js'

const COOLDOWN_FILE = './database/minarlunacoins.json'
let cooldowns = {}

// Asegurar que el archivo existe y cargar datos
function loadCooldowns() {
  if (!fs.existsSync('./database')) fs.mkdirSync('./database')
  if (!fs.existsSync(COOLDOWN_FILE)) fs.writeFileSync(COOLDOWN_FILE, '{}')
  try {
    cooldowns = JSON.parse(fs.readFileSync(COOLDOWN_FILE))
  } catch {
    cooldowns = {}
  }
}

function saveCooldowns() {
  fs.writeFileSync(COOLDOWN_FILE, JSON.stringify(cooldowns, null, 2))
}

loadCooldowns()

const handler = async (m, { conn }) => {
  const id = m.sender
  const user = getUserStats(id)

  const cooldownTime = 10 * 60 * 1000 // 10 minutos
  const now = Date.now()

  const lastMine = cooldowns[id] || 0
  const timePassed = now - lastMine

  if (timePassed < cooldownTime) {
    const timeLeft = Math.floor((cooldownTime - timePassed) / 1000)
    return m.reply(`⛏️ Ya has minado recientemente.\n⏳ Espera *${timeLeft} segundos* antes de volver a minar.`)
  }

  // Posibilidad de fallo
  if (Math.random() < 0.1) {
    cooldowns[id] = now
    saveCooldowns()
    return m.reply('💥 Tu pico se rompió y no lograste obtener ninguna LunaCoin...')
  }

  const lunaCoinsGanadas = Math.floor(Math.random() * 11) + 5 // 5-15
  const expGanada = Math.floor(Math.random() * 6) + 3 // 3-8

  addLunaCoins(id, lunaCoinsGanadas)
  addExp(id, expGanada)

  cooldowns[id] = now
  saveCooldowns()

  return m.reply(
    `⛏️ *Minería completada exitosamente*\n\n` +
    `🔹 Ganaste: *${lunaCoinsGanadas}* LunaCoins\n` +
    `✨ Experiencia: +${expGanada} EXP\n` +
    `🪙 Total actual de LunaCoins: ${getUserStats(id).lunaCoins}`
  )
}

handler.help = ['minar']
handler.tags = ['juegos']
handler.command = /^minarluna$/i

export default handler