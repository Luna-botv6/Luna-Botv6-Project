import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'

const FOLDER = './database'
const FILE = `${FOLDER}/bots-ignorados.json`

if (!existsSync(FOLDER)) mkdirSync(FOLDER, { recursive: true })

export const MARCA_LUNA = '\u200B\u200C\u200D\u2060'

let _jids = null

function load() {
  _jids = new Set()
  try {
    if (!existsSync(FILE)) return
    const raw = JSON.parse(readFileSync(FILE, 'utf8'))
    if (!Array.isArray(raw)) return
    for (const j of raw) {
      if (typeof j === 'string' && j) _jids.add(j.split('@')[0].split(':')[0])
    }
  } catch {}
}

function ensure() {
  if (_jids === null) load()
}

function save() {
  try {
    writeFileSync(FILE, JSON.stringify([..._jids], null, 2), 'utf8')
  } catch {}
}

export function esBotIgnorado(jid) {
  if (!jid) return false
  ensure()
  const j = String(jid).split('@')[0].split(':')[0]
  return _jids.has(j)
}

export function agregarBotIgnorado(jid) {
  const j = String(jid || '').split('@')[0].split(':')[0]
  if (!j) return false
  ensure()
  if (_jids.has(j)) return false
  _jids.add(j)
  save()
  return true
}

export function quitarBotIgnorado(jid) {
  const j = String(jid || '').split('@')[0].split(':')[0]
  if (!j) return false
  ensure()
  if (!_jids.delete(j)) return false
  save()
  return true
}

export function listarBotsIgnorados() {
  ensure()
  return [..._jids]
}

export function cantidadBotsIgnorados() {
  ensure()
  return _jids.size
}