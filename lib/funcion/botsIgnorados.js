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
      const base = rawN.split('@')[0].split(':')[0]
      if (!base) continue
      if (typeof item === 'string') {
        migrado = true
        const real = resolveJid(base)
        if (real) {
          const pn = real.split('@')[0]
          _jids.set(pn, { t: Date.now(), src: 'legacy' })
          continue
        }
        if (esLid(base)) {
          console.log(chalk.cyan(`[BotsIgnorados] entrada LID vieja sin resolver, limpiada: ${base}`))
          continue
        }
        _jids.set(base, { t: Date.now(), src: 'legacy' })
        continue
      }
      const meta = {
        t: typeof item.t === 'number' ? item.t : Date.now(),
        src: typeof item.src === 'string' ? item.src : 'manual'
      }
      _jids.set(base, meta)
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
    const arr = []
    for (const [n, meta] of _jids.entries()) {
      arr.push({ n, t: meta.t, src: meta.src || 'manual' })
    }
    writeFileSync(FILE, JSON.stringify(arr, null, 2), 'utf8')
  } catch {}
}

export function esBotIgnorado(jid) {
  if (!jid) return false
  ensure()
  const j = String(jid).split('@')[0].split(':')[0]
  return _jids.has(j)
}

export function agregarBotIgnorado(jid, src = 'manual') {
  const j = String(jid || '').split('@')[0].split(':')[0]
  if (!j) return false
  ensure()
  const real = resolveJid(j)
  const n = real ? real.split('@')[0] : j
  if (_jids.has(n)) return false
  _jids.set(n, { t: Date.now(), src })
  save()
  return true
}

export function quitarBotIgnorado(jid) {
  const j = String(jid || '').split('@')[0].split(':')[0]
  if (!j) return false
  ensure()
  const real = resolveJid(j)
  const n = real ? real.split('@')[0] : j
  if (!_jids.delete(n)) return false
  save()
  return true
}

export function listarBotsIgnorados() {
  ensure()
  return [..._jids.keys()]
}

export function cantidadBotsIgnorados() {
  ensure()
  return _jids.size
}