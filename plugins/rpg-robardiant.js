import fs from 'fs'
import path from 'path'
import { addMoney, removeMoney, getMoney } from '../lib/stats.js'
import { tieneProteccion } from '../lib/usarprote.js'  // <-- importamos

const cooldownPath = './database/robCooldownMoney.json'
const cooldownTime = 2 * 60 * 60 * 1000 // 2 horas
const maxRob = 3000

function ensureCooldownDB() {
  if (!fs.existsSync('./database')) fs.mkdirSync('./database')
  if (!fs.existsSync(cooldownPath)) fs.writeFileSync(cooldownPath, '{}')
}

function getCooldowns() {
  ensureCooldownDB()
  return JSON.parse(fs.readFileSync(cooldownPath))
}

function setCooldowns(data) {
  fs.writeFileSync(cooldownPath, JSON.stringify(data, null, 2))
}

function msToTime(duration) {
  const seconds = Math.floor((duration / 1000) % 60)
  const minutes = Math.floor((duration / (1000 * 60)) % 60)
  const hours = Math.floor((duration / (1000 * 60 * 60)) % 24)
  return `${hours} Hora(s) ${minutes} Minuto(s)`
}

const handler = async (m, { conn, command }) => {
  const userId = m.sender
  const cooldowns = getCooldowns()
  const lastTime = cooldowns[userId] || 0
  const now = Date.now()

  if (now < lastTime + cooldownTime) {
    const timeLeft = msToTime(lastTime + cooldownTime - now)
    return m.reply(`⏳ Debes esperar ${timeLeft} para volver a robar diamantes.`)
  }

  let who
  if (m.isGroup) who = m.mentionedJid?.[0] || m.quoted?.sender || false
  else who = m.chat

  if (!who) return m.reply('❌ Etiqueta a alguien para robarle diamantes.')

  // Verificar protección activa
  if (tieneProteccion(who)) {
    return m.reply(`🚫 @${who.split`@`[0]} está protegido y no puedes robarle diamantes.`, null, { mentions: [who] })
  }

  const targetDiamonds = getMoney(who)
  const toRob = Math.floor(Math.random() * maxRob)

  if (targetDiamonds < toRob) {
    if (targetDiamonds === 0) return m.reply(`😥 No se puede robar, el usuario no tiene diamantes.`)
    await addMoney(userId, targetDiamonds)
    await removeMoney(who, targetDiamonds)
    cooldowns[userId] = now
    setCooldowns(cooldowns)
    return m.reply(`💎 Robaste ${targetDiamonds} diamantes de un pobre 😢`)
  }

  await addMoney(userId, toRob)
  await removeMoney(who, toRob)
  cooldowns[userId] = now
  setCooldowns(cooldowns)

  return m.reply(`💎 Robaste ${toRob} diamantes a @${who.split`@`[0]} 💰`, null, { mentions: [who] })
}

handler.help = ['robardiamantes']
handler.tags = ['econ']
handler.command = ['robardiamantes', 'robard']

export default handler
