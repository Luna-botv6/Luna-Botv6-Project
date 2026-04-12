import fetch from 'node-fetch'
import { getUserStats, getRoleByLevel } from '../lib/stats.js'
import { xpRange } from '../lib/levelling.js'

let juegos = global.cancionJuegos = global.cancionJuegos || {}

const TIMEOUT   = 60_000
const XP_WIN    = 1_000
const MONEY_WIN = 500

const CANCIONES = [
  { query: 'Ella Baila Sola Eslabon Armado Peso Pluma', respuesta: 'Ella Baila Sola',   artista: 'Eslabon Armado & Peso Pluma', genero: '🤠' },
  { query: 'Tití Me Preguntó Bad Bunny',                respuesta: 'Tití Me Preguntó',  artista: 'Bad Bunny',                   genero: '🐰' },
  { query: 'Gasolina Daddy Yankee',                     respuesta: 'Gasolina',           artista: 'Daddy Yankee',                genero: '🔥' },
  { query: 'Shakira BZRP Music Sessions 53',            respuesta: 'BZRP Sessions #53',  artista: 'Shakira & Bizarrap',          genero: '💃' },
  { query: 'Quevedo BZRP Music Sessions 52',            respuesta: 'BZRP Sessions #52',  artista: 'Quevedo & Bizarrap',          genero: '🎧' },
  { query: 'Duki BZRP Music Sessions 50',               respuesta: 'BZRP Sessions #50',  artista: 'Duki & Bizarrap',             genero: '🎤' },
  { query: 'Rata de Dos Patas Paquita la del Barrio',   respuesta: 'Rata de Dos Patas',  artista: 'Paquita la del Barrio',       genero: '🌶️' },
  { query: 'Mujeres Divinas Vicente Fernández',         respuesta: 'Mujeres Divinas',    artista: 'Vicente Fernández',           genero: '🎙️' },
  { query: 'Muchachos La Mosca Argentina',              respuesta: 'Muchachos',          artista: 'La Mosca',                    genero: '🇦🇷' },
  { query: 'Waka Waka Shakira',                         respuesta: 'Waka Waka',          artista: 'Shakira',                     genero: '⚽' },
  { query: 'Despacito Luis Fonsi Daddy Yankee',         respuesta: 'Despacito',          artista: 'Luis Fonsi & Daddy Yankee',   genero: '🎵' },
  { query: 'Con Calma Daddy Yankee Snow',               respuesta: 'Con Calma',          artista: 'Daddy Yankee & Snow',         genero: '❄️' },
  { query: 'Quién Como Tú Ana Gabriel',                 respuesta: 'Quién Como Tú',      artista: 'Ana Gabriel',                 genero: '🎤' },
  { query: 'La Bicicleta Carlos Vives Shakira',         respuesta: 'La Bicicleta',       artista: 'Carlos Vives & Shakira',      genero: '🚲' },
  { query: 'Mi Gente J Balvin Willy William',           respuesta: 'Mi Gente',           artista: 'J Balvin & Willy William',    genero: '🌍' },
  { query: 'Hawái Maluma',                              respuesta: 'Hawái',              artista: 'Maluma',                      genero: '🌺' },
  { query: 'Tusa Karol G Nicki Minaj',                  respuesta: 'Tusa',               artista: 'Karol G & Nicki Minaj',       genero: '💚' },
  { query: 'Bichota Karol G',                           respuesta: 'Bichota',            artista: 'Karol G',                     genero: '👑' },
  { query: 'Pepas Farruko',                             respuesta: 'Pepas',              artista: 'Farruko',                     genero: '🎡' },
  { query: 'Yonaguni Bad Bunny',                        respuesta: 'Yonaguni',           artista: 'Bad Bunny',                   genero: '🌊' },
]

async function buscarPreviewDeezer(query) {
  const url = `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=5`
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
  if (!res.ok) throw new Error(`Deezer HTTP ${res.status}`)
  const data = await res.json()
  const pistas = (data.data || []).filter(t => t.preview)
  if (!pistas.length) throw new Error(`Sin preview para: "${query}"`)
  return pistas[0].preview
}

async function descargarAudio(previewUrl) {
  const res = await fetch(previewUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } })
  if (!res.ok) throw new Error(`HTTP ${res.status} al descargar preview`)
  return Buffer.from(await res.arrayBuffer())
}

function generarPista(respuesta, nivel) {
  const palabras = respuesta.split(' ')
  if (nivel === 1) {
    return palabras.map(p =>
      p.length <= 2 ? p : p[0] + '_'.repeat(p.length - 2) + p[p.length - 1]
    ).join(' ')
  }
  const pct = nivel === 2 ? 0.4 : 0.7
  return respuesta.split('').map(c =>
    c === ' ' ? ' ' : Math.random() < pct ? c : '_'
  ).join('')
}

function formatNumber(num) {
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + 'B'
  if (num >= 1_000_000)     return (num / 1_000_000).toFixed(1) + 'M'
  if (num >= 1_000)         return (num / 1_000).toFixed(1) + 'K'
  return num.toString()
}

function formatearEstado(userId) {
  const stats       = getUserStats(userId)
  const currentRole = getRoleByLevel(stats.level)
  const { max }     = xpRange(stats.level, global.multiplier || 1)
  const falta       = max - stats.exp
  return [
    `╭━━〔 *📊 Tu perfil musical* 〕━━⬣`,
    `┃ *👤 Usuario:* @${userId.split('@')[0]}`,
    `┃`,
    `┃ *📈 Nivel:* ${stats.level}  •  *🏅 Rango:* ${currentRole}`,
    `┃ *⚡ XP:* ${formatNumber(stats.exp)} / ${formatNumber(max)}`,
    `┃ *🎯 Para subir:* ${formatNumber(falta)} XP`,
    `┃`,
    `┃ *💰 Recursos:*`,
    `┃ *💎 Diamantes:*  ${formatNumber(stats.money)}`,
    `┃ *🌙 Luna Coins:* ${formatNumber(stats.lunaCoins)}`,
    `┃ *🔮 Mystic:*     ${formatNumber(stats.mysticcoins)}`,
    `╰━━━━━━━━━━━━━━━━━━━━━━━━━⬣`,
  ].join('\n')
}

async function procesarRespuesta(m, conn, id, user, intento) {
  const j = juegos[id]
  if (!j) return

  const objetivo    = j.cancion.respuesta.toLowerCase()
  const tituloCorto = objetivo.split(' - ')[0]

  const esCorrecto =
    intento === objetivo ||
    intento === tituloCorto ||
    (objetivo.includes(intento) && intento.length >= 4)

  if (esCorrecto) {
    clearTimeout(j.timer)
    delete juegos[id]
    const stats = getUserStats(user)
    stats.exp   = (stats.exp   || 0) + XP_WIN
    stats.money = (stats.money || 0) + MONEY_WIN
    return conn.reply(id,
      `🎉 *¡CORRECTO!* 🎉\n\n` +
      `🎵 Era: *${j.cancion.respuesta}* ${j.cancion.genero}\n` +
      `🎤 Artista: _${j.cancion.artista}_\n\n` +
      `✨ *Recompensas obtenidas:*\n` +
      `   ⚡ +${formatNumber(XP_WIN)} XP\n` +
      `   💎 +${formatNumber(MONEY_WIN)} Diamantes\n\n` +
      formatearEstado(user),
      j.msgPregunta,
      { mentions: [user] }
    )
  }

  return conn.reply(id,
    `❌ *¡Incorrecto!* Seguí intentando 💪\n\n` +
    `┌─────────────────────────\n` +
    `│ 💬 *¿Cómo responder?*\n` +
    `│ • Escribí el nombre directamente\n` +
    `│ • O usá */rpcancion nombre*\n` +
    `│ • Pedí ayuda con */pista4*\n` +
    `└──────────────────────────`,
    j.msgPregunta
  )
}

const handler = async (m, { conn, command, args }) => {
  const id   = m.chat
  const user = m.sender

  if (command === 'rpcancion') {
    if (!juegos[id]) return m.reply('❌ No hay ningún juego activo. Iniciá uno con */cancion*')
    const intento = args.join(' ').toLowerCase().trim()
    if (!intento) return m.reply('⚠️ Escribí tu respuesta así: */rpcancion nombre de la canción*')
    return procesarRespuesta(m, conn, id, user, intento)
  }

  if (/^pista4$/i.test(command)) {
    if (!juegos[id]) return m.reply('❌ No hay ningún juego activo.')
    const j = juegos[id]
    j.nivelPista = Math.min((j.nivelPista || 0) + 1, 3)
    const pista = generarPista(j.cancion.respuesta, j.nivelPista)
    return conn.reply(id,
      `💡 *Pista #${j.nivelPista}/3*\n` +
      `┌───────────────────\n` +
      `│ 🎵 *${pista}*\n` +
      `│ 🎤 Artista: _${j.cancion.artista}_\n` +
      `└───────────────────`,
      j.msgPregunta
    )
  }

  if (juegos[id]) {
    return conn.reply(id,
      '🎵 Ya hay una canción activa.\n\n' +
      '┌──────────────────────────\n' +
      '│ 💬 *¿Cómo responder?*\n' +
      '│ • Escribí el nombre directamente\n' +
      '│ • O usá */rpcancion nombre*\n' +
      '│ • Pedí ayuda con */pista4*\n' +
      '└──────────────────────────',
      juegos[id].msgPregunta
    )
  }

  const cancion = CANCIONES[Math.floor(Math.random() * CANCIONES.length)]

  const caption = [
    `🎧 *¡Adivina la canción!* ${cancion.genero}`,
    ``,
    `⏳ Tenés *${TIMEOUT / 1000}s* para responder`,
    ``,
    `┌──────────────────────────`,
    `│ 💬 *¿Cómo responder?*`,
    `│ • Escribí el nombre directamente en el chat`,
    `│ • O usá */rpcancion nombre*`,
    `│ • Pedí pistas con */pista4* (hasta 3)`,
    `└──────────────────────────`,
    ``,
    `🏆 Premio: *+${formatNumber(XP_WIN)} XP* y *+${formatNumber(MONEY_WIN)} 💎*`,
  ].join('\n')

  const msgPregunta = await m.reply(caption)

  const timer = setTimeout(async () => {
    if (!juegos[id]) return
    const j = juegos[id]
    delete juegos[id]
    await conn.reply(id,
      `⏱️ *¡Tiempo agotado!*\n\n` +
      `🎵 Era: *${j.cancion.respuesta}* ${j.cancion.genero}\n` +
      `🎤 Artista: _${j.cancion.artista}_\n\n` +
      formatearEstado(j.iniciador),
      j.msgPregunta,
      { mentions: [j.iniciador] }
    )
  }, TIMEOUT)

  juegos[id] = { cancion, msgPregunta, iniciador: user, nivelPista: 0, timer }

  try {
    const previewUrl  = await buscarPreviewDeezer(cancion.query)
    const audioBuffer = await descargarAudio(previewUrl)
    await conn.sendMessage(id, {
      audio: audioBuffer,
      fileName: 'cancion.mp3',
      mimetype: 'audio/mpeg'
    }, { quoted: msgPregunta })
  } catch (err) {
    clearTimeout(timer)
    delete juegos[id]
    return conn.reply(id,
      `❌ *No se pudo cargar el audio*\n_${err.message}_\n\nIntentá de nuevo con */cancion*`,
      m
    )
  }
}

handler.before = async function (m, { conn }) {
  if (m.fromMe) return
  const id   = m.chat
  const user = m.sender
  const j    = juegos[id]
  if (!j) return

  const texto = (m.text || '').trim()
  if (!texto) return
  if (/^[\/\.\!#\$]/.test(texto)) return

  await procesarRespuesta(m, conn, id, user, texto.toLowerCase())
}

handler.command = /^cancion|canción|rpcancion|pista4$/i
export default handler