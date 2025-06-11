import db from '../lib/tictactoe-db.js'
import { getUser, updateUserExp } from '../lib/tictactoe-db.js'

const handler = async (m, { conn, args, usedPrefix, command }) => {
  conn.tictactoe = conn.tictactoe || {}
  const id = m.chat

  const emojis = { X: '❌', O: '⭕', '': '⬜' }
  const letras = ['A', 'B', 'C']

  const renderBoard = (board) =>
    letras.map((l, i) =>
      `${l} ${board[i].map(v => emojis[v]).join(' ')}`
    ).join('\n') + '\n  1 2 3'

  const emptyBoard = () => [
    ['', '', ''],
    ['', '', ''],
    ['', '', '']
  ]

  const checkWin = (b, p) => {
    const lines = [
      [b[0][0], b[0][1], b[0][2]],
      [b[1][0], b[1][1], b[1][2]],
      [b[2][0], b[2][1], b[2][2]],
      [b[0][0], b[1][0], b[2][0]],
      [b[0][1], b[1][1], b[2][1]],
      [b[0][2], b[1][2], b[2][2]],
      [b[0][0], b[1][1], b[2][2]],
      [b[0][2], b[1][1], b[2][0]],
    ]
    return lines.some(line => line.every(cell => cell === p))
  }

  const fullBoard = (b) => b.flat().every(cell => cell)

  const game = conn.tictactoe[id]

  if (args[0] === 'iniciar') {
    if (game) return m.reply('Ya hay un juego activo. Usa *tictactoe reiniciar* para cancelar.')

    const opponent = m.mentionedJid?.[0]
    const apuesta = parseInt(args[2]) || 0
    if (!opponent) return m.reply('Debes mencionar a un oponente.\nEj: /tictactoe iniciar @usuario 50')
    if (opponent === m.sender) return m.reply('No puedes jugar contra ti mismo.')

    // Verificación de Exp desde base de datos externa
    const user = await getUser(m.sender)
    const rival = await getUser(opponent)

    if (user.exp < apuesta || rival.exp < apuesta) {
      return m.reply('Ambos jugadores deben tener suficiente Exp para apostar.')
    }

    await updateUserExp(m.sender, -apuesta)
    await updateUserExp(opponent, -apuesta)

    conn.tictactoe[id] = {
      players: [m.sender, opponent],
      board: emptyBoard(),
      turn: 0,
      bet: apuesta,
      started: true
    }

    return conn.sendMessage(id, {
      text: `🎮 ¡Tic Tac Toe Iniciado!\n\n@${m.sender.split('@')[0]} vs @${opponent.split('@')[0]}\nApuesta: ${apuesta} Exp\n\nTablero:\n${renderBoard(conn.tictactoe[id].board)}\n\nTurno de @${m.sender.split('@')[0]} (${emojis.X})`,
      mentions: [m.sender, opponent]
    })
  }

  if (args[0] === 'jugar') {
    if (!game || !game.started) return m.reply('No hay un juego activo. Usa *tictactoe iniciar @usuario cantidad*')

    const player = m.sender
    if (player !== game.players[game.turn]) return m.reply('No es tu turno.')

    const coord = args[1]?.toUpperCase()
    if (!coord || coord.length !== 2) return m.reply('Formato inválido. Usa /tictactoe jugar B2')

    const row = letras.indexOf(coord[0])
    const col = parseInt(coord[1]) - 1
    if (row < 0 || row > 2 || col < 0 || col > 2) return m.reply('Coordenada fuera del tablero.')

    if (game.board[row][col]) return m.reply('Esa casilla ya está ocupada.')

    const symbol = game.turn === 0 ? 'X' : 'O'
    game.board[row][col] = symbol

    if (checkWin(game.board, symbol)) {
      const ganador = game.players[game.turn]
      const recompensa = game.bet * 2
      await updateUserExp(ganador, recompensa)

      delete conn.tictactoe[id]
      return conn.sendMessage(id, {
        text: `¡@${ganador.split('@')[0]} ha ganado el Tic Tac Toe!\n\n${renderBoard(game.board)}\nGanó ${recompensa} Exp`,
        mentions: [ganador]
      })
    }

    if (fullBoard(game.board)) {
      delete conn.tictactoe[id]
      return conn.sendMessage(id, {
        text: `¡Empate!\n\n${renderBoard(game.board)}`
      })
    }

    game.turn = 1 - game.turn
    const siguiente = game.players[game.turn]
    return conn.sendMessage(id, {
      text: `Tablero actualizado:\n${renderBoard(game.board)}\n\nTurno de @${siguiente.split('@')[0]} (${emojis[game.turn === 0 ? 'X' : 'O']})`,
      mentions: [siguiente]
    })
  }

  if (args[0] === 'reiniciar') {
    if (!game) return m.reply('No hay juego para reiniciar.')
    delete conn.tictactoe[id]
    return m.reply('Juego reiniciado.')
  }

  return m.reply(`Comandos Tic Tac Toe:

- *${usedPrefix + command} iniciar @usuario 50* → Inicia juego con apuesta
- *${usedPrefix + command} jugar B2* → Marca una casilla
- *${usedPrefix + command} reiniciar* → Reinicia juego activo`)
}

handler.command = /^tictactoe$/i
export default handler