import fs from 'fs'
import path from 'path'
import { registerLid, resolveKey as lidResolveKey } from '../lidMap.js'
import { idSubbotActual } from './db-scope.js'

const USERS_DIR = './database/users'
const CACHE_TTL = 5 * 60 * 1000
const SAVE_DEBOUNCE_MS = 8000
const MIGRATION_FLAG = './database/users/.migrated'
const SEP = '\x00'

const _cache = new Map()
const _dirty = new Set()
const _timers = new Map()

export function registerLidToJid(lid, jid) {
  registerLid(lid, jid)
}

function resolveKey(key) {
  return lidResolveKey(key)
}

function dirDeUsuarios(id) {
  return id ? path.join('./sub-lunabot/', id, 'users') : USERS_DIR
}

function banderaMigracion(id) {
  return id ? path.join('./sub-lunabot/', id, 'users', '.migrated') : MIGRATION_FLAG
}

function partir(claveCompuesta) {
  const i = claveCompuesta.indexOf(SEP)
  if (i < 0) return { id: null, jid: claveCompuesta }
  return { id: claveCompuesta.slice(0, i), jid: claveCompuesta.slice(i + 1) }
}

function clave(jid) {
  const id = idSubbotActual()
  return id ? id + SEP + jid : jid
}

function isValidJidKey(jid) {
  if (typeof jid !== 'string') return false
  if (jid.startsWith('__')) return false
  if (jid === 'toJSON' || jid === 'then' || jid === 'constructor') return false
  if (!jid.includes('@')) return false
  if (jid.includes('@newsletter') || jid.includes('@bot')) return false
  return true
}

export const USER_DEFAULTS = {
  wait: 0,
  banned: false,
  BannedReason: '',
  Banneduser: false,
  premium: false,
  premiumTime: 0,
  registered: false,
  sewa: false,
  skill: '',
  language: '',
  lastActivity: 0
}

function ensureDir() {
  const dir = dirDeUsuarios(idSubbotActual())
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function jidToFilename(jid) {
  return encodeURIComponent(jid) + '.json'
}

function filenameToJid(filename) {
  return decodeURIComponent(filename.replace(/\.json$/, ''))
}

function filePath(claveCompuesta) {
  const { id, jid } = partir(claveCompuesta)
  return path.join(dirDeUsuarios(id), jidToFilename(jid))
}

function readFromDisk(claveCompuesta) {
  try {
    const fp = filePath(claveCompuesta)
    if (!fs.existsSync(fp)) return null
    return JSON.parse(fs.readFileSync(fp, 'utf8'))
  } catch {
    return null
  }
}

async function flushUser(claveCompuesta) {
  const entry = _cache.get(claveCompuesta)
  if (!entry) { _dirty.delete(claveCompuesta); return }
  try {
    ensureDir()
    const tmp = filePath(claveCompuesta) + '.tmp'
    await fs.promises.writeFile(tmp, JSON.stringify(entry.data))
    await fs.promises.rename(tmp, filePath(claveCompuesta))
  } catch (e) {
    console.error('[userManager] Error guardando', claveCompuesta, e.message)
    return
  }
  _dirty.delete(claveCompuesta)
  _timers.delete(claveCompuesta)
}
function scheduleFlush(claveCompuesta, data) {
  if (data !== undefined) {
    const existing = _cache.get(claveCompuesta)
    if (existing) {
      if (existing.data !== data) {
        for (const [k, v] of Object.entries(data)) existing.data[k] = v
      }
    } else {
      _cache.set(claveCompuesta, { data, ts: Date.now() })
    }
  }
  _dirty.add(claveCompuesta)
  if (_timers.has(claveCompuesta)) clearTimeout(_timers.get(claveCompuesta))
  _timers.set(claveCompuesta, setTimeout(() => flushUser(claveCompuesta), SAVE_DEBOUNCE_MS))
}

function writeUserSync(claveCompuesta) {
  const entry = _cache.get(claveCompuesta)
  if (!entry) { _dirty.delete(claveCompuesta); return }
  try {
    ensureDir()
    const tmp = filePath(claveCompuesta) + '.tmp'
    fs.writeFileSync(tmp, JSON.stringify(entry.data))
    fs.renameSync(tmp, filePath(claveCompuesta))
  } catch (e) {
    console.error('[userManager] Error guardando', claveCompuesta, e.message)
    return
  }
  _dirty.delete(claveCompuesta)
  _timers.delete(claveCompuesta)
}
function flushAll() {
  for (const k of [..._dirty]) writeUserSync(k)
}
process.on('exit', flushAll)
process.on('SIGINT', () => { flushAll(); process.exit() })
process.on('SIGTERM', () => { flushAll(); process.exit() })

function normalizeUserData(data) {
  const g = global.defaultLenguaje || 'es';
  if (!data.language) data.language = g;
  return data;
}

function wrapUserProxy(claveCompuesta, data) {
  return new Proxy(data, {
    set(target, key, value) {
      target[key] = value
      scheduleFlush(claveCompuesta, target)
      return true
    },
    deleteProperty(target, key) {
      delete target[key]
      scheduleFlush(claveCompuesta, target)
      return true
    }
  })
}

function getUser(jid) {
  jid = clave(resolveKey(jid))
  const cached = _cache.get(jid)
  if (cached) {
    cached.ts = Date.now()
    return wrapUserProxy(jid, normalizeUserData(cached.data))
  }
  const fromDisk = readFromDisk(jid)
  const data = normalizeUserData({ ...USER_DEFAULTS, ...(fromDisk || {}) })
  _cache.set(jid, { data, ts: Date.now() })
  return wrapUserProxy(jid, data)
}

function setUser(jid, data) {
  jid = clave(resolveKey(jid))
  const existing = _cache.get(jid)?.data || readFromDisk(jid) || {}
  const merged = normalizeUserData({ ...USER_DEFAULTS, ...existing, ...data, lastActivity: Date.now() })
  _cache.set(jid, { data: merged, ts: Date.now() })
  scheduleFlush(jid)
  return merged
}

function hasUser(jid) {
  jid = clave(resolveKey(jid))
  if (_cache.has(jid)) return true
  return fs.existsSync(filePath(jid))
}

function deleteUser(jid) {
  jid = clave(resolveKey(jid))
  _cache.delete(jid)
  _dirty.delete(jid)
  if (_timers.has(jid)) { clearTimeout(_timers.get(jid)); _timers.delete(jid) }
  try { fs.unlinkSync(filePath(jid)) } catch {}
}

function evictStaleCache() {
  const now = Date.now()
  for (const [k, entry] of _cache.entries()) {
    if (!_dirty.has(k) && (now - entry.ts) > CACHE_TTL) {
      _cache.delete(k)
    }
  }
}

setInterval(evictStaleCache, 60 * 1000)

export function migrateFromLowdb(lowdbUsers) {
  if (idSubbotActual()) return
  if (!lowdbUsers || typeof lowdbUsers !== 'object') return
  if (fs.existsSync(banderaMigracion(null))) return
  ensureDir()
  let count = 0
  for (const [jid, data] of Object.entries(lowdbUsers)) {
    if (!isValidJidKey(jid) || typeof data !== 'object') continue
    const merged = normalizeUserData({ ...USER_DEFAULTS, ...data, lastActivity: data.lastActivity || Date.now() })
    _cache.set(jid, { data: merged, ts: Date.now() })
    const fp = filePath(jid)
    if (!fs.existsSync(fp)) {
      try {
        fs.writeFileSync(fp, JSON.stringify(merged))
        count++
      } catch {}
    }
  }
  try { fs.writeFileSync(banderaMigracion(null), Date.now().toString()) } catch {}
  console.log(`[userManager] Migración completada: ${count} usuarios`)
}

export function createUsersProxy() {
  ensureDir()
  return new Proxy({}, {
    get(_, jid) {
      if (!isValidJidKey(jid)) return undefined
      return getUser(resolveKey(jid))
    },
    set(_, jid, value) {
      if (!isValidJidKey(jid)) return true
      setUser(resolveKey(jid), value)
      return true
    },
    has(_, jid) {
      if (!isValidJidKey(jid)) return false
      return hasUser(resolveKey(jid))
    },
    deleteProperty(_, jid) {
      if (!isValidJidKey(jid)) return true
      deleteUser(resolveKey(jid))
      return true
    },
    ownKeys() {
      ensureDir()
      const id = idSubbotActual()
      let fromDisk = []
      try { fromDisk = fs.readdirSync(dirDeUsuarios(id)) } catch { fromDisk = [] }
      const validFromDisk = fromDisk
        .filter(f => f.endsWith('.json') && !f.startsWith('.'))
        .map(f => { try { return filenameToJid(f) } catch { return null } })
        .filter(jid => jid && isValidJidKey(jid))
      const pref = id ? id + SEP : null
      const fromCache = Array.from(_cache.keys())
        .filter(k => pref ? k.startsWith(pref) : !k.includes(SEP))
        .map(k => pref ? k.slice(pref.length) : k)
        .filter(isValidJidKey)
      return [...new Set([...validFromDisk, ...fromCache])]
    },
    getOwnPropertyDescriptor(_, jid) {
      if (!isValidJidKey(jid)) return undefined
      if (hasUser(jid)) return { configurable: true, enumerable: true, writable: true }
      return undefined
    }
  })
}

export { getUser, setUser, hasUser, deleteUser, flushAll }
