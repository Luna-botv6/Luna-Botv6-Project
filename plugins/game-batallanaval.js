const handler = async (m, { conn, args, usedPrefix, command }) => {
  conn.battleship = conn.battleship || {}
  const id = m.chat

  // Crear tablero de 4x4
  const createBoard = () => Array(4).fill(0).map(() => Array(4).fill('⬜'))

  // Colocar barcos
  const placeShips = () => {
    const ships = []
    while (ships.length < 3) {
      let x = Math.floor(Math.random() * 4)
      let y = Math.floor(Math.random() * 4)
      let pos = `${x},${y}`
      if (!ships.includes(pos)) ships.push(pos)
    }
    return ships
  }

  // Convertir coordenada a índice
  const coordToIndex = (coord) => {
    const letras = 'ABCD'
    const col = letras.indexOf(coord[0].toUpperCase())
    const row = parseInt(coord[1]) - 1
    return (row >= 0 && row < 4 && col >= 0 && col < 4) ? [row, col] : null
  }

  // Renderizar tablero con emojis
  const renderBoard = (hits, misses) => {
    const letras = 'A B C D'
    let board = '   ' + letras + '\n'
    for (let i = 0; i < 4; i++) {
      let row = `${i + 1}  `
      for (let j = 0; j < 4; j++) {
        const pos = `${i},${j}`
        if (hits.includes(pos)) row += '⛵ '
        else if (misses.includes(pos)) row += '⏺️ '
        else row += '⬜ '
      }
      board += row + '\n'
    }
    return board
  }

  const game = conn.battleship[id]

  // Comando: iniciar
  if (args[0] === 'iniciar') {
    if (game) return m.reply('Ya hay un juego en curso. Usa *batalla reiniciar* para cancelar.')
    conn.battleship[id] = {
      players: [m.sender],
      boards: {},
      ships: {},
      hits: {},
      misses: {},
      turno: 0,
      started: false
    }
    return m.reply(`Jugador 1 unido. Esperando al segundo jugador...\nEscribe *${usedPrefix + command} unirse*`)
  }

  // Comando: unirse
  if (args[0] === 'unirse') {
    if (!game) return m.reply('No hay juego activo. Usa *batalla iniciar* primero.')
    if (game.players.length >= 2) return m.reply('Ya hay dos jugadores.')
    if (game.players.includes(m.sender)) return m.reply('Ya estás en el juego.')

    game.players.push(m.sender)
    for (let player of game.players) {
      game.boards[player] = createBoard()
      game.ships[player] = placeShips()
      game.hits[player] = []
      game.misses[player] = []
    }
    game.started = true
    return m.reply(`¡Juego iniciado!\nJugador 1: @${game.players[0].split('@')[0]}\nJugador 2: @${game.players[1].split('@')[0]}\n\nTurno de @${game.players[0].split('@')[0]}\nUsa *${usedPrefix + command} disparar A3*`, null, { mentions: game.players })
  }

  // Comando: disparar A3
  if (args[0] === 'disparar') {
    if (!game || !game.started) return m.reply('No hay un juego activo o no ha empezado.')
    if (!game.players.includes(m.sender)) return m.reply('No estás en este juego.')

    const turnoJugador = game.players[game.turno]
    if (m.sender !== turnoJugador) return m.reply('No es tu turno.')

    const coord = args[1]
    if (!coord) return m.reply(`Debes escribir una coordenada. Ej: *${usedPrefix + command} disparar B2*`)

    const index = coordToIndex(coord)
    if (!index) return m.reply('Coordenada inválida. Usa letras A-D y números 1-4. Ej: B2')

    const [x, y] = index
    const objetivo = game.players[1 - game.turno]
    const pos = `${x},${y}`

    if (game.hits[turnoJugador].includes(pos) || game.misses[turnoJugador].includes(pos)) {
      return m.reply('Ya disparaste a esa posición.')
    }

    let mensaje = ''
    if (game.ships[objetivo].includes(pos)) {
      game.hits[turnoJugador].push(pos)
      mensaje = `¡Tocado! Has acertado un barco enemigo.`
    } else {
      game.misses[turnoJugador].push(pos)
      mensaje = `Agua. No hay ningún barco en ${coord.toUpperCase()}.`
    }

    const todosHundidos = game.ships[objetivo].every(p => game.hits[turnoJugador].includes(p))
    if (todosHundidos) {
      delete conn.battleship[id]
      return m.reply(`¡${mensaje}!\n\n¡@${m.sender.split('@')[0]} ha ganado la batalla naval!`, null, { mentions: [m.sender] })
    }

    game.turno = 1 - game.turno
    return m.reply(`${mensaje}

Tablero actual:
${renderBoard(game.hits[turnoJugador], game.misses[turnoJugador])}

Turno de @${game.players[game.turno].split('@')[0]}`, null, { mentions: game.players })
  }

  // Comando: reiniciar
  if (args[0] === 'reiniciar') {
    if (!game) return m.reply('No hay juego para reiniciar.')
    delete conn.battleship[id]
    return m.reply('Juego reiniciado.')
  }

  // Ayuda
  return m.reply(`Comandos disponibles:

- *${usedPrefix + command} iniciar* → Crear juego
- *${usedPrefix + command} unirse* → Unirse al juego
- *${usedPrefix + command} disparar A3* → Disparar
- *${usedPrefix + command} reiniciar* → Cancelar juego`)
}

handler.command = /^batalla$/i
export default handler
