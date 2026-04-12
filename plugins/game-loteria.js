import fs from 'fs'
import path from 'path'
import { getUserStats, addExp, addMoney, removeMoney } from '../lib/stats.js'

const lotteryDir = './database'
const lotteryFile = path.join(lotteryDir, 'lottery.json')

let lotteryData = {
  active: false,
  participants: [],
  startTime: null,
  endTime: null,
  ticketPrice: 200,
  prizePool: 0,
  winners: []
}

// Variable para guardar el timeout de la lotería activa
let lotteryTimeout = null

// Cargar datos de lotería
function loadLotteryData() {
  if (!fs.existsSync(lotteryDir)) fs.mkdirSync(lotteryDir)
  if (!fs.existsSync(lotteryFile)) {
    fs.writeFileSync(lotteryFile, JSON.stringify(lotteryData, null, 2))
  } else {
    try {
      lotteryData = JSON.parse(fs.readFileSync(lotteryFile))
    } catch {
      lotteryData = {
        active: false,
        participants: [],
        startTime: null,
        endTime: null,
        ticketPrice: 200,
        prizePool: 0,
        winners: []
      }
    }
  }
}

// Guardar datos de lotería
function saveLotteryData() {
  fs.writeFileSync(lotteryFile, JSON.stringify(lotteryData, null, 2))
}

// Función para resetear/limpiar todos los datos de lotería
function resetLotteryData() {
  lotteryData = {
    active: false,
    participants: [],
    startTime: null,
    endTime: null,
    ticketPrice: 200,
    prizePool: 0,
    winners: []
  }
  saveLotteryData()
}

// Obtener tiempo restante
function getTimeRemaining() {
  if (!lotteryData.active) return '0 minutos'
  
  const remaining = lotteryData.endTime - Date.now()
  if (remaining <= 0) return '¡Terminado!'
  
  const minutes = Math.floor(remaining / (1000 * 60))
  const seconds = Math.floor((remaining % (1000 * 60)) / 1000)
  
  return `${minutes}m ${seconds}s`
}

// Finalizar lotería
function endLottery(conn, chatId) {
  if (!lotteryData.active) return

  if (lotteryData.participants.length < 5) {
    // Reembolsar a todos
    lotteryData.participants.forEach(participant => {
      addMoney(participant.id, lotteryData.ticketPrice)
    })
    
    conn.sendMessage(chatId, { 
      text: '❌ *Lotería cancelada* \n\n' +
            '🔄 No se alcanzó el mínimo de 5 participantes\n' +
            '💎 Se han reembolsado los diamantes a todos los participantes'
    })
    
    // Limpiar completamente los datos después de cancelar
    resetLotteryData()
    return
  }

  // Seleccionar ganadores aleatoriamente
  const shuffled = [...lotteryData.participants].sort(() => Math.random() - 0.5)
  const winners = shuffled.slice(0, 3)
  
  // Otorgar premios fijos
  if (winners[0]) {
    addMoney(winners[0].id, 20000)
    addExp(winners[0].id, 60000)
  }
  
  if (winners[1]) {
    addMoney(winners[1].id, 10000)
    addExp(winners[1].id, 30000)
  }
  
  if (winners[2]) {
    addMoney(winners[2].id, 5000)
    addExp(winners[2].id, 15000)
  }

  // Dar EXP de consolación a otros participantes
  lotteryData.participants.forEach(participant => {
    if (!winners.some(w => w.id === participant.id)) {
      addExp(participant.id, 1000)
      addMoney(participant.id, 100)
    }
  })

  // Anunciar resultados
  let resultMessage = '🎰 *¡RESULTADOS DE LA LOTERÍA!* 🎰\n\n' +
    `💎 *Premio total:* ${lotteryData.prizePool} diamantes\n` +
    `👥 *Participantes:* ${lotteryData.participants.length}\n\n` +
    '🏆 *GANADORES:* 🏆\n\n'

  if (winners[0]) {
    resultMessage += `🥇 *1er Lugar:* @${winners[0].username}\n` +
      '   💎 20,000 diamantes + 60,000 EXP\n\n'
  }
  
  if (winners[1]) {
    resultMessage += `🥈 *2do Lugar:* @${winners[1].username}\n` +
      '   💎 10,000 diamantes + 30,000 EXP\n\n'
  }
  
  if (winners[2]) {
    resultMessage += `🥉 *3er Lugar:* @${winners[2].username}\n` +
      '   💎 5,000 diamantes + 15,000 EXP\n\n'
  }

  resultMessage += '✨ *Todos los demás participantes recibieron 100 💎 + 1,000 EXP de consolación*\n\n' +
    '¡Gracias por participar! 🎉'

  const mentions = winners.map(w => w.id + '@s.whatsapp.net')
  
  // Enviar resultados
  conn.sendMessage(chatId, { text: resultMessage, mentions })
  
  // LIMPIAR COMPLETAMENTE LOS DATOS DESPUÉS DE MOSTRAR RESULTADOS
  // Usar setTimeout para asegurar que el mensaje se envíe antes de limpiar
  setTimeout(() => {
    resetLotteryData()
    console.log('🧹 Datos de lotería limpiados después de mostrar resultados')
  }, 1000) // Esperar 1 segundo antes de limpiar
}

// Inicializar
loadLotteryData()

// Handler principal para múltiples comandos
const handler = async (m, { conn, command, usedPrefix }) => {
  const userId = m.sender // Usar el sender completo en lugar de split
  const username = m.pushName || 'Usuario'
  
  switch(command) {
    case 'loteria':
    case 'startlottery':
      if (lotteryData.active) {
        return m.reply('🎰 *Ya hay una lotería activa!* \n\n' +
          `⏰ Tiempo restante: ${getTimeRemaining()}\n` +
          `👥 Participantes: ${lotteryData.participants.length}\n` +
          `💎 Premio acumulado: ${lotteryData.prizePool} diamantes\n\n` +
          'Usa *' + usedPrefix + 'linfo* para más detalles')
      }

      // Cancelar timeout si existía una lotería previa
      if (lotteryTimeout) clearTimeout(lotteryTimeout)

      // Limpiar datos antes de iniciar nueva lotería (por seguridad)
      resetLotteryData()
      
      lotteryData = {
        active: true,
        participants: [],
        startTime: Date.now(),
        endTime: Date.now() + (30 * 60 * 1000), // 30 minutos
        ticketPrice: 200,
        prizePool: 0,
        winners: []
      }
      
      saveLotteryData()
      
      // Programar el final de la lotería y guardar el timeout
      lotteryTimeout = setTimeout(() => {
        endLottery(conn, m.chat)
        lotteryTimeout = null // limpiar referencia
      }, 30 * 60 * 1000)

      return m.reply('🎰 *¡NUEVA LOTERÍA INICIADA!* 🎰\n\n' +
        '💎 *Precio del ticket:* 200 diamantes\n' +
        '⏰ *Duración:* 30 minutos\n' +
        '👥 *Mínimo participantes:* 5\n' +
        '🏆 *Premios:*\n' +
        '   🥇 1er lugar: 20,000 💎 + 60,000 EXP\n' +
        '   🥈 2do lugar: 10,000 💎 + 30,000 EXP\n' +
        '   🥉 3er lugar: 5,000 💎 + 15,000 EXP\n\n' +
        'ᴄᴏᴍᴀɴᴅᴏs:\n' +
        `• *${usedPrefix}ticket* - Comprar ticket\n` +
        `• *${usedPrefix}linfo* - Ver información`)

    case 'ticket':
    case 'buyticket':
      if (!lotteryData.active) {
        return m.reply('❌ No hay ninguna lotería activa. Usa *' + usedPrefix + 'loteria* para iniciar una.')
      }

      if (lotteryData.participants.some(p => p.id === userId)) {
        return m.reply('⚠️ Ya tienes un ticket para esta lotería!')
      }

      const userStats = getUserStats(userId)
      
      if (userStats.money < lotteryData.ticketPrice) {
        return m.reply(`❌ No tienes suficientes diamantes! Necesitas ${lotteryData.ticketPrice} 💎 pero solo tienes ${userStats.money} 💎`)
      }

      removeMoney(userId, lotteryData.ticketPrice)
      lotteryData.prizePool += lotteryData.ticketPrice
      lotteryData.participants.push({
        id: userId,
        username: username,
        ticketNumber: lotteryData.participants.length + 1,
        joinTime: Date.now()
      })
      
      saveLotteryData()
      
      return m.reply('🎫 *¡Ticket comprado exitosamente!* \n\n' +
        `🎰 Número de ticket: #${lotteryData.participants.length}\n` +
        `💎 Premio actual: ${lotteryData.prizePool} diamantes\n` +
        `👥 Participantes: ${lotteryData.participants.length}\n` +
        `⏰ Tiempo restante: ${getTimeRemaining()}\n\n` +
        '¡Buena suerte! 🍀')

    case 'linfo':
    case 'lotteryinfo':
      if (!lotteryData.active) {
        return m.reply('❌ No hay ninguna lotería activa.')
      }

      let participantsList = lotteryData.participants
        .map(p => `🎫 #${p.ticketNumber} - @${p.username}`)
        .join('\n')

      if (participantsList.length > 1000) {
        participantsList = `${lotteryData.participants.length} participantes registrados`
      }

      return m.reply(`🎰 *INFORMACIÓN DE LOTERÍA* 🎰\n\n` +
        `💎 *Premio acumulado:* ${lotteryData.prizePool} diamantes\n` +
        `👥 *Participantes:* ${lotteryData.participants.length}\n` +
        `⏰ *Tiempo restante:* ${getTimeRemaining()}\n` +
        `💎 *Precio del ticket:* ${lotteryData.ticketPrice} diamantes\n\n` +
        `*Participantes:*\n${participantsList}\n\n` +
        'ᴄᴏᴍᴀɴᴅᴏs:\n' +
        `• *${usedPrefix}ticket* - Comprar ticket\n` +
        `• *${usedPrefix}loteria* - Iniciar nueva lotería`)

    case 'reinicarloteria':  // nuevo comando para reiniciar lotería manualmente
    case 'cleanlottery':
      if (lotteryTimeout) clearTimeout(lotteryTimeout)
      lotteryTimeout = null
      resetLotteryData()
      return m.reply('🧹 *Lotería reiniciada manualmente.* Ahora puedes iniciar una nueva lotería.')
  }
}

handler.help = ['loteria', 'ticket', 'linfo', 'cleanlottery', 'reinicarloteria']
handler.tags = ['game']
handler.command = /^(loteria|startlottery|ticket|buyticket|linfo|lotteryinfo|cleanlottery|reinicarloteria)$/i

export default handler
