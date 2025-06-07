import fs from 'fs'
import path from 'path'
import { addExp, removeExp, getExp } from '../lib/stats.js'
import { tieneProteccion } from '../lib/usarprote.js'  // Importamos la función

const COOLDOWN_FILE = './database/robCooldown.json'
const MAX_ROB = 3000
const COOLDOWN = 7200000 // 2 horas

function ensureCooldownFile() {
  if (!fs.existsSync('./database')) fs.mkdirSync('./database')
  if (!fs.existsSync(COOLDOWN_FILE)) fs.writeFileSync(COOLDOWN_FILE, '{}')
}

function loadCooldowns() {
  ensureCooldownFile()
  try {
    return JSON.parse(fs.readFileSync(COOLDOWN_FILE))
  } catch {
    return {}
  }
}

function saveCooldowns(data) {
  fs.writeFileSync(COOLDOWN_FILE, JSON.stringify(data, null, 2))
}

function msToTime(duration) {
  const seconds = Math.floor((duration / 1000) % 60)
  const minutes = Math.floor((duration / (1000 * 60)) % 60)
  const hours = Math.floor((duration / (1000 * 60 * 60)) % 24)
  return `${hours} hora(s) ${minutes} minuto(s) y ${seconds} segundo(s)`
}

const handler = async (m, { conn }) => {
  const sender = m.sender
  let target

  if (m.isGroup) {
    target = m.mentionedJid?.[0] || m.quoted?.sender
  } else {
    target = m.chat
  }

  if (!target) {
    return m.reply('❌ Debes mencionar a alguien para robarle.')
  }

  if (target === sender) {
    return m.reply('🤨 ¿Robarte a ti mismo? Eso no tiene sentido.')
  }

  // Revisión de protección activa (arreglado)
  const proteccion = tieneProteccion(target)
  if (proteccion.activa) {
    return m.reply(
      `❌ El usuario @${target.split`@`[0]} tiene protección activada y no puedes robarle XP ni diamantes.`,
      null,
      { mentions: [target] }
    )
  }

  // Manejar cooldown
  const cooldowns = loadCooldowns()
  const lastRob = cooldowns[sender] || 0
  const now = Date.now()

  if (now < lastRob + COOLDOWN) {
    const timeLeft = msToTime(lastRob + COOLDOWN - now)
    return m.reply(`⏳ Ya robaste recientemente. Espera ${timeLeft} para volver a intentarlo.`)
  }

  const victimExp = getExp(target)
  const robAmount = Math.min(Math.floor(Math.random() * MAX_ROB), victimExp)

  if (robAmount <= 0) {
    return m.reply(`😢 @${target.split`@`[0]} no tiene experiencia para robarle.`, null, { mentions: [target] })
  }

  // Realizar el robo
  addExp(sender, robAmount)
  removeExp(target, robAmount)
  cooldowns[sender] = now
  saveCooldowns(cooldowns)

  const msg = victimExp < MAX_ROB
    ? `💸 Le robaste *${robAmount} exp* a un pobre 😢 @${target.split`@`[0]}`
    : `💰 Le robaste *${robAmount} exp* a @${target.split`@`[0]}`

  m.reply(msg, null, { mentions: [target] })

  // Verificar y mostrar mensaje AFK después del robo (evitar duplicados)
  if (m.afkUsers && m.afkUsers.length > 0) {
    const idioma = global.db.data.users[m.sender].language || global.defaultLenguaje
    const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`))
    const tradutor = _translate.plugins.afk__afk
    
    const processedAfkUsers = new Set()
    
    for (const afkUser of m.afkUsers) {
      if (!processedAfkUsers.has(afkUser.jid)) {
        processedAfkUsers.add(afkUser.jid)
        const reason = afkUser.reason || ''
        setTimeout(() => {
          m.reply(`${tradutor.texto1[0]}

*—◉ ${tradutor.texto1[1]}*      
*—◉ ${reason ? `${tradutor.texto1[2]}` + reason : `${tradutor.texto1[3]}`}*
*—◉ ${tradutor.texto1[4]} ${(new Date - afkUser.lastseen).toTimeString()}*`)
        }, 1000)
      }
    }
  }
}

handler.help = ['rob']
handler.tags = ['econ']
handler.command = ['rob', 'robar']

export default handler