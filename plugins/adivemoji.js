let juegos = global.adivinaemoji = global.adivinaemoji || {}

const handler = async (m, { command, args, text, usedPrefix, conn }) => {
  const id = m.chat

  if (command === 'adivemoji') {
    if (juegos[id]) return m.reply('🎮 Ya hay un juego activo. Usa /pista3 o /rpta3 para responder.')

    const dificultad = (args[0] || '').toLowerCase()
    if (!['facil', 'medio', 'dificil'].includes(dificultad)) {
      return m.reply(`🔸 Indica la dificultad:\n\n*${usedPrefix}adivemoji facil*\n*${usedPrefix}adivemoji medio*\n*${usedPrefix}adivemoji dificil*`)
    }

    const preguntas = {
      facil: [
        { emoji: '☕', respuesta: 'café', pista: 'c_ _é' },
        { emoji: '📚', respuesta: 'libros', pista: 'l_ _r_s' },
        { emoji: '👻', respuesta: 'fantasma', pista: 'f_ _ _ _ _ _a' },
        { emoji: '🐱', respuesta: 'gato', pista: 'g_ _ _' },
        { emoji: '🐶', respuesta: 'perro', pista: 'p_ _ _ _' },
        { emoji: '🌞', respuesta: 'sol', pista: 's_ _' },
        { emoji: '🍎', respuesta: 'manzana', pista: 'm_ _ _ _ _a' }
      ],
      medio: [
        { emoji: '☕📚', respuesta: 'cafetería', pista: 'c_ _ _ _ _ _ _a' },
        { emoji: '⚽️🥅', respuesta: 'fútbol', pista: 'f_ _ _ _l' },
        { emoji: '🌮🥤', respuesta: 'comida', pista: 'c_ _ _ _a' },
        { emoji: '🚗💨', respuesta: 'carrera', pista: 'c_ _ _ _ _a' },
        { emoji: '🎓📖', respuesta: 'escuela', pista: 'e_ _ _ _ _a' },
        { emoji: '💻🖱️', respuesta: 'computadora', pista: 'c_ _ _ _ _ _ _ _ _a' }
      ],
      dificil: [
        { emoji: '🦇🌙🎃', respuesta: 'halloween', pista: 'h_ _ _ _ _ _ _n' },
        { emoji: '🧪⚗️🔬', respuesta: 'laboratorio', pista: 'l_ _ _ _ _ _ _ _ _o' },
        { emoji: '🧠💡📚', respuesta: 'inteligencia', pista: 'i_ _ _ _ _ _ _ _ _a' },
        { emoji: '🚀🌌🪐', respuesta: 'astronauta', pista: 'a_ _ _ _ _ _ _ _a' },
        { emoji: '🎭📽️🎬', respuesta: 'actuación', pista: 'a_ _ _ _ _ _ _n' },
        { emoji: '🏛️⚖️👩‍⚖️', respuesta: 'tribunal', pista: 't_ _ _ _ _ _l' }
      ]
    }

    const seleccion = preguntas[dificultad][Math.floor(Math.random() * preguntas[dificultad].length)]

    juegos[id] = {
      respuesta: seleccion.respuesta.toLowerCase(),
      pista: seleccion.pista,
      emoji: seleccion.emoji,
      dificultad,
      tiempo: Date.now()
    }

    return m.reply(`🎯 *¡Adivina el emoji!* (${dificultad.toUpperCase()})\n\n${seleccion.emoji}\n\n⏳ Tienes *60 segundos*.\n🔍 Usa */pista3* si necesitas ayuda.\n✅ Responde con: *${usedPrefix}rpta3 tu_respuesta*`)
  }

  if (command === 'pista3') {
    if (!juegos[id]) return m.reply('❌ No hay ningún juego activo.')
    return m.reply(`🧩 *Pista:* ${juegos[id].pista}`)
  }

  if (command === 'rpta3') {
    if (!juegos[id]) return m.reply('🎮 No hay ningún juego activo. Usa /adivemoji para empezar.')

    if (!text) return m.reply('✏️ Escribe tu respuesta: *' + usedPrefix + 'rpta3 tu_respuesta*')

    const juego = juegos[id]
    const tiempoLimite = 60000 // 60 segundos
    const tiempoTranscurrido = Date.now() - juego.tiempo

    if (tiempoTranscurrido > tiempoLimite) {
      delete juegos[id]
      return m.reply('⏰ ¡Tiempo agotado! La respuesta correcta era: *' + juego.respuesta + '*')
    }

    const respuestaUsuario = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    const respuestaCorrecta = juego.respuesta.normalize("NFD").replace(/[\u0300-\u036f]/g, "")

    if (respuestaUsuario === respuestaCorrecta) {
      delete juegos[id]
      let recompensa = juego.dificultad === 'facil' ? 500 : juego.dificultad === 'medio' ? 1000 : 2500
      if (!global.db.data.users[m.sender]) global.db.data.users[m.sender] = { exp: 0 }
      global.db.data.users[m.sender].exp += recompensa
      return m.reply(`🎉 *¡Correcto!* La respuesta era *${juego.respuesta}*.\n🪙 Recompensa: *+${recompensa} Exp*`)
    } else {
      return m.reply('❌ Respuesta incorrecta. Intenta de nuevo o usa /pista3.')
    }
  }
}

handler.command = /^adivemoji|pista3|rpta3$/i
export default handler
