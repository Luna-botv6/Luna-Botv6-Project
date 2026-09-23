import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import chalk from 'chalk'
import { resolveJid } from '../lidMap.js'

const FOLDER = './database'
const FILE = `${FOLDER}/bots-ignorados.json`

if (!existsSync(FOLDER)) mkdirSync(FOLDER, { recursive: true })

export const MARCA_LUNA = '\u200B\u200C\u200D\u2060'

const VERSION = 2

let _jids = null

function keyDe(n, chatId) {
  return `${n}\u0001${chatId || ''}`
}

function baseDe(jid) {
  return String(jid || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '') || ''
}

function load() {
  _jids = new Map()
  try {
    if (!existsSync(FILE)) return
    const raw = JSON.parse(readFileSync(FILE, 'utf8'))
    if (Array.isArray(raw)) {
      console.log(chalk.yellow('[BotsIgnorados] formato viejo detectado: limpieza única, lista reiniciada'))
      save()
      return
    }
    const items = raw && typeof raw === 'object' && Array.isArray(raw.items) ? raw.items : null
    if (!items) return
    for (const item of items) {
      if (!item || typeof item.n !== 'string' || !item.n) continue
      const n = baseDe(item.n)
      if (!n) continue
      const chat = typeof item.chat === 'string' ? item.chat : ''
      _jids.set(keyDe(n, chat), {
        n,
        t: typeof item.t === 'number' ? item.t : Date.now(),
        src: typeof item.src === 'string' ? item.src : 'manual',
        chat
      })
    }
  } catch {}
}

function ensure() {
  if (_jids === null) load()
}

function save() {
  try {
    const items = [..._jids.values()]
    writeFileSync(FILE, JSON.stringify({version: VERSION, items}, null, 2), 'utf8')
  } catch {}
}

export function esBotIgnorado(jid, chatId) {
  if (!jid) return false
  ensure()
  const n = baseDe(jid)
  if (!n) return false
  if (_jids.has(keyDe(n, ''))) return true
  if (chatId && _jids.has(keyDe(n, chatId))) return true
  return false
}

export function agregarBotIgnorado(jid, src = 'manual', chatId = '') {
  const j = String(jid || '').replace(/[^0-9]/g, '')
  if (!j) return false
  ensure()
  const real = resolveJid(j)
  const n = real ? real.split('@')[0] : j
  const chat = chatId || ''
  const key = keyDe(n, chat)
  if (_jids.has(key)) return false
  _jids.set(key, { n, t: Date.now(), src, chat })
  save()
  return true
}

export function quitarBotIgnorado(jid, chatId) {
  const j = String(jid || '').replace(/[^0-9]/g, '')
  if (!j) return false
  ensure()
  const real = resolveJid(j)
  const n = real ? real.split('@')[0] : j
  let borro = false
  if (_jids.delete(keyDe(n, chatId || ''))) borro = true
  if (chatId && _jids.delete(keyDe(n, ''))) borro = true
  if (!borro) return false
  save()
  return true
}

export function listarBotsIgnorados(chatId) {
  ensure()
  const salida = new Set()
  for (const m of _jids.values()) {
    if (!chatId || !m.chat || m.chat === chatId) {
      salida.add(m.n)
    }
  }
  return [...salida]
}

export function cantidadBotsIgnorados(chatId) {
  ensure()
  if (!chatId) return _jids.size
  return listarBotsIgnorados(chatId).length
}

export function listarIgnoradosDetallado() {
  ensure()
  return [..._jids.values()]
}