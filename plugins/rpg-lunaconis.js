import fs from 'fs'
import { addExp, addLunaCoins, getUserStats } from '../lib/stats.js'

const COOLDOWN_FILE = './database/minarlunacoins.json'
let cooldowns = {}

if (!fs.existsSync('./database')) fs.mkdirSync('./database', { recursive: true })
if (!fs.existsSync(COOLDOWN_FILE)) fs.writeFileSync(COOLDOWN_FILE, '{}')
try {
  cooldowns = JSON.parse(fs.readFileSync(COOLDOWN_FILE))
} catch {
  cooldowns = {}
}

const handler = async (m, { conn }) => {
  const id = m.sender
  const idioma = global.db.data.users[id]?.language || global.defaultLenguaje
  const tradutor = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`)).plugins.rpg_minar

  const cooldownTime = 10 * 60 * 1000 
  const now = Date.now()
  const lastMine = cooldowns[id] || 0
  const timePassed = now - lastMine

  if (timePassed < cooldownTime) {
    const timeLeft = Math.floor((cooldownTime - timePassed) / 1000)
    return m.reply(`⛏️ ${tradutor.texto1[0]}\n⏳ ${tradutor.texto1[1]} *${timeLeft}* ${tradutor.texto1[2]}`)
  }

  if (Math.random() < 0.1) {
    cooldowns[id] = now
    fs.writeFileSync(COOLDOWN_FILE, JSON.stringify(cooldowns, null, 2))
    return m.reply(`💥 ${tradutor.texto2}`)
  }

  const lunaCoinsGanadas = Math.floor(Math.random() * 11) + 5 
  const expGanada = Math.floor(Math.random() * 6) + 3 

  addLunaCoins(id, lunaCoinsGanadas)
  addExp(id, expGanada)

  cooldowns[id] = now
  fs.writeFileSync(COOLDOWN_FILE, JSON.stringify(cooldowns, null, 2))

  return m.reply(
    `⛏️ *${tradutor.texto3}*\n\n` +
    `🔹 ${tradutor.texto4} *${lunaCoinsGanadas}* LunaCoins\n` +
    `✨ ${tradutor.texto5} +${expGanada} EXP\n` +
    `🪙 ${tradutor.texto6} ${getUserStats(id).lunaCoins}`
  )
}

handler.help = ['minarluna']
handler.tags = ['juegos']
handler.command = /^minarluna$/i

export default handler