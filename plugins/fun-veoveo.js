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
        { objeto: 'cuchara', pista: 'Se usa para comer sopas o líquidos.', emoji: '🥄' },
        { objeto: 'taza', pista: 'Se usa para tomar bebidas calientes.', emoji: '☕' },
        { objeto: 'horno', pista: 'Se usa para cocinar o calentar alimentos.', emoji: '🍽️' }
      ],
      habitación: [
        { objeto: 'cama', pista: 'Se usa para dormir.', emoji: '🛏️' },
        { objeto: 'espejo', pista: 'Se usa para ver nuestro reflejo.', emoji: '🪞' },
        { objeto: 'lámpara', pista: 'Nos da luz cuando está oscuro.', emoji: '💡' }
      ],
      baño: [
        { objeto: 'jabón', pista: 'Se usa para lavarse las manos.', emoji: '🧼' },
        { objeto: 'toalla', pista: 'Se usa para secarse el cuerpo.', emoji: '🛁' },
        { objeto: 'ducha', pista: 'Se usa para bañarse.', emoji: '🚿' }
      ],
      parque: [
        { objeto: 'bicicleta', pista: 'Un vehículo de dos ruedas que se pedalea.', emoji: '🚲' },
        { objeto: 'banco', pista: 'Un lugar donde te sientas en el parque.', emoji: '🪑' },
        { objeto: 'árbol', pista: 'Planta de gran tamaño que tiene tronco.', emoji: '🌳' }
      ],
      animales: [
        { objeto: 'perro', pista: 'Animal domesticado que dice guau.', emoji: '🐕' },
        { objeto: 'gato', pista: 'Animal domesticado que dice miau.', emoji: '🐈' },
        { objeto: 'elefante', pista: 'Animal grande con orejas grandes y trompa.', emoji: '🐘' }
      ],
      ropa: [
        { objeto: 'camisa', pista: 'Prenda que usamos en la parte superior del cuerpo.', emoji: '👚' },
        { objeto: 'pantalón', pista: 'Ropa que cubre las piernas.', emoji: '👖' },
        { objeto: 'zapatos', pista: 'Prenda que usamos en los pies.', emoji: '👟' }
      ],
      frutas: [
        { objeto: 'manzana', pista: 'Fruta roja o verde que se come cruda.', emoji: '🍎' },
        { objeto: 'banana', pista: 'Fruta amarilla que se pela antes de comer.', emoji: '🍌' },
        { objeto: 'naranja', pista: 'Fruta cítrica que se puede exprimir.', emoji: '🍊' }
      ],
      colores: [
        { objeto: 'rojo', pista: 'Es el color del amor y la pasión.', emoji: '❤️' },
        { objeto: 'azul', pista: 'Es el color del cielo y el mar.', emoji: '💙' },
        { objeto: 'amarillo', pista: 'Es el color del sol.', emoji: '💛' }
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

    // ⏰ TEMPORIZADOR DE 15 SEGUNDOS
    setTimeout(() => {
      if (veoVeo[id] && veoVeo[id].tiempo === Date.now()) {
        delete veoVeo[id]
        m.reply(`*⏰ ¡Tiempo agotado!*\n\nLa respuesta era: *${seleccion.objeto}* ${seleccion.emoji}\n\n¡Inténtalo de nuevo con otro juego!`)
      }
    }, 15000)

    return m.reply(`*Veo, veo...* (Categoría: ${categoria.toUpperCase()})\n\n*Pista:* ${seleccion.pista}\n\n¡Adivina qué objeto es!\n\n⏰ Tienes *15 segundos*\n💡 Usa /pista para ayuda\n❌ Usa /cancelar para terminar`)
  }

  if (command === 'pista') {
    if (!veoVeo[id]) return m.reply('No hay ningún juego activo.')
    return m.reply(`*Pista:* ${veoVeo[id].pista}`)
  }

  if (command === 'cancelar') {
    if (!veoVeo[id]) return m.reply('No hay ningún juego activo para cancelar.')
    const objetoCancelado = veoVeo[id].objeto
    const emojiCancelado = veoVeo[id].emoji
    delete veoVeo[id]
    return m.reply(`*Juego cancelado* ❌\n\nLa respuesta era: *${objetoCancelado}* ${emojiCancelado}`)
  }
}

handler.before = function (m) {
  // ✅ CORRECCIÓN PRINCIPAL: Evitar que el bot se responda a sí mismo
  if (m.fromMe) return
  
  const id = m.chat
  const juego = veoVeo[id]
  
  // Si no hay juego activo, no hacer nada
  if (!juego) return
  
  // ⏰ VERIFICAR SI EL TIEMPO SE AGOTÓ (15 segundos)
  if (Date.now() - juego.tiempo > 15000) {
    const objetoVencido = juego.objeto
    const emojiVencido = juego.emoji
    delete veoVeo[id]
    return m.reply(`*⏰ ¡Tiempo agotado!*\n\nLa respuesta era: *${objetoVencido}* ${emojiVencido}\n\n¡Inténtalo de nuevo con otro juego!`)
  }
  
  // ✅ CORRECCIÓN ADICIONAL: Ignorar comandos para evitar interferencias
  if (m.text && (m.text.startsWith('/') || m.text.startsWith('.') || m.text.startsWith('#'))) return

  const texto = m.text.toLowerCase().trim()
  const jugador = m.sender

  // Verificar si adivinó correctamente
  if (texto === juego.objeto) {
    delete veoVeo[id]
    stats[jugador] = stats[jugador] || { ganadas: 0, perdidas: 0 }
    stats[jugador].ganadas += 1
    return m.reply(`*¡Correcto!* 🥳✅ El objeto era *${juego.objeto}* ${juego.emoji}.\n\nPartidas ganadas: ${stats[jugador].ganadas}\nPerdidas: ${stats[jugador].perdidas}`)
  }

  // Función para calcular similitud
  const similitud = (a, b) => {
    let matches = 0
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      if (a[i] === b[i]) matches++
    }
    return matches / Math.max(a.length, b.length)
  }

  // Verificar si está cerca de la respuesta
  if (similitud(texto, juego.objeto) > 0.6) {
    return m.reply(`*¡Casi!* 🤏❗Tu respuesta está muy cerca. ¡Sigue intentando!`)
  } else {
    stats[jugador] = stats[jugador] || { ganadas: 0, perdidas: 0 }
    stats[jugador].perdidas += 1
    return m.reply(`*Respuesta incorrecta* ❌. Sigue intentándolo o usa /pista para más ayuda.`)
  }
}

handler.command = /^veoveo|pista|cancelar$/i
export default handler
