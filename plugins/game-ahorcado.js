import { addExp } from '../lib/ahorcado.js'

const HANGMAN_PICS = [
  `
   +---+
   |   |
       |
       |
       |
       |
  =========`, `
   +---+
   |   |
   O   |
       |
       |
       |
  =========`, `
   +---+
   |   |
   O   |
   |   |
       |
       |
  =========`, `
   +---+
   |   |
   O   |
  /|   |
       |
       |
  =========`, `
   +---+
   |   |
   O   |
  /|\\  |
       |
       |
  =========`, `
   +---+
   |   |
   O   |
  /|\\  |
  /    |
       |
  =========`, `
   +---+
   |   |
   O   |
  /|\\  |
  / \\  |
       |
  =========`
]

const palabras = {
  facil: ['perro', 'gato', 'pan', 'luz', 'rojo', 'casa', 'sol', 'flor'],
  medio: ['coche', 'silla', 'escuela', 'calle', 'pelota', 'cuadro', 'ventana'],
  dificil: ['murcielago', 'javascript', 'universo', 'computadora', 'matematicas', 'desarrollador', 'revolucion']
}

async function handler(m, { conn, args, usedPrefix, command }) {
  conn.hangman = conn.hangman || {}
  const id = m.chat

  if (!conn.hangman[id]) {
    let dificultad = (args[0] || '').toLowerCase()
    if (!['facil', 'medio', 'dificil'].includes(dificultad)) {
      return m.reply(`Elige una dificultad para empezar:

*${usedPrefix + command} facil*
*${usedPrefix + command} medio*
*${usedPrefix + command} dificil*`)
    }

    let lista = palabras[dificultad]
    let palabra = lista[Math.floor(Math.random() * lista.length)]
    conn.hangman[id] = {
      palabra,
      letras: [],
      intentos: 6,
      mostrar: palabra.replace(/./g, '_'),
      dificultad
    }

    return m.reply(`¡Nuevo juego del ahorcado iniciado!

Dificultad: *${dificultad.toUpperCase()}*
${HANGMAN_PICS[0]}
Palabra: ${conn.hangman[id].mostrar.split('').join(' ')}

Escribe una letra con:
*${usedPrefix + command} <letra>*`)
  }

  const juego = conn.hangman[id]
  if (!args[0] || args[0].length !== 1 || !/[a-zñ]/i.test(args[0])) {
    return m.reply(`Debes escribir una sola letra. Ejemplo:\n*${usedPrefix + command} a*`)
  }

  const letra = args[0].toLowerCase()
  if (juego.letras.includes(letra)) {
    return m.reply(`Ya escribiste la letra *${letra}*. Prueba con otra.`)
  }

  juego.letras.push(letra)

  if (juego.palabra.includes(letra)) {
    let nuevaMostrar = ''
    for (let i = 0; i < juego.palabra.length; i++) {
      nuevaMostrar += juego.letras.includes(juego.palabra[i]) ? juego.palabra[i] : '_'
    }
    juego.mostrar = nuevaMostrar

    if (!juego.mostrar.includes('_')) {
      let expGanada = juego.dificultad === 'facil' ? 50 : juego.dificultad === 'medio' ? 100 : 200
      addExp(m.sender, expGanada)
      delete conn.hangman[id]
      return m.reply(`¡Felicidades! Adivinaste la palabra: *${juego.palabra}*
Ganaste *+${expGanada} EXP*`)
    } else {
      return m.reply(`¡Bien! La letra *${letra}* está en la palabra.

${HANGMAN_PICS[6 - juego.intentos]}
Palabra: ${juego.mostrar.split('').join(' ')}
Letras usadas: ${juego.letras.join(', ')}
Intentos restantes: ${juego.intentos}`)
    }
  } else {
    juego.intentos--

    if (juego.intentos <= 0) {
      const palabraFinal = juego.palabra
      const dibujoFinal = HANGMAN_PICS[6]
      delete conn.hangman[id]
      return m.reply(`${dibujoFinal}

¡Perdiste! La palabra era: *${palabraFinal}*`)
    } else {
      return m.reply(`La letra *${letra}* no está en la palabra.

${HANGMAN_PICS[6 - juego.intentos]}
Palabra: ${juego.mostrar.split('').join(' ')}
Letras usadas: ${juego.letras.join(', ')}
Intentos restantes: ${juego.intentos}`)
    }
  }
}

handler.command = /^ahorcado$/i
export default handler
