
import { addExp, setUserStats, getUserStats } from '../lib/stats.js'

const carreras = {}

const handler = async (m, { conn, args, usedPrefix, command }) => {
  const roomId = m.chat

  if (command === 'carreraautos') {
    if (carreras[roomId]) return m.reply('¡Ya hay una carrera activa en este grupo!')

    carreras[roomId] = {
      player1: m.sender,
      player2: null,
      auto1: null,
      auto2: null,
      estado: 'esperando',
    }

    await conn.sendMessage(m.chat, {
      text: `🚗 *¡Carrera iniciada!*\n\n@${m.sender.split('@')[0]} está esperando a un rival con *${usedPrefix}unirsecarrera*`,
      mentions: [m.sender],
    })

    setTimeout(() => {
      if (carreras[roomId]?.estado === 'esperando') {
        delete carreras[roomId]
        conn.sendMessage(roomId, { text: '⏳ La carrera fue cancelada por inactividad.' })
      }
    }, 120000)
  }

  if (command === 'unirsecarrera') {
    const carrera = carreras[roomId]
    if (!carrera) return m.reply('No hay una carrera activa.')
    if (carrera.estado !== 'esperando') return m.reply('La carrera ya comenzó.')
    if (carrera.player1 === m.sender) return m.reply('Ya estás en la carrera.')
    if (carrera.player2) return m.reply('Ya hay dos jugadores.')

    carrera.player2 = m.sender
    carrera.estado = 'seleccion'

    await conn.sendMessage(m.chat, {
      text: `🎉 *¡Carrera lista!*\n\n@${carrera.player1.split('@')[0]} vs @${carrera.player2.split('@')[0]}\n\n@${carrera.player1.split('@')[0]}, elige tu auto: rojo, azul o verde\nUsa: *${usedPrefix}elegirauto rojo*`,
      mentions: [carrera.player1, carrera.player2]
    })
  }

  if (command === 'elegirauto') {
    const color = (args[0] || '').toLowerCase()
    const validos = ['rojo', 'azul', 'verde']
    const carrera = carreras[roomId]

    if (!carrera) return m.reply('No hay carrera activa.')
    if (carrera.estado !== 'seleccion') return m.reply('No es momento de elegir autos.')
    if (!validos.includes(color)) return m.reply('Color inválido. Usa: rojo, azul o verde.')

    if (m.sender === carrera.player1 && !carrera.auto1) {
      carrera.auto1 = color
      return conn.sendMessage(m.chat, {
        text: `✅ @${m.sender.split('@')[0]} eligió *${color}*.
@${carrera.player2.split('@')[0]}, elige el tuyo con *${usedPrefix}elegirauto <color>*`,
        mentions: [m.sender, carrera.player2]
      })
    }

    if (m.sender === carrera.player2 && !carrera.auto2) {
      if (color === carrera.auto1) return m.reply('Ese color ya fue elegido.')
      carrera.auto2 = color
      carrera.estado = 'corriendo'
      conn.sendMessage(m.chat, { text: '🏁 ¡Comienza la carrera!' })
      return iniciarCarrera(conn, m.chat, carrera)
    }

    m.reply('Ya elegiste o no estás en la carrera.')
  }
}

handler.command = /^(carreraautos|unirsecarrera|elegirauto)$/i
handler.help = ['carreraautos', 'unirsecarrera', 'elegirauto <color>']
handler.tags = ['juegos']
handler.group = true

export default handler

async function iniciarCarrera(conn, chatId, carrera) {
  const pista = 20
  let pos1 = 0
  let pos2 = 0
  const autoEmoji = { rojo: '🚗', azul: '🚙', verde: '🏎️' }

  const getPista = () => {
    const bar = (pos, emoji) =>
      '🏁' + '░'.repeat(Math.max(0, pista - pos - 1)) + emoji
    return `🎌 *CARRERA* 🎌\n\n@${carrera.player1.split('@')[0]} (${carrera.auto1}):\n${bar(pos1, autoEmoji[carrera.auto1])}\n\n@${carrera.player2.split('@')[0]} (${carrera.auto2}):\n${bar(pos2, autoEmoji[carrera.auto2])}`
  }

  const sleep = ms => new Promise(res => setTimeout(res, ms))
  let mensaje = await conn.sendMessage(chatId, {
    text: getPista(),
    mentions: [carrera.player1, carrera.player2]
  })

  while (pos1 < pista && pos2 < pista) {
    await sleep(2000)
    pos1 += Math.floor(Math.random() * 3) + 1
    pos2 += Math.floor(Math.random() * 3) + 1
    pos1 = Math.min(pos1, pista)
    pos2 = Math.min(pos2, pista)

    await conn.sendMessage(chatId, {
      edit: mensaje.key,
      text: getPista()
    })
  }

  let ganador = null
  if (pos1 >= pista && pos2 >= pista) {
    ganador = Math.random() < 0.5 ? carrera.player1 : carrera.player2
  } else {
    ganador = pos1 >= pista ? carrera.player1 : carrera.player2
  }

  const recompensaExp = 3000
  const recompensaDiamantes = 200

  addExp(ganador, recompensaExp)
  const user = getUserStats(ganador)
  user.limit += recompensaDiamantes
  setUserStats(ganador, user)

  await conn.sendMessage(chatId, {
    text: `🏁 *¡Carrera finalizada!*\n\nGanador: @${ganador.split('@')[0]}\n+${recompensaExp} EXP\n+${recompensaDiamantes} diamantes`,
    mentions: [ganador]
  })

  delete carreras[chatId]
}
