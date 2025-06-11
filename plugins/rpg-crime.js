import fs from 'fs'
import { getUserStats, addExp, removeExp, addMoney, removeMoney, setUserStats } from '../lib/stats.js'

const handler = async (m, { conn, usedPrefix, command, groupMetadata, participants, isPrems }) => {
  const idioma = global.db.data.users[m.sender]?.language || global.defaultLenguaje
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`))
  const tradutor = _translate.plugins.rpg_crime

  const now = Date.now()
  const lastCrime = getUserStats(m.sender).lastCrime || 0
  const cooldown = 3600000 // 1 hora
  if (now - lastCrime < cooldown) {
    const timeLeft = cooldown - (now - lastCrime)
    return m.reply(`${tradutor.texto1} ${msToTime(timeLeft)}`)
  }

  const user = getUserStats(m.sender)

  // Probabilidades
  const probArrested = 0.2   // 20% arresto
  const probRobSuccess = 0.8 // 80% robo exitoso (complemento)

  // Resultado aleatorio
  const rand = Math.random()

  // Mensajes random para robar y arresto
  const msgRobSuccess = tradutor.texto4 || ['Has robado con éxito']
  const msgRobFail = tradutor.texto5 || ['Te arrestaron!']

  if (rand < probArrested) {
    // Arrestado - pierde EXP y diamantes (money)
    const expLost = Math.floor(user.exp * (0.1 + Math.random() * 0.2)) // 10% a 30%
    const moneyLost = Math.floor(user.money * (0.1 + Math.random() * 0.2)) // 10% a 30%

    removeExp(m.sender, expLost)
    removeMoney(m.sender, moneyLost)

    // Guardar el tiempo del último intento
    setUserStats(m.sender, { lastCrime: now })

    return m.reply(`${pickRandom(msgRobFail)}\nPagaste una multa de:\n⭐ *${expLost}* EXP\n💎 *${moneyLost}* diamantes`)
  }

  // Robo exitoso - gana EXP y diamantes
  // EXP: entre 250 y 10,000, pero más probable en rangos bajos
  // Diamantes: entre 200 y 500
  const expGain = Math.floor(250 + Math.random() ** 2 * (10000 - 250)) // Distribución sesgada hacia valores bajos
  const moneyGain = Math.floor(200 + Math.random() * (500 - 200))

  addExp(m.sender, expGain)
  addMoney(m.sender, moneyGain)

  // Guardar el tiempo del último intento
  setUserStats(m.sender, { lastCrime: now })

  return m.reply(`《💰》${pickRandom(msgRobSuccess)}\nGanaste:\n⭐ *${expGain}* EXP\n💎 *${moneyGain}* diamantes`)
}

handler.help = ['robar', 'crime']
handler.tags = ['xp']
handler.command = /^(crime|robo)$/i
handler.group = true

export default handler

function msToTime(duration) {
  var seconds = Math.floor((duration / 1000) % 60),
      minutes = Math.floor((duration / (1000 * 60)) % 60),
      hours = Math.floor((duration / (1000 * 60 * 60)) % 24)
  hours = (hours < 10) ? "0" + hours : hours
  minutes = (minutes < 10) ? "0" + minutes : minutes
  seconds = (seconds < 10) ? "0" + seconds : seconds
  return hours + " Hora(s) " + minutes + " Minuto(s) " + seconds + " Segundo(s)"
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)]
}
