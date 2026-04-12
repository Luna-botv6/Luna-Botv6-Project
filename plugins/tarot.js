import fs from 'fs'

const sesiones = new Map()
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const mapeoImagenes = {
  elmago: 'themagician.jpeg', lasacerdotisa: 'thehighpriestess.jpeg',
  laemperatriz: 'theempress.jpeg', elemperador: 'theemperor.jpeg',
  elhierofante: 'thehierophant.jpeg', losenamorados: 'TheLovers.jpg',
  elcarro: 'thechariot.jpeg', lafuerza: 'thestrength.jpeg',
  eleremitano: 'thehermit.jpeg', larueladelafortuna: 'wheeloffortune.jpeg',
  lajusticia: 'justice.jpeg', elcolgado: 'thehangedman.jpeg',
  lamuerte: 'death.jpeg', latemplanza: 'temperance.jpeg',
  eldiablo: 'thedevil.jpeg', latorre: 'thetower.jpeg',
  laestrella: 'thestar.jpeg', laluna: 'themoon.jpeg',
  elsol: 'thesun.jpeg', eljuicio: 'judgement.jpeg',
  elmundo: 'theworld.jpeg',
  themagician: 'themagician.jpeg', thehighpriestess: 'thehighpriestess.jpeg',
  theempress: 'theempress.jpeg', theemperor: 'theemperor.jpeg',
  thehierophant: 'thehierophant.jpeg', thelovers: 'TheLovers.jpg',
  thechariot: 'thechariot.jpeg', strength: 'thestrength.jpeg',
  thehermit: 'thehermit.jpeg', wheeloffortune: 'wheeloffortune.jpeg',
  justice: 'justice.jpeg', thehangedman: 'thehangedman.jpeg',
  death: 'death.jpeg', temperance: 'temperance.jpeg',
  thedevil: 'thedevil.jpeg', thetower: 'thetower.jpeg',
  thestar: 'thestar.jpeg', themoon: 'themoon.jpeg',
  thesun: 'thesun.jpeg', judgement: 'judgement.jpeg',
  theworld: 'theworld.jpeg',
  omago: 'themagician.jpeg', asacerdotisa: 'thehighpriestess.jpeg',
  aimperatriz: 'theempress.jpeg', oimperador: 'theemperor.jpeg',
  ohierofante: 'thehierophant.jpeg', osenamorados: 'TheLovers.jpg',
  ocarro: 'thechariot.jpeg', aforça: 'thestrength.jpeg',
  oeremita: 'thehermit.jpeg', arodadafortuna: 'wheeloffortune.jpeg',
  ajustiça: 'justice.jpeg', oenforcado: 'thehangedman.jpeg',
  amorte: 'death.jpeg', atemperança: 'temperance.jpeg',
  odiabo: 'thedevil.jpeg', atorre: 'thetower.jpeg',
  aestrela: 'thestar.jpeg', alua: 'themoon.jpeg',
  osol: 'thesun.jpeg', ojulgamento: 'judgement.jpeg',
  omundo: 'theworld.jpeg'
}

function getT(sender) {
  const idioma = global.db?.data?.users?.[sender]?.language || global.defaultLenguaje
  return JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`)).plugins.tarot
}

function limpiarNombre(nombre) {
  return nombre.toLowerCase()
    .replace(/á/g,'a').replace(/é/g,'e').replace(/í/g,'i')
    .replace(/ó/g,'o').replace(/ú/g,'u').replace(/ñ/g,'n')
    .replace(/ã/g,'a').replace(/ê/g,'e').replace(/ô/g,'o')
    .replace(/ç/g,'c').replace(/\s+/g,'')
}

function generarRespuesta(pregunta, cartaNombre, t) {
  const p = pregunta.toLowerCase()
  const r = t.respuestas
  const c = cartaNombre

  const match = (triggers) => triggers.some(tr => p.includes(tr))

  if (match(t.triggers.dinero)) {
    if (c === t.cartas[2]?.nombre || c === t.cartas[18]?.nombre) return r.dinero.positivo
    if (c === t.cartas[14]?.nombre || c === t.cartas[15]?.nombre) return r.dinero.negativo
    if (c === t.cartas[11]?.nombre) return r.dinero.neutro
    return r.dinero.generico
  }
  if (match(t.triggers.amor)) {
    if (c === t.cartas[5]?.nombre || c === t.cartas[18]?.nombre) return r.amor.positivo
    if (c === t.cartas[15]?.nombre) return r.amor.negativo
    if (c === t.cartas[11]?.nombre) return r.amor.neutro
    return r.amor.generico
  }
  if (match(t.triggers.trabajo)) {
    if (c === t.cartas[6]?.nombre || c === t.cartas[0]?.nombre) return r.trabajo.positivo
    if (c === t.cartas[15]?.nombre) return r.trabajo.negativo
    if (c === t.cartas[3]?.nombre) return r.trabajo.liderazgo
    return r.trabajo.generico
  }
  if (match(t.triggers.fiesta)) {
    if (c === t.cartas[18]?.nombre || c === t.cartas[5]?.nombre) return r.fiesta.positivo
    if (c === t.cartas[15]?.nombre || c === t.cartas[14]?.nombre) return r.fiesta.negativo
    if (c === t.cartas[11]?.nombre) return r.fiesta.neutro
    return r.fiesta.generico
  }
  if (match(t.triggers.soledad)) {
    if (c === t.cartas[18]?.nombre || c === t.cartas[16]?.nombre) return r.soledad.positivo
    if (c === t.cartas[2]?.nombre || c === t.cartas[5]?.nombre) return r.soledad.amor
    return r.soledad.generico
  }
  if (match(t.triggers.suerte)) {
    if (c === t.cartas[9]?.nombre) return r.suerte.rueda
    if (c === t.cartas[18]?.nombre) return r.suerte.sol
    return r.suerte.generico
  }

  return r.genericas[Math.floor(Math.random() * r.genericas.length)]
}

const handler = async (m, { conn }) => {
  const t = getT(m.sender)
  sesiones.set(m.sender, { paso: 1, timestamp: Date.now() })
  await sleep(2000)
  await conn.sendMessage(m.chat, { text: t.bienvenida }, { quoted: m })
}

handler.before = async (m, { conn }) => {
  const userId = m.sender
  if (!sesiones.has(userId)) return
  if (!m.text) return

  const sesion = sesiones.get(userId)
  if (Date.now() - sesion.timestamp < 1000) return

  const texto = m.text.trim()
  const t = getT(userId)

  if (sesion.paso === 1) {
    sesion.nombre = texto
    sesion.paso = 2
    sesion.timestamp = Date.now()
    await sleep(2000)
    await conn.sendMessage(m.chat, { text: t.pregunta_edad }, { quoted: m })
    return true
  }

  if (sesion.paso === 2) {
    const edad = parseInt(texto)
    if (isNaN(edad) || edad < 1 || edad > 120) {
      await conn.sendMessage(m.chat, { text: t.edad_invalida }, { quoted: m })
      return true
    }
    sesion.edad = edad
    sesion.paso = 3
    sesion.timestamp = Date.now()
    await sleep(2000)
    await conn.sendMessage(m.chat, { text: t.pregunta_signo }, { quoted: m })
    return true
  }

  if (sesion.paso === 3) {
    sesion.signo = texto
    sesion.paso = 4
    sesion.timestamp = Date.now()
    await sleep(2000)
    await conn.sendMessage(m.chat, { text: t.pregunta_consulta }, { quoted: m })
    return true
  }

  if (sesion.paso === 4) {
    if (texto.length < 5) {
      await conn.sendMessage(m.chat, { text: t.pregunta_corta }, { quoted: m })
      return true
    }
    sesion.pregunta = texto
    sesion.paso = 5
    sesion.timestamp = Date.now()

    await sleep(1500)
    await conn.sendMessage(m.chat, { text: t.cartas_hablan }, { quoted: m })
    await sleep(3000)

    try {
      const cartaAleatoria = t.cartas[Math.floor(Math.random() * t.cartas.length)]
      const nombreLimpio = limpiarNombre(cartaAleatoria.nombre)
      const nombreImagen = mapeoImagenes[nombreLimpio] || 'themagician.jpeg'
      const imagenUrl = `https://raw.githubusercontent.com/krates98/tarotcardapi/main/images/${nombreImagen}`

      const respuestaPersonalizada = generarRespuesta(sesion.pregunta, cartaAleatoria.nombre, t)

      const respuesta =
        `👤 *${sesion.nombre.toUpperCase()}*\n\n` +
        `${t.tu_pregunta}\n\`${sesion.pregunta}\`\n\n` +
        `${t.carta_revelada} ${cartaAleatoria.nombre}*\n\n` +
        `${cartaAleatoria.significado}\n\n` +
        `${t.mi_opinion}\n\n` +
        `${respuestaPersonalizada}\n\n` +
        `${t.footer}`

      try {
        const imageRes = await fetch(imagenUrl)
        if (imageRes.ok) {
          const buffer = Buffer.from(await imageRes.arrayBuffer())
          await conn.sendMessage(m.chat, { image: buffer, caption: respuesta }, { quoted: m })
        } else {
          await conn.sendMessage(m.chat, { text: respuesta }, { quoted: m })
        }
      } catch {
        await conn.sendMessage(m.chat, { text: respuesta }, { quoted: m })
      }

      sesiones.delete(userId)
    } catch (e) {
      await conn.sendMessage(m.chat, { text: t.error }, { quoted: m })
      sesiones.delete(userId)
    }

    return true
  }
}

handler.help = ['tarot']
handler.tags = ['fun']
handler.command = /^tarot$/i

export default handler
