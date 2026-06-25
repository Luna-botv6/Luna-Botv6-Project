import fs from 'fs'
import path from 'path'
import { registerLid, resolveKey as lidResolveKey } from '../lidMap.js'

const USERS_DIR = './database/users'
const CACHE_TTL = 5 * 60 * 1000
const SAVE_DEBOUNCE_MS = 8000
const MIGRATION_FLAG = './database/users/.migrated'

const _cache = new Map()
const _dirty = new Set()
const _timers = new Map()

export function registerLidToJid(lid, jid) {
  registerLid(lid, jid)
}

function resolveKey(key) {
  return lidResolveKey(key)
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
  return encodeURIComponent(jid) + '.json'
}

function filenameToJid(filename) {
  return decodeURIComponent(filename.replace(/\.json$/, ''))
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

async function flushUser(jid) {
  const entry = _cache.get(jid)
  if (!entry) { _dirty.delete(jid); return }
  _dirty.delete(jid)
  _timers.delete(jid)
  try {
    ensureDir()
    const tmp = filePath(jid) + '.tmp'
    await fs.promises.writeFile(tmp, JSON.stringify(entry.data))
    await fs.promises.rename(tmp, filePath(jid))
  } catch (e) {
    console.error('[userManager] Error guardando', jid, e.message)
  }
}
function scheduleFlush(jid) {
  _dirty.add(jid)
  if (_timers.has(jid)) clearTimeout(_timers.get(jid))
  _timers.set(jid, setTimeout(() => flushUser(jid), SAVE_DEBOUNCE_MS))
}

function flushAll() {
  for (const jid of [..._dirty]) flushUser(jid).catch(() => {})
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
  const existing = _cache.get(jid)?.data || readFromDisk(jid) || {}
  const merged = { ...USER_DEFAULTS, ...existing, ...data, lastActivity: Date.now() }
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
      let fromDisk = []
      try { fromDisk = fs.readdirSync(USERS_DIR) } catch { fromDisk = [] }
      const validFromDisk = fromDisk
        .filter(f => f.endsWith('.json') && !f.startsWith('.'))
        .map(f => { try { return filenameToJid(f) } catch { return null } })
        .filter(jid => jid && isValidJidKey(jid))
      const fromCache = Array.from(_cache.keys()).filter(isValidJidKey)
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
