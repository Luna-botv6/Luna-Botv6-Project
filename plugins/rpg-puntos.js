import { getUserStats, setUserStats } from '../lib/stats.js'
import fs from 'fs'

const cooldownFile = './database/limitgamecooldown.json'
const COOLDOWN_TIME = 10 * 60 * 1000 

if (!fs.existsSync('./database')) fs.mkdirSync('./database', { recursive: true })
let cooldowns = fs.existsSync(cooldownFile) ? JSON.parse(fs.readFileSync(cooldownFile)) : {}

const handler = async (m, { command, args, usedPrefix }) => {
  const id = m.sender
  const idioma = global.db.data.users[id]?.language || global.defaultLenguaje
  const tradutor = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`)).plugins.rpg_juegolimit
  const now = Date.now()

  if (cooldowns[id] && now - cooldowns[id] < COOLDOWN_TIME) {
    const remaining = ((COOLDOWN_TIME - (now - cooldowns[id])) / 60000).toFixed(1)
    return m.reply(`⏳ ${tradutor.texto1[0]} *${remaining}* ${tradutor.texto1[1]}`)
  }

  const numero = Math.floor(Math.random() * 5) + 1 

  if (!args[0]) {
    return m.reply(`🎯 ${tradutor.texto2}\n${tradutor.texto3}:\n*${usedPrefix + command} 3*`)
  }

  const guess = parseInt(args[0])
  if (isNaN(guess) || guess < 1 || guess > 5) {
    return m.reply(`❌ ${tradutor.texto4}`)
  }

  cooldowns[id] = now
  fs.writeFileSync(cooldownFile, JSON.stringify(cooldowns, null, 2))

  if (guess === numero) {
    const recompensa = Math.floor(Math.random() * 5) + 1
    const user = getUserStats(id)
    user.limit = (user.limit || 0) + recompensa
    setUserStats(id, user)
    
    return m.reply(`🎉 ${tradutor.texto5} *${numero}*.\n${tradutor.texto6} *${recompensa}* ${tradutor.texto7} 🔋`)
  } else {
    return m.reply(`❌ ${tradutor.texto8} *${numero}*.\n${tradutor.texto9}`)
  }
}

handler.help = ['juegolimit']
handler.tags = ['juegos']
handler.command = /^juegolimit$/i

export default handler