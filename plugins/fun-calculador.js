import fs from 'fs'

const handler = async (m, { conn, command, text }) => {
  // Carga el idioma del usuario o el predeterminado
  const idioma = global.db.data.users[m.sender].language || global.defaultLenguaje
  const traductor = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`)).plugins.fun_calculador

  // Obtener JID del usuario mencionado, si no hay, usar texto plano (por si no etiqueta)
  let mencionadoJid = (m.mentionedJid && m.mentionedJid[0]) || null

  if (!mencionadoJid && text) {
    // Intentar que el texto sea número y armar un jid básico
    // Solo si quieres hacerlo así, sino lanzas error
    const posibleNumero = text.replace(/\D/g, '') // solo números
    if (posibleNumero) mencionadoJid = `${posibleNumero}@s.whatsapp.net`
  }

  if (!mencionadoJid) throw traductor.texto26 // "Etiqueta a alguien"

  // Porcentaje aleatorio
  const porcentaje = Math.floor(Math.random() * 101)

  // Barra gráfica
  const totalBarra = 10
  const barraLlena = Math.floor(porcentaje / (100 / totalBarra))
  const barra = '▰'.repeat(barraLlena) + '▱'.repeat(totalBarra - barraLlena)

  // Configuración por comando
  const configuracion = {
    gay2: { emoji: '🏳️‍🌈', textos: [traductor.texto1, traductor.texto2, traductor.texto3] },
    lesbiana: { emoji: '🏳️‍🌈', textos: [traductor.texto4, traductor.texto5, traductor.texto6] },
    pajero: { emoji: '😏💦', textos: [traductor.texto7, traductor.texto8, traductor.texto9] },
    pajera: { emoji: '😏💦', textos: [traductor.texto7, traductor.texto8, traductor.texto9] },
    puto: { emoji: '🔥🥵', textos: [traductor.texto10, traductor.texto11, traductor.texto12] },
    puta: { emoji: '🔥🥵', textos: [traductor.texto10, traductor.texto11, traductor.texto12] },
    manco: { emoji: '💩', textos: [traductor.texto13, traductor.texto14, traductor.texto15] },
    manca: { emoji: '💩', textos: [traductor.texto13, traductor.texto14, traductor.texto15] },
    rata: { emoji: '🐁', textos: [traductor.texto16, traductor.texto17, traductor.texto18] },
    prostituto: { emoji: '🫦👅', textos: [traductor.texto19, traductor.texto20, traductor.texto21] },
    prostituta: { emoji: '🫦👅', textos: [traductor.texto19, traductor.texto20, traductor.texto21] }
  }

  const datos = configuracion[command]
  if (!datos) throw traductor.texto22

  const [textosMenor, textosMayor, textosIntermedio] = datos.textos
  const textos = porcentaje < 50 ? textosMenor : porcentaje > 100 ? textosMayor : textosIntermedio

  // Nombre para mostrar (solo número corto)
  const nombreMostrar = `@${mencionadoJid.split('@')[0]}`

  const descripcion = `${textos[0]} *${nombreMostrar}* ${textos[1]} *${porcentaje}%* ${command} ${datos.emoji}\n${barra}\n${textos[2]}`

  const mensajeAleatorio = traductor.texto23[Math.floor(Math.random() * traductor.texto23.length)]

  const resultadoFinal = `
┏━━━━━━━━━━━━━━━┓
┃  💫 *${traductor.texto24}* 💫
┗━━━━━━━━━━━━━━━┛

${descripcion}

🗯️ *${mensajeAleatorio}*

┏━━━━━━━━━━━━━━━┓
┃ 🔮 *${traductor.texto24}* 🔮
┗━━━━━━━━━━━━━━━┛
`.trim()

  // Mensaje "calculando..."
  await conn.sendMessage(m.chat, { text: '⌛ *Calculando...* ⌛' }, { quoted: m })

  // Esperar 3 segundos
  await new Promise(resolve => setTimeout(resolve, 3000))

  // Enviar resultado final mencionando al usuario
  await conn.sendMessage(m.chat, {
    text: resultadoFinal,
    mentions: [mencionadoJid]
  }, { quoted: m })
}

handler.help = ['gay2', 'lesbiana', 'pajero', 'pajera', 'puto', 'puta', 'manco', 'manca', 'rata', 'prostituta', 'prostituto'].map(v => v + ' @tag | nombre')
handler.tags = ['calculator']
handler.command = /^(gay2|lesbiana|pajero|pajera|puto|puta|manco|manca|rata|prostituto|prostituta)$/i

export default handler
