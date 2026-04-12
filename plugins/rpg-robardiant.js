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
  const idioma = global.db.data.users[m.sender]?.language || global.defaultLenguaje
  const _translate = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`))
  const tradutor = _translate.plugins.rpg_robardiamantes

  const userId = m.sender
  const cooldowns = getCooldowns()
  const lastTime = cooldowns[userId] || 0
  const now = Date.now()

  if (now < lastTime + cooldownTime) {
    const timeLeft = msToTime(lastTime + cooldownTime - now)
    return m.reply(`⏳ ${tradutor.texto1} ${timeLeft} ${tradutor.texto2}`)
  }

  let who
  if (m.isGroup) who = m.mentionedJid?.[0] || m.quoted?.sender || false
  else who = m.chat

  if (!who) return m.reply(`💎 ${tradutor.texto3}`)

  // Verificar protección activa (arreglado)
  const proteccion = tieneProteccion(who)
  if (proteccion.activa) {
    return m.reply(`🛡️ @${who.split`@`[0]} ${tradutor.texto4}`, null, { mentions: [who] })
  }

  const targetDiamonds = getMoney(who)
  const toRob = Math.floor(Math.random() * maxRob)

  if (targetDiamonds < toRob) {
    if (targetDiamonds === 0) return m.reply(`❌ ${tradutor.texto5}`)
    await addMoney(userId, targetDiamonds)
    await removeMoney(who, targetDiamonds)
    cooldowns[userId] = now
    setCooldowns(cooldowns)
    
    m.reply(`💸 ${tradutor.texto6} ${targetDiamonds} ${tradutor.texto7}`)
    
    // Verificar y mostrar mensaje AFK después del robo (evitar duplicados)
    if (m.afkUsers && m.afkUsers.length > 0) {
      const tradutorAFK = _translate.plugins.afk__afk
      const processedAfkUsers = new Set()
      
      for (const afkUser of m.afkUsers) {
        if (!processedAfkUsers.has(afkUser.jid)) {
          processedAfkUsers.add(afkUser.jid)
          const reason = afkUser.reason || ''
          setTimeout(() => {
            m.reply(`${tradutorAFK.texto1[0]}

*—◉ ${tradutorAFK.texto1[1]}* *—◉ ${reason ? `${tradutorAFK.texto1[2]}` + reason : `${tradutorAFK.texto1[3]}`}*
*—◉ ${tradutorAFK.texto1[4]} ${(new Date - afkUser.lastseen).toTimeString()}*`)
          }, 1000)
        }
      }
    }
    return
  }

  await addMoney(userId, toRob)
  await removeMoney(who, toRob)
  cooldowns[userId] = now
  setCooldowns(cooldowns)

  m.reply(`💰 ${tradutor.texto8} ${toRob} ${tradutor.texto9} @${who.split`@`[0]}`, null, { mentions: [who] })

  // Verificar y mostrar mensaje AFK después del robo (evitar duplicados)
  if (m.afkUsers && m.afkUsers.length > 0) {
    const tradutorAFK = _translate.plugins.afk__afk
    const processedAfkUsers = new Set()
    
    for (const afkUser of m.afkUsers) {
      if (!processedAfkUsers.has(afkUser.jid)) {
        processedAfkUsers.add(afkUser.jid)
        const reason = afkUser.reason || ''
        setTimeout(() => {
          m.reply(`${tradutorAFK.texto1[0]}

*—◉ ${tradutorAFK.texto1[1]}* *—◉ ${reason ? `${tradutorAFK.texto1[2]}` + reason : `${tradutorAFK.texto1[3]}`}*
*—◉ ${tradutorAFK.texto1[4]} ${(new Date - afkUser.lastseen).toTimeString()}*`)
        }, 1000)
      }
    }
  }
}

handler.help = ['robardiamantes']
handler.tags = ['econ']
handler.command = ['robardiamantes', 'robard']

export default handler