let veoVeo = global.veoVeo = global.veoVeo || {}
let stats = global.veoVeoStats = global.veoVeoStats || {}

const handler = async (m, { conn, command, args }) => {
  const id = m.chat
  const user = m.sender
  const language = global.db.data.users[user]?.language || global.defaultLenguaje
  const texts = (await import(`../src/lunaidiomas/${language}.json`, { assert: { type: 'json' } })).default.plugins.veoveo

  if (command === 'veoveo') {
    if (veoVeo[id]) return m.reply(texts.activo)

    const categoriasDisponibles = Object.keys(texts.preguntas)
    const categoria = (args[0] || '').toLowerCase()

    if (!categoriasDisponibles.includes(categoria)) {
      return m.reply(texts.error_cat.replace('{cats}', categoriasDisponibles.join('*\n*')))
    }

    const lista = texts.preguntas[categoria]
    const seleccion = lista[Math.floor(Math.random() * lista.length)]

    veoVeo[id] = {
      objeto: seleccion.objeto.toLowerCase(),
      pista: seleccion.pista,
      emoji: seleccion.emoji,
      tiempo: Date.now(),
      jugador: user
    }

    return m.reply(texts.inicio.replace('{cat}', categoria.toUpperCase()).replace('{pista}', seleccion.pista))
  }

  if (command === 'pista') {
    if (!veoVeo[id]) return m.reply(texts.no_juego)
    return m.reply(`*Pista:* ${veoVeo[id].pista}`)
  }

  if (command === 'cancelar') {
    if (!veoVeo[id]) return m.reply(texts.no_juego)
    const { objeto, emoji } = veoVeo[id]
    delete veoVeo[id]
    return m.reply(texts.cancelado.replace('{obj}', objeto).replace('{emoji}', emoji))
  }
}

handler.before = async function (m) {
  if (m.fromMe || !m.text) return
  const id = m.chat
  if (!veoVeo[id]) return

  const language = global.db.data.users[m.sender]?.language || global.defaultLenguaje
  const texts = (await import(`../src/lunaidiomas/${language}.json`, { assert: { type: 'json' } })).default.plugins.veoveo

  // Manejo de tiempo (15 seg)
  if (Date.now() - veoVeo[id].tiempo > 15000) {
    const { objeto, emoji } = veoVeo[id]
    delete veoVeo[id]
    return m.reply(texts.timeout.replace('{obj}', objeto).replace('{emoji}', emoji))
  }

  if (m.text.startsWith('/') || m.text.startsWith('.') || m.text.startsWith('#')) return

  const texto = m.text.toLowerCase().trim()
  const jugador = m.sender
  stats[jugador] = stats[jugador] || { ganadas: 0, perdidas: 0 }

  if (texto === veoVeo[id].objeto) {
    const { objeto, emoji } = veoVeo[id]
    delete veoVeo[id]
    stats[jugador].ganadas += 1
    return m.reply(texts.ganaste.replace('{obj}', objeto).replace('{emoji}', emoji).replace('{gan}', stats[jugador].ganadas).replace('{per}', stats[jugador].perdidas))
  }

  const similitud = (a, b) => {
    let matches = 0
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      if (a[i] === b[i]) matches++
    }
    return matches / Math.max(a.length, b.length)
  }

  if (similitud(texto, veoVeo[id].objeto) > 0.6) {
    return m.reply(texts.casi)
  } else {
    stats[jugador].perdidas += 1
    return m.reply(texts.incorrecto)
  }
}

handler.command = /^veoveo|pista|cancelar$/i
export default handler
