import fs from 'fs'
import path from 'path'

const CACHE_PATH = './database/hidetag.json'

const _mem = new Map()
let _dirty = false
let _loaded = false

function ensureDir() {
  const dir = path.dirname(CACHE_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function load() {
  if (_loaded) return
  _loaded = true
  ensureDir()
  try {
    if (!fs.existsSync(CACHE_PATH)) return
    const content = fs.readFileSync(CACHE_PATH, 'utf8').trim()
    if (!content) return
    const raw = JSON.parse(content)
    for (const [groupId, data] of Object.entries(raw)) {
      if (!data || typeof data !== 'object') continue
      _mem.set(groupId, {
        jids: new Set(Array.isArray(data.jids) ? data.jids : []),
        lids: (typeof data.lids === 'object' && data.lids) ? data.lids : {}
      })
    }
  } catch {}
}

function persist() {
  if (!_dirty) return
  try {
    ensureDir()
    const obj = {}
    for (const [groupId, data] of _mem) {
      obj[groupId] = { jids: [...data.jids], lids: data.lids }
    }
    fs.writeFileSync(CACHE_PATH, JSON.stringify(obj, null, 2))
    _dirty = false
  } catch {}
}

setInterval(persist, 15_000)
load()

export function hasGroup(groupId) {
  return _mem.has(groupId)
}

export function getJids(groupId) {
  return [...(_mem.get(groupId)?.jids || [])]
}

export function resolveLidFromCache(groupId, lid) {
  return _mem.get(groupId)?.lids?.[lid] || null
}

export function setGroupData(groupId, participants) {
  const jids = new Set()
  const lids = {}
  for (const p of participants) {
    const id = p.id || p.jid
    if (!id || id.includes('@lid')) continue
    jids.add(id)
    if (p.lid) lids[p.lid] = id
  }
  _mem.set(groupId, { jids, lids })
  _dirty = true
}

export function addParticipant(groupId, jid, lid) {
  if (!jid || jid.includes('@lid')) return
  if (!_mem.has(groupId)) return
  const data = _mem.get(groupId)
  data.jids.add(jid)
  if (lid && !lid.includes('@s.whatsapp.net')) data.lids[lid] = jid
  _dirty = true
}

export function removeParticipant(groupId, jid) {
  if (!jid) return
  const data = _mem.get(groupId)
  if (!data) return
  data.jids.delete(jid)
  for (const [lid, j] of Object.entries(data.lids)) {
    if (j === jid) { delete data.lids[lid]; break }
  }
  _dirty = true
}
