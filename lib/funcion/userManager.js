import fs from 'fs'
import path from 'path'

const USERS_DIR = './database/users'
const CACHE_TTL = 5 * 60 * 1000
const SAVE_DEBOUNCE_MS = 8000
const MIGRATION_FLAG = './database/users/.migrated'

const _cache = new Map()
const _dirty = new Set()
const _timers = new Map()
const _lidMap = new Map()

export function registerLidToJid(lid, jid) {
  if (!lid || !jid) return
  const lidClean = lid.toString().replace('@lid', '').replace(/[^0-9]/g, '')
  const jidClean = jid.toString().replace('@s.whatsapp.net', '').replace(/[^0-9]/g, '')
  if (!lidClean || !jidClean) return
  _lidMap.set(lidClean, jidClean)
}

function resolveKey(key) {
  if (!key || !key.includes('@lid')) return key
  const clean = key.replace('@lid', '').replace(/[^0-9]/g, '')
  const real = _lidMap.get(clean)
  return real ? real + '@s.whatsapp.net' : key
}

function isValidJidKey(jid) {
  if (typeof jid !== 'string') return false
  if (jid.startsWith('__')) return false
  if (jid === 'toJSON' || jid === 'then' || jid === 'constructor') return false
  if (!jid.includes('@')) return false
  if (jid.includes('@newsletter') || jid.includes('@bot')) return false
  return true
}

const USER_DEFAULTS = {
  wait: 0,
  banned: false,
  BannedReason: '',
  Banneduser: false,
  premium: false,
  premiumTime: 0,
  registered: false,
  sewa: false,
  skill: '',
  language: 'es',
  lastActivity: 0
}

function ensureDir() {
  if (!fs.existsSync(USERS_DIR)) fs.mkdirSync(USERS_DIR, { recursive: true })
}

function jidToFilename(jid) {
  return jid.replace(/[^a-zA-Z0-9@._-]/g, '_') + '.json'
}

function filePath(jid) {
  return path.join(USERS_DIR, jidToFilename(jid))
}

function readFromDisk(jid) {
  try {
    const fp = filePath(jid)
    if (!fs.existsSync(fp)) return null
    return JSON.parse(fs.readFileSync(fp, 'utf8'))
  } catch {
    return null
  }
}

function flushUser(jid) {
  const entry = _cache.get(jid)
  if (!entry) { _dirty.delete(jid); return }
  _dirty.delete(jid)
  _timers.delete(jid)
  const tmp = filePath(jid) + '.tmp'
  fs.writeFile(tmp, JSON.stringify(entry.data), (err) => {
    if (err) { console.error('[userManager] Error guardando', jid, err.message); return }
    fs.rename(tmp, filePath(jid), (err2) => {
      if (err2) console.error('[userManager] Error renombrando', jid, err2.message)
    })
  })
}

function scheduleFlush(jid) {
  _dirty.add(jid)
  if (_timers.has(jid)) clearTimeout(_timers.get(jid))
  _timers.set(jid, setTimeout(() => flushUser(jid), SAVE_DEBOUNCE_MS))
}

function flushAll() {
  for (const jid of _dirty) flushUser(jid)
}

process.on('exit', flushAll)
process.on('SIGINT', () => { flushAll(); process.exit() })
process.on('SIGTERM', () => { flushAll(); process.exit() })

function wrapUserProxy(jid, data) {
  return new Proxy(data, {
    set(target, key, value) {
      target[key] = value
      scheduleFlush(jid)
      return true
    },
    deleteProperty(target, key) {
      delete target[key]
      scheduleFlush(jid)
      return true
    }
  })
}

function getUser(jid) {
  jid = resolveKey(jid)
  const cached = _cache.get(jid)
  if (cached) {
    cached.ts = Date.now()
    return wrapUserProxy(jid, cached.data)
  }
  const fromDisk = readFromDisk(jid)
  const data = { ...USER_DEFAULTS, ...(fromDisk || {}) }
  _cache.set(jid, { data, ts: Date.now() })
  return wrapUserProxy(jid, data)
}

function setUser(jid, data) {
  jid = resolveKey(jid)
  const existing = getUser(jid)
  const merged = { ...existing, ...data, lastActivity: Date.now() }
  _cache.set(jid, { data: merged, ts: Date.now() })
  scheduleFlush(jid)
  return merged
}

function hasUser(jid) {
  jid = resolveKey(jid)
  if (_cache.has(jid)) return true
  return fs.existsSync(filePath(jid))
}

function deleteUser(jid) {
  jid = resolveKey(jid)
  _cache.delete(jid)
  _dirty.delete(jid)
  if (_timers.has(jid)) { clearTimeout(_timers.get(jid)); _timers.delete(jid) }
  try { fs.unlinkSync(filePath(jid)) } catch {}
}

function evictStaleCache() {
  const now = Date.now()
  for (const [jid, entry] of _cache.entries()) {
    if (!_dirty.has(jid) && (now - entry.ts) > CACHE_TTL) {
      _cache.delete(jid)
    }
  }
}

setInterval(evictStaleCache, 60 * 1000)

export function migrateFromLowdb(lowdbUsers) {
  if (!lowdbUsers || typeof lowdbUsers !== 'object') return
  if (fs.existsSync(MIGRATION_FLAG)) return
  ensureDir()
  let count = 0
  for (const [jid, data] of Object.entries(lowdbUsers)) {
    if (!isValidJidKey(jid) || typeof data !== 'object') continue
    const merged = { ...USER_DEFAULTS, ...data, lastActivity: data.lastActivity || Date.now() }
    _cache.set(jid, { data: merged, ts: Date.now() })
    const fp = filePath(jid)
    if (!fs.existsSync(fp)) {
      try {
        fs.writeFileSync(fp, JSON.stringify(merged))
        count++
      } catch {}
    }
  }
  try { fs.writeFileSync(MIGRATION_FLAG, Date.now().toString()) } catch {}
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
      const fromDisk = fs.readdirSync(USERS_DIR)
        .filter(f => f.endsWith('.json') && !f.startsWith('.'))
        .map(f => f.replace('.json', '').replace(/_/g, (m, o, s) => {
          return s[o] === '_' ? '@' : m
        }))
        .filter(isValidJidKey)
      const fromCache = Array.from(_cache.keys()).filter(isValidJidKey)
      return [...new Set([...fromDisk, ...fromCache])]
    },
    getOwnPropertyDescriptor(_, jid) {
      if (!isValidJidKey(jid)) return undefined
      if (hasUser(jid)) return { configurable: true, enumerable: true, writable: true }
      return undefined
    }
  })
}

export { getUser, setUser, hasUser, deleteUser, flushAll }
