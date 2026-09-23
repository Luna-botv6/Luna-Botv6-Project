import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import chalk from 'chalk'
import { resolveJid } from '../lidMap.js'

const FOLDER = './database'
const FILE = `${FOLDER}/bots-ignorados.json`

if (!existsSync(FOLDER)) mkdirSync(FOLDER, { recursive: true })

export const MARCA_LUNA = '\u200B\u200C\u200D\u2060'

let _jids = null

function esLid(n) {
  return n.startsWith('1608') || n.length >= 15
}

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
    if (!Array.isArray(raw)) return
    let migrado = false
    for (const item of raw) {
      if (!item) continue
      const rawN = typeof item === 'string' ? item : item?.n
      if (typeof rawN !== 'string' || !rawN) continue
      const base = baseDe(rawN)
      if (!base) continue
      if (typeof item === 'string') {
        migrado = true
        const real = resolveJid(base)
        if (real) {
          const pn = real.split('@')[0]
          _jids.set(keyDe(pn, ''), { n: pn, t: Date.now(), src: 'legacy', chat: '' })
          continue
        }
        if (esLid(base)) {
          console.log(chalk.cyan(`[BotsIgnorados] entrada LID vieja sin resolver, limpiada: ${base}`))
          continue
        }
        _jids.set(keyDe(base, ''), { n: base, t: Date.now(), src: 'legacy', chat: '' })
        continue
      }
      const pn = resolveJid(base) ? resolveJid(base).split('@')[0] : base
      const chat = typeof item.chat === 'string' ? item.chat : ''
      const meta = {
        n: pn,
        t: typeof item.t === 'number' ? item.t : Date.now(),
        src: typeof item.src === 'string' ? item.src : 'manual',
        chat
      }
      _jids.set(keyDe(pn, chat), meta)
    }
    if (migrado) {
      save()
      console.log(chalk.cyan(`[BotsIgnorados] lista migrada del formato viejo: ${_jids.size} activos`))
    }
  } catch {}
}

function ensure() {
  if (_jids === null) load()
}

function save() {
  try {
    const arr = [..._jids.values()]
    writeFileSync(FILE, JSON.stringify(arr, null, 2), 'utf8')
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