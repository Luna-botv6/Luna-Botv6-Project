import fs from 'fs'
import { getUserStats, addExp, addMoney, setUserStats } from '../lib/stats.js'

const handler = async (m, { conn }) => {
  if (handler.enviando) return
  handler.enviando = true

  const idioma = global.db.data.users[m.sender]?.language || global.defaultLenguaje
  const tradutor = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`)).plugins.rpg_work

  const userId = m.sender
  const now = Date.now()
  const cooldown = 10 * 60 * 1000 

  const userStats = getUserStats(userId)

  if (userStats.lastwork && now - userStats.lastwork < cooldown) {
    const timeLeft = msToTime(cooldown - (now - userStats.lastwork), tradutor)
    handler.enviando = false
    return conn.sendMessage(m.chat, { text: `⏳ *${tradutor.texto1}*\n\n🏃‍♂️ ${tradutor.texto2}: *${timeLeft}*` }, { quoted: m })
  }

  const expGanada = Math.floor(Math.random() * 5000) + 500
  const moneyGanado = Math.floor(Math.random() * 1000) + 100

  addExp(userId, expGanada)
  addMoney(userId, moneyGanado)

  setUserStats(userId, { lastwork: now })

  const statsActualizados = getUserStats(userId)

  const mensajesTrabajo = tradutor.mensajes

  const msg = `
⚔️ *${tradutor.texto3}*

🌟 ${tradutor.texto4} *${expGanada}* ${tradutor.texto5}.
💰 ${tradutor.texto4} *${moneyGanado}* ${tradutor.texto6}.

🎖️ ${tradutor.texto7}: *${statsActualizados.level}*
🏅 Rol: *${statsActualizados.role}*

${pickRandom(mensajesTrabajo)}
`.trim()

  await conn.sendMessage(m.chat, { text: msg }, { quoted: m })

  handler.enviando = false
}

handler.help = ['work']
handler.tags = ['xp']
handler.command = /^(work|trabajar|chambear)$/i

export default handler

function msToTime(duration, tradutor) {
  let seconds = Math.floor((duration / 1000) % 60)
  let minutes = Math.floor((duration / (1000 * 60)) % 60)
  minutes = (minutes < 10) ? '0' + minutes : minutes
  seconds = (seconds < 10) ? '0' + seconds : seconds
  return `${minutes} ${tradutor.tiempo[0]} ${seconds} ${tradutor.tiempo[1]}`
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)]
}

