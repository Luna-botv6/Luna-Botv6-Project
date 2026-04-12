import fs from 'fs'
import path from 'path'
import { getUserStats, addExp, addMoney, removeMoney } from '../lib/stats.js'

const quiniDir = './lib'
const quiniFile = path.join(quiniDir, 'quini6.json')

let quiniData = {
  active: false,
  participants: [],
  startTime: null,
  endTime: null,
  winningNumbers: []
}

let quiniTimeout = null

function loadQuiniData() {
  if (!fs.existsSync(quiniDir)) fs.mkdirSync(quiniDir)
  if (!fs.existsSync(quiniFile)) {
    fs.writeFileSync(quiniFile, JSON.stringify(quiniData, null, 2))
  } else {
    try {
      quiniData = JSON.parse(fs.readFileSync(quiniFile))
    } catch {
      quiniData = {
        active: false,
        participants: [],
        startTime: null,
        endTime: null,
        winningNumbers: []
      }
    }
  }
}

function saveQuiniData() {
  fs.writeFileSync(quiniFile, JSON.stringify(quiniData, null, 2))
}

function resetQuiniData() {
  quiniData = {
    active: false,
    participants: [],
    startTime: null,
    endTime: null,
    winningNumbers: []
  }
  saveQuiniData()
}

function getTimeRemaining() {
  if (!quiniData.active) return '0 minutos'
  const remaining = quiniData.endTime - Date.now()
  if (remaining <= 0) return '¡Terminado!'
  const minutes = Math.floor(remaining / (1000 * 60))
  const seconds = Math.floor((remaining % (1000 * 60)) / 1000)
  return `${minutes}m ${seconds}s`
}

function numberWithCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function endQuini(conn, chatId) {
  if (!quiniData.active) return

  // Generar 6 números ganadores
  const numbers = Array.from({ length: 46 }, (_, i) => i)
  const shuffled = numbers.sort(() => Math.random() - 0.5)
  quiniData.winningNumbers = shuffled.slice(0, 6).sort((a, b) => a - b)

  let results = '🎉 *¡RESULTADOS DEL QUINI6!* 🎉\n\n'
  results += `🎯 *Números ganadores:* ${quiniData.winningNumbers.map(n => n.toString().padStart(2, '0')).join(' ')}\n\n`
  results += `🏆 *Premios obtenidos:*\n\n`

  let anyWinner = false

  quiniData.participants.forEach(p => {
    const aciertos = p.numbers.filter(num => quiniData.winningNumbers.includes(num)).length
    if (aciertos > 0) {
      anyWinner = true
      const premio = aciertos * 5000
      const exp = aciertos * 3000
      addMoney(p.id, premio)
      addExp(p.id, exp)
      results += `👤 @${p.username}\n`
      results += `🎯 Aciertos: ${aciertos}\n`
      results += `💎 Ganó: ${numberWithCommas(premio)} diamantes\n`
      results += `📈 EXP: ${numberWithCommas(exp)}\n\n`
    }
  })

  if (!anyWinner) {
    results += 'Ningún participante acertó ningún número esta vez. ¡Mejor suerte la próxima!\n\n'
  }

  results += '🎊 ¡Gracias por participar! ¡Buena suerte para el próximo sorteo! 🍀'

  conn.sendMessage(chatId, { text: results, mentions: quiniData.participants.map(p => p.id + '@s.whatsapp.net') })

  setTimeout(() => {
    resetQuiniData()
    console.log('🧹 Datos de Quini6 limpiados después del sorteo')
  }, 1000)
}

loadQuiniData()

const handler = async (m, { conn, command, usedPrefix, args }) => {
  const userId = m.sender
  const username = m.pushName || 'Usuario'

  switch (command) {
    case 'quini6':
      if (quiniData.active) {
        if (args.length === 0) {
          return m.reply('🎰 *Quini6 en curso!* \n\n' +
            `⏰ Tiempo restante: ${getTimeRemaining()}\n` +
            `👥 Participantes: ${quiniData.participants.length}\n` +
            'Para participar, envía:\n' +
            `*${usedPrefix}quini6 12 34 05 22 44 07*`)
        }

        if (quiniData.participants.some(p => p.id === userId)) {
          return m.reply('⚠️ Ya has participado en este Quini6!')
        }

        if (args.length !== 6) {
          return m.reply('❌ Debes elegir exactamente 6 números (ejemplo: /quini6 12 34 05 22 44 07)')
        }

        const numbers = args.map(a => parseInt(a))
        if (numbers.some(n => isNaN(n) || n < 0 || n > 45)) {
          return m.reply('❌ Los números deben estar entre 00 y 45')
        }

        // Cobrar 200 diamantes como en la lotería
        const userStats = getUserStats(userId)
        const precio = 200
        if (userStats.money < precio) {
          return m.reply(`❌ No tienes suficientes diamantes! Necesitas ${precio} 💎 pero solo tienes ${userStats.money} 💎`)
        }

        removeMoney(userId, precio)
        quiniData.participants.push({
          id: userId,
          username: username,
          numbers,
          joinTime: Date.now()
        })
        saveQuiniData()

        return m.reply(`✅ ¡Números registrados!\nTus números: ${numbers.map(n => n.toString().padStart(2, '0')).join(' ')}\n¡Buena suerte! 🍀`)

      } else {
        if (quiniTimeout) clearTimeout(quiniTimeout)

        resetQuiniData()
        quiniData.active = true
        quiniData.startTime = Date.now()
        quiniData.endTime = Date.now() + (30 * 60 * 1000) // 30 minutos
        saveQuiniData()

        quiniTimeout = setTimeout(() => {
          endQuini(conn, m.chat)
          quiniTimeout = null
        }, 30 * 60 * 1000)

        return m.reply('🎰 *¡NUEVO SORTEO QUINI6 INICIADO!* 🎰\n\n' +
          '💎 *Precio de entrada:* 200 diamantes\n' +
          '⏰ *Duración:* 30 minutos\n' +
          '🎯 *Elige 6 números entre 00 y 45 (ejemplo: /quini6 12 34 05 22 44 07)*\n\n' +
          '¡Buena suerte a todos! 🍀')
      }

    case 'qinfo':
      if (!quiniData.active) {
        return m.reply('❌ No hay ningún Quini6 activo.')
      }

      let plist = quiniData.participants
        .map(p => `🎫 @${p.username} - ${p.numbers.map(n => n.toString().padStart(2, '0')).join(' ')}`)
        .join('\n')

      if (plist.length > 1000) {
        plist = `${quiniData.participants.length} participantes registrados`
      }

      return m.reply(`🎰 *INFORMACIÓN DEL QUINI6* 🎰\n\n` +
        `👥 *Participantes:* ${quiniData.participants.length}\n` +
        `⏰ *Tiempo restante:* ${getTimeRemaining()}\n\n` +
        `*Participantes:*\n${plist}\n\n` +
        `• *${usedPrefix}quini6 12 34 05 22 44 07* para participar`)
  }
}

handler.help = ['quini6', 'qinfo']
handler.tags = ['game']
handler.command = /^(quini6|qinfo)$/i

export default handler

