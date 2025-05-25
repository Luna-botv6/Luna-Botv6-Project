let veoVeo = global.veoVeo = global.veoVeo || {}
let stats = global.veoVeoStats = global.veoVeoStats || {}

const handler = async (m, { command, args, text, usedPrefix }) => {
  const id = m.chat
  const user = m.sender

  if (command === 'veoveo') {
    if (veoVeo[id]) return m.reply('¡Ya hay un juego activo! Usa /pista o responde.')

    const categoria = (args[0] || '').toLowerCase()
    const categoriasDisponibles = ['cocina', 'habitación', 'baño', 'parque', 'animales', 'ropa', 'frutas', 'colores']

    if (!categoriasDisponibles.includes(categoria))
      return m.reply(`Debes elegir una categoría válida. Las categorías disponibles son:\n\n*${categoriasDisponibles.join('*\n*')}`)

    const preguntas = {
      cocina: [
        { objeto: 'Cuchara', pista: 'Se usa para comer sopas o líquidos.', emoji: '🥄' },
        { objeto: 'Taza', pista: 'Se usa para tomar bebidas calientes.', emoji: '☕' },
        { objeto: 'Horno', pista: 'Se usa para cocinar o calentar alimentos.', emoji: '🍽️' }
      ],
      habitación: [
        { objeto: 'Cama', pista: 'Se usa para dormir.', emoji: '🛏️' },
        { objeto: 'Espejo', pista: 'Se usa para ver nuestro reflejo.', emoji: '🪞' },
        { objeto: 'Lámpara', pista: 'Nos da luz cuando está oscuro.', emoji: '💡' }
      ],
      baño: [
        { objeto: 'Jabón', pista: 'Se usa para lavarse las manos.', emoji: '🧼' },
        { objeto: 'Toalla', pista: 'Se usa para secarse el cuerpo.', emoji: '🛁' },
        { objeto: 'Ducha', pista: 'Se usa para bañarse.', emoji: '🚿' }
      ],
      parque: [
        { objeto: 'Bicicleta', pista: 'Un vehículo de dos ruedas que se pedalea.', emoji: '🚲' },
        { objeto: 'Banco', pista: 'Un lugar donde te sientas en el parque.', emoji: '🪑' },
        { objeto: 'Árbol', pista: 'Planta de gran tamaño que tiene tronco.', emoji: '🌳' }
      ],
      animales: [
        { objeto: 'Perro', pista: 'Animal domesticado que dice guau.', emoji: '🐕' },
        { objeto: 'Gato', pista: 'Animal domesticado que dice miau.', emoji: '🐈' },
        { objeto: 'Elefante', pista: 'Animal grande con orejas grandes y trompa.', emoji: '🐘' }
      ],
      ropa: [
        { objeto: 'Camisa', pista: 'Prenda que usamos en la parte superior del cuerpo.', emoji: '👚' },
        { objeto: 'Pantalón', pista: 'Ropa que cubre las piernas.', emoji: '👖' },
        { objeto: 'Zapatos', pista: 'Prenda que usamos en los pies.', emoji: '👟' }
      ],
      frutas: [
        { objeto: 'Manzana', pista: 'Fruta roja o verde que se come cruda.', emoji: '🍎' },
        { objeto: 'Banana', pista: 'Fruta amarilla que se pela antes de comer.', emoji: '🍌' },
        { objeto: 'Naranja', pista: 'Fruta cítrica que se puede exprimir.', emoji: '🍊' }
      ],
      colores: [
        { objeto: 'Rojo', pista: 'Es el color del amor y la pasión.', emoji: '❤️' },
        { objeto: 'Azul', pista: 'Es el color del cielo y el mar.', emoji: '💙' },
        { objeto: 'Amarillo', pista: 'Es el color del sol.', emoji: '💛' }
      ]
    }

    const lista = preguntas[categoria]
    const seleccion = lista[Math.floor(Math.random() * lista.length)]

    veoVeo[id] = {
      objeto: seleccion.objeto.toLowerCase(),
      pista: seleccion.pista,
      categoria,
      emoji: seleccion.emoji,
      tiempo: Date.now(),
      jugador: user
    }

    return m.reply(`*Veo, veo...* (Categoría: ${categoria.toUpperCase()})\n\n*Pista:* ${seleccion.pista}\n\n¡Adivina qué objeto es! Usa /pista si necesitas ayuda.`)
  }

  if (command === 'pista') {
    if (!veoVeo[id]) return m.reply('No hay ningún juego activo.')
    return m.reply(`*Pista:* ${veoVeo[id].pista}`)
  }
}

handler.before = function (m) {
  const id = m.chat
  const juego = veoVeo[id]
  if (!juego) return

  const texto = m.text.toLowerCase().trim()
  const jugador = m.sender

  if (texto === juego.objeto) {
    delete veoVeo[id]
    stats[jugador] = stats[jugador] || { ganadas: 0, perdidas: 0 }
    stats[jugador].ganadas += 1
    return m.reply(`*¡Correcto!* 🥳✅ El objeto era *${texto}* ${juego.emoji}.\n\nPartidas ganadas: ${stats[jugador].ganadas}\nPerdidas: ${stats[jugador].perdidas}`)
  }

  const similitud = (a, b) => {
    let matches = 0
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      if (a[i] === b[i]) matches++
    }
    return matches / Math.max(a.length, b.length)
  }

  if (similitud(texto, juego.objeto) > 0.6) {
    return m.reply(`*¡Casi!* 🤏❗Tu respuesta está muy cerca. ¡Sigue intentando!`)
  } else {
    stats[jugador] = stats[jugador] || { ganadas: 0, perdidas: 0 }
    stats[jugador].perdidas += 1
    return m.reply(`*Respuesta incorrecta* ❌. Sigue intentándolo o usa /pista para más ayuda.`)
  }
}

handler.command = /^veoveo|pista$/i
export default handler
