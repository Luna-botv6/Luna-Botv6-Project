import fs from 'fs'
import path from 'path'
import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js'

const TIMEOUT = 60000
const POIN = 500
const DB_PATH = './database/acertijos.json'

const DEFAULT_ACERTIJOS = [
  { "question": "Tengo ciudades, pero no casas; bosques, pero no árboles; y agua, pero no peces. ¿Qué soy?", "response": "mapa" },
  { "question": "Cuanto más me secas, más mojado me pongo. ¿Qué soy?", "response": "toalla" },
  { "question": "Habla sin boca y escucha sin oídos. No tiene cuerpo pero cobra vida con el viento. ¿Qué soy?", "response": "eco" },
  { "question": "Tengo manos pero no puedo aplaudir. ¿Qué soy?", "response": "reloj" },
  { "question": "Soy ligero como una pluma, pero ni el hombre más fuerte puede sostenerme más de 5 minutos. ¿Qué soy?", "response": "aliento" },
  { "question": "Cuanto más grande, menos puedes ver. ¿Qué soy?", "response": "oscuridad" },
  { "question": "Tengo un cuello pero no tengo cabeza. ¿Qué soy?", "response": "botella" },
  { "question": "Vuelo sin alas y lloro sin ojos. ¿Qué soy?", "response": "nube" },
  { "question": "Soy el hijo de tu padre pero no soy tu hermano. ¿Quién soy?", "response": "yo" },
  { "question": "Nunca hago preguntas pero siempre me responden. ¿Qué soy?", "response": "telefono" },
  { "question": "Tengo patas pero no camino, tengo espalda pero no me duele. ¿Qué soy?", "response": "silla" },
  { "question": "Entra por un oído y sale por el otro. ¿Qué soy?", "response": "arete" },
  { "question": "Soy redondo como la luna, plano como un plato. ¿Qué soy?", "response": "moneda" },
  { "question": "Entre más me quitas, más grande me hago. ¿Qué soy?", "response": "hoyo" },
  { "question": "Corro pero no tengo piernas, tengo boca pero no hablo. ¿Qué soy?", "response": "rio" },
  { "question": "De día en la cama y de noche en el suelo. ¿Qué soy?", "response": "zapato" },
  { "question": "Me puedes atrapar pero no lanzar. ¿Qué soy?", "response": "resfrio" },
  { "question": "Tengo ojo pero no veo. ¿Qué soy?", "response": "aguja" },
  { "question": "Mientras más seco más moja. ¿Qué soy?", "response": "sed" },
  { "question": "Oro parece, plata no es. El que no lo adivine, bien tonto es. ¿Qué soy?", "response": "platano" }
]

if (!global.acertijosUsados) global.acertijosUsados = []

const loadAcertijos = () => {
  try {
    if (!fs.existsSync(DB_PATH)) {
      fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
      fs.writeFileSync(DB_PATH, JSON.stringify(DEFAULT_ACERTIJOS, null, 2))
      console.log('[ACERTIJO] Base de datos creada en', DB_PATH)
      return [...DEFAULT_ACERTIJOS]
    }
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'))
  } catch (e) {
    console.error('[ACERTIJO] Error leyendo database:', e.message)
    return [...DEFAULT_ACERTIJOS]
  }
}

const pickAcertijo = (lista) => {
  const disponibles = lista.filter(a => !global.acertijosUsados.includes(a.question))
  if (!disponibles.length) {
    global.acertijosUsados = []
    return lista[Math.floor(Math.random() * lista.length)]
  }
  const elegido = disponibles[Math.floor(Math.random() * disponibles.length)]
  global.acertijosUsados.push(elegido.question)
  if (global.acertijosUsados.length > Math.floor(lista.length / 2)) {
    global.acertijosUsados.shift()
  }
  return elegido
}

const buildCaption = (question, secsLeft) =>
  `╭━━━「 🧩 *ACERTIJO* 」━━━╮\n` +
  `┃\n` +
  `┃ 🤔 *${question}*\n` +
  `┃\n` +
  `┃ ⏱ *Tiempo restante* › ${secsLeft}s\n` +
  `┃ 🏆 *Premio* › +${POIN} Exp\n` +
  `┃\n` +
  `┃ 💬 Responde *citando este mensaje*\n` +
  `┃\n` +
  `╰━━━━━━━━━━━━━━━━━━━━━━━╯`

const handler = async (m, { conn }) => {
  conn.tekateki = conn.tekateki || {}
  const id = m.chat

  if (id in conn.tekateki) {
    return conn.reply(m.chat, '⚠️ Ya hay un acertijo activo, ¡respóndelo primero!', conn.tekateki[id][0])
  }

  const acertijos = loadAcertijos()
  if (!acertijos.length) return m.reply('❌ No hay acertijos en la base de datos.')

  const json = pickAcertijo(acertijos)
  const startTime = Date.now()
  const sentMsg = await conn.reply(m.chat, buildCaption(json.question, (TIMEOUT / 1000).toFixed(0)), m)

  conn.tekateki[id] = [
    sentMsg, json, POIN,
    setTimeout(async () => {
      if (!conn.tekateki[id]) return
      const fin =
        `╭━「 ⏰ *SE ACABÓ EL TIEMPO* 」━╮\n` +
        `┃\n` +
        `┃ 😔 Nadie respondió correctamente.\n` +
        `┃ ¡Suerte en el próximo! 🍀\n` +
        `┃\n` +
        `╰━━━━━━━━━━━━━━━━━━━━━╯`
      await conn.sendMessage(m.chat, { text: fin }, { quoted: conn.tekateki[id][0] })
      delete conn.tekateki[id]
    }, TIMEOUT),
    startTime
  ]
}

handler.help = ['acertijo']
handler.tags = ['game']
handler.command = /^(acertijo|acert|pregunta|adivinanza|tekateki)$/i
export default handler
