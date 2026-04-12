import fs from 'fs'
import { getUserStats, addExp, removeExp, addMoney, removeMoney, setUserStats } from '../lib/stats.js'

const handler = async (m, { conn, usedPrefix, command }) => {
  const idioma = global.db.data.users[m.sender]?.language || global.defaultLenguaje
  const tradutor = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`)).plugins.rpg_crime

  const now = Date.now()
  const user = getUserStats(m.sender)
  const lastCrime = user.lastCrime || 0
  const cooldown = 3600000 // 1 hora

  if (now - lastCrime < cooldown) {
    const timeLeft = cooldown - (now - lastCrime)
    return m.reply(`🕒 ${tradutor.texto1} ${msToTime(timeLeft)}`)
  }

  // Probabilidades
  const probArrested = 0.25 // 25% arresto
  const rand = Math.random()

  // Mensajes desde el traductor
  const msgRobSuccess = tradutor.texto4
  const msgRobFail = tradutor.texto5

  if (rand < probArrested) {
    // FALLO: Arrestado - pierde entre 10% y 25%
    const expLost = Math.floor((user.exp || 0) * (0.1 + Math.random() * 0.15))
    const moneyLost = Math.floor((user.money || 0) * (0.1 + Math.random() * 0.15))

    removeExp(m.sender, expLost)
    removeMoney(m.sender, moneyLost)
    setUserStats(m.sender, { lastCrime: now })

    return m.reply(`🚔 ${pickRandom(msgRobFail)}\n\n❌ ${tradutor.texto2}\n⭐ *${expLost}* EXP\n💎 *${moneyLost}* ${tradutor.texto6}`)
  }

  // ÉXITO: Gana EXP y Diamantes
  const expGain = Math.floor(250 + Math.random() ** 2 * 9750)
  const moneyGain = Math.floor(200 + Math.random() * 300)

  addExp(m.sender, expGain)
  addMoney(m.sender, moneyGain)
  setUserStats(m.sender, { lastCrime: now })

  return m.reply(`💰 ${pickRandom(msgRobSuccess)}\n\n✅ ${tradutor.texto3}\n⭐ *${expGain}* EXP\n💎 *${moneyGain}* ${tradutor.texto6}`)
}

handler.help = ['crime']
handler.tags = ['xp']
handler.command = /^(crime|robo)$/i
handler.group = true

export default handler

function msToTime(duration) {
  let seconds = Math.floor((duration / 1000) % 60)
  let minutes = Math.floor((duration / (1000 * 60)) % 60)
  let hours = Math.floor((duration / (1000 * 60 * 60)) % 24)
  return `${hours}h ${minutes}m ${seconds}s`
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)]
}