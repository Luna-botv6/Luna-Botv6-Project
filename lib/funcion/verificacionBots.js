import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { proto, generateWAMessageFromContent } from '@whiskeysockets/baileys'
import chalk from 'chalk'
import { esBotIgnorado, agregarBotIgnorado, MARCA_LUNA } from './botsIgnorados.js'

const FOLDER = './database'
const FILE = `${FOLDER}/usuarios-verificados.json`
const DESAFIO_TTL = 10 * 60 * 1000
const MAX_VERIFICADOS = 10000

if (!existsSync(FOLDER)) mkdirSync(FOLDER, { recursive: true })

export const BOTON_VERIFICAR = 'nosoybot'

let _verificados = null
const _pendientes = new Map()

const _TXT_ES = {
  desafio: 'Hola {usuario} 👀 vi que me reenviaste un mensaje mío y te confundí con un bot 😅. Tocá el botón de abajo para confirmar que sos humano y no te voy a ignorar 🙏',
  confirmado: '¡Confirmado! {usuario} es humano de verdad, ya no corre riesgo de ser ignorado 🎉😊',
  otro: 'oye {usuario} a ti no te pregunté jaja 🙊😅',
  boton: 'NO SOY BOT',
  footer: 'Luna verificación 🔐'
}

let _t = null

function getTxt() {
  const idioma = global.defaultLenguaje || 'es'
  if (_t?._idioma === idioma) return _t
  try {
    const parsed = JSON.parse(readFileSync(`./src/lunaidiomas/${idioma}.json`, 'utf8'))
    _t = Object.assign({}, _TXT_ES, parsed.verificacion_bots || {})
  } catch {
    _t = { ..._TXT_ES }
  }
  _t._idioma = idioma
  return _t
}

function numDe(jid) {
  const base = String(jid || '').split('@')[0].split(':')[0]
  return base || ''
}

function load() {
  _verificados = new Map()
  try {
    if (!existsSync(FILE)) return
    const raw = JSON.parse(readFileSync(FILE, 'utf8'))
    if (!Array.isArray(raw)) return
    for (const item of raw) {
      if (!item || typeof item.n !== 'string') continue
      const base = numDe(item.n)
      if (base) _verificados.set(base, { t: typeof item.t === 'number' ? item.t : Date.now() })
    }
  } catch {}
}

function save() {
  try {
    const arr = [..._verificados.entries()].map(([n, m]) => ({ n, t: m.t }))
    writeFileSync(FILE, JSON.stringify(arr, null, 2), 'utf8')
  } catch {}
}

function ensure() {
  if (_verificados === null) load()
}

export function estaVerificado(jid) {
  ensure()
  const n = numDe(jid)
  return n ? _verificados.has(n) : false
}

export function marcarVerificado(jid) {
  ensure()
  const n = numDe(jid)
  if (!n) return
  _verificados.set(n, { t: Date.now() })
  if (_verificados.size > MAX_VERIFICADOS) {
    const masViejo = [..._verificados.entries()].sort((a, b) => a[1].t - b[1].t)[0]
    if (masViejo) _verificados.delete(masViejo[0])
  }
  save()
}

export function registrarDesafio(jid) {
  const n = numDe(jid)
  if (n) _pendientes.set(n, Date.now())
}

export function cerrarDesafio(jid) {
  const n = numDe(jid)
  if (n) _pendientes.delete(n)
}

export function tieneDesafioPendiente(jid) {
  const n = numDe(jid)
  if (!n || !_pendientes.has(n)) return false
  if (Date.now() - _pendientes.get(n) > DESAFIO_TTL) {
    _pendientes.delete(n)
    return false
  }
  return true
}

export function obtenerBotonId(m) {
  if (!m) return null
  if (m.buttonsResponseMessage?.selectedButtonId) return String(m.buttonsResponseMessage.selectedButtonId)
  if (m.templateButtonReplyMessage?.selectedId) return String(m.templateButtonReplyMessage.selectedId)
  if (m.listResponseMessage?.singleSelectReply?.selectedRowId) return String(m.listResponseMessage.singleSelectReply.selectedRowId)
  if (m.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson) {
    try {
      const p = JSON.parse(m.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson)
      return typeof p?.id === 'string' ? p.id : null
    } catch {
      return null
    }
  }
  return null
}

async function enviarDesafio(conn, chatId, senderJid, num) {
  const txt = getTxt()
  const body = txt.desafio.replace('{usuario}', `@${num}`) + MARCA_LUNA
  const waMsg = generateWAMessageFromContent(chatId,
    proto.Message.fromObject({
      interactiveMessage: {
        header: {
          title: '',
          subtitle: txt.boton,
          hasMediaAttachment: false
        },
        body: { text: body },
        footer: { text: txt.footer },
        contextInfo: { mentionedJid: [senderJid] },
        nativeFlowMessage: {
          buttons: [{
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({ display_text: txt.boton, id: BOTON_VERIFICAR })
          }],
          messageParamsJson: ''
        }
      }
    }),
    { userJid: conn.user.jid }
  )
  await conn.relayMessage(chatId, waMsg.message, { messageId: waMsg.key.id })
}

export async function manejarMarcaLuna(conn, msg) {
  const message = msg.messages?.[0]
  if (!message) return
  const senderJid = message.key?.participant || message.key?.remoteJid
  const chatId = message.key?.remoteJid
  const num = numDe(senderJid)
  if (!num) return
  if (esBotIgnorado(senderJid)) {
    console.log(chalk.cyan(`[Ignorado] usuario posible bot ${num} en chat ${numDe(chatId)}`))
    return
  }
  if (estaVerificado(senderJid)) return
  if (tieneDesafioPendiente(senderJid)) {
    agregarBotIgnorado(senderJid, 'challenge')
    console.log(chalk.cyan(`[Ignorado] ${num} no confirmó el botón, agregado como posible bot`))
    return
  }
  registrarDesafio(senderJid)
  console.log(chalk.cyan(`[Desafio] ${num} reenvió un mensaje con firma, se le envió verificación en ${numDe(chatId)}`))
  try {
    await enviarDesafio(conn, chatId, senderJid, num)
  } catch {
    cerrarDesafio(senderJid)
    console.log(chalk.cyan(`[Desafio] ${num} no pudo recibir el botón, pendiente cancelado`))
  }
}

export async function manejarRespuestaBoton(conn, msg) {
  const message = msg.messages?.[0]
  if (!message) return
  const senderJid = message.key?.participant || message.key?.remoteJid
  const chatId = message.key?.remoteJid
  const num = numDe(senderJid)
  if (!num) return
  if (estaVerificado(senderJid)) return
  const txt = getTxt()
  if (tieneDesafioPendiente(senderJid)) {
    cerrarDesafio(senderJid)
    marcarVerificado(senderJid)
    console.log(chalk.cyan(`[Verificado] ${num} tocó el botón, ya no se le ignora`))
    await conn.sendMessage(chatId, { text: txt.confirmado.replace('{usuario}', `@${num}`), mentions: [senderJid] })
    return
  }
  console.log(chalk.cyan(`[Desafio] ${num} tocó el botón sin ser el retado`))
  await conn.sendMessage(chatId, { text: txt.otro.replace('{usuario}', `@${num}`), mentions: [senderJid] })
}