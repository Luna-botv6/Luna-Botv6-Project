import fs from 'fs'
import path from 'path'

const LID_MAP_FILE = './database/lid_map.json'
const _map = new Map()
let _loaded = false

function ensureDir() {
  const dir = path.dirname(LID_MAP_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

export function loadLidMap() {
  if (_loaded) return
  _loaded = true
  ensureDir()
  try {
    if (fs.existsSync(LID_MAP_FILE)) {
      const data = JSON.parse(fs.readFileSync(LID_MAP_FILE, 'utf8'))
      for (const [k, v] of Object.entries(data)) {
        if (k && v) _map.set(k, v)
      }
    }
  } catch (e) {
    console.error('[lidMap] Error al cargar lid_map.json:', e.message)
  }
}

export function saveLidMap() {
  try {
    ensureDir()
    const obj = Object.fromEntries(_map)
    const tmp = LID_MAP_FILE + '.tmp'
    fs.writeFileSync(tmp, JSON.stringify(obj, null, 2))
    fs.renameSync(tmp, LID_MAP_FILE)
  } catch (e) {
    console.error('[lidMap] Error al guardar lid_map.json:', e.message)
  }
}

function cleanLid(lid) {
  return lid.toString().replace('@lid', '').replace(/[^0-9]/g, '')
}

function cleanJid(jid) {
  return jid.toString().replace('@s.whatsapp.net', '').replace(/[^0-9]/g, '')
}

export function registerLid(lid, jid) {
  if (!lid || !jid) return false
  const lidClean = cleanLid(lid)
  const jidClean = cleanJid(jid)
  if (!lidClean || !jidClean) return false
  if (_map.get(lidClean) === jidClean) return false
  _map.set(lidClean, jidClean)
  saveLidMap()
  return true
}

export function resolveJid(lid) {
  if (!lid) return null
  const lidClean = cleanLid(lid)
  if (!lidClean) return null
  const real = _map.get(lidClean)
  if (!real) return null
  return real + '@s.whatsapp.net'
}

export function resolveKey(key) {
  if (!key || !key.includes('@lid')) return key
  const resolved = resolveJid(key)
  return resolved || key
}

export function getLidMapRaw() {
  return _map
}

loadLidMap()
