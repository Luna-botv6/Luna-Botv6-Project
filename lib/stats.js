import fs from 'fs'
import path from 'path'
import { canLevelUp, xpRange } from '../lib/levelling.js'
import { registerLid, resolveKey as lidResolveKey, resolveJid } from './lidMap.js'

const dir = './database'
const file = path.join(dir, 'stats.json')

let db = {}
let _savePending = false
let _saveTimer = null
const SAVE_DEBOUNCE_MS = 8000

function ensureDB() {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(file)) fs.writeFileSync(file, '{}')
}

function loadStats() {
  ensureDB()
  try {
    const data = fs.readFileSync(file, 'utf8')
    db = JSON.parse(data)
  } catch (e) {
    console.error('[stats] Error al cargar stats.json:', e.message)
    db = {}
  }
}

function saveStats(force = false) {
  _savePending = true
  if (_saveTimer) clearTimeout(_saveTimer)
  if (force) {
    _flushStats()
    return
  }
  _saveTimer = setTimeout(_flushStats, SAVE_DEBOUNCE_MS)
}

function _flushStats() {
  if (!_savePending) return
  _savePending = false
  _saveTimer = null
  try {
    ensureDB()
    const tmp = file + '.tmp'
    fs.writeFileSync(tmp, JSON.stringify(db))
    fs.renameSync(tmp, file)
  } catch (e) {
    console.error('[stats] Error al guardar stats.json:', e.message)
  }
}

process.on('exit', () => { if (_savePending) _flushStats() })
process.on('SIGINT', () => { if (_savePending) _flushStats(); process.exit() })
process.on('SIGTERM', () => { if (_savePending) _flushStats(); process.exit() })

loadStats()

function normalizeId(id) {
  if (!id) return null
  let normalized = id.toString().trim()
  const isLid = normalized.includes('@lid')
  normalized = normalized.replace('@s.whatsapp.net', '').replace('@lid', '').replace(/[^0-9]/g, '')
  if (!normalized) return null
  if (isLid) {
    const resolved = resolveJid(normalized)
    if (resolved) return resolved.replace('@s.whatsapp.net', '')
  }
  return normalized
}

function migrateLidInDB(lidKey, realKey) {
  if (!db[lidKey]) return
  if (db[realKey]) {
    db[realKey].exp = (db[realKey].exp || 0) + (db[lidKey].exp || 0)
    db[realKey].money = (db[realKey].money || 0) + (db[lidKey].money || 0)
    db[realKey].lunaCoins = (db[realKey].lunaCoins || 0) + (db[lidKey].lunaCoins || 0)
    db[realKey].mysticcoins = (db[realKey].mysticcoins || 0) + (db[lidKey].mysticcoins || 0)
    db[realKey].joincount = (db[realKey].joincount || 0) + (db[lidKey].joincount || 0)
    if ((db[lidKey].level || 0) > (db[realKey].level || 0)) {
      db[realKey].level = db[lidKey].level
      db[realKey].role = db[lidKey].role
    }
  } else {
    db[realKey] = { ...db[lidKey] }
  }
  delete db[lidKey]
  saveStats(true)
}

export function registerLidMapping(lid, realJid) {
  if (!lid || !realJid) return
  const changed = registerLid(lid, realJid)
  if (!changed) return
  const lidClean = lid.toString().replace('@lid', '').replace(/[^0-9]/g, '')
  const realClean = realJid.toString().replace('@s.whatsapp.net', '').replace(/[^0-9]/g, '')
  if (lidClean && realClean) migrateLidInDB(lidClean, realClean)
}

const DEFAULT_USER = () => ({
  exp: 0, level: 0, money: 0, joincount: 0,
  premiumTime: 0, mysticcoins: 0, lunaCoins: 0,
  role: getRoleByLevel(0), limit: 10,
  // RPG fields
  gender: 'indefinido',
  characterClass: 'civil',
  hp: 100,
  maxHp: 100,
  armor: { type: 'ninguna', defense: 0, durability: 0, maxDurability: 0 },
  bountyStars: 0,
  bountyFine: 0,
  wantedReason: '',
  isCaptured: false,
  rescueRequest: { active: false, helper: null, penalty: 0 },
  vigilanteActive: false,
  lastCrime: 0,
  crimeCooldown: 0,
  runAttempts: 0,
  protectActive: false,
  protectExpires: 0,
  escapeChance: 0,
  deathCount: 0,
  lastBattle: 0,
  hackTools: 0,
  // Hunter system
  hunterTracking: {
    gainExp: 0,
    gainMoney: 0,
    windowStart: 0,
    hunterActive: false,
    hunterSince: 0,
    escapedAt: 0,
    capturedByHunter: false,
    escapeAttempts: 0
  },
  // Inventory
  inventory: {
    totem: 0,
    pocion_menor: 0,
    pocion_media: 0,
    pocion_mayor: 0,
    carne_asada: 0,
    elixir_del_bosque: 0,
    festin_real: 0
  },
  // Active buffs [{ type, expiresAt, value }]
  activeBuffs: [],
  // Death system
  deathPenaltyActive: false,
  savedProgress: null,
  npcState: {}
})

export function getUserStats(id) {
  const normalizedId = normalizeId(id)
  if (!normalizedId) return DEFAULT_USER()

  if (!db[normalizedId]) {
    db[normalizedId] = DEFAULT_USER()
    saveStats()
    return db[normalizedId]
  }

  const u = db[normalizedId]
  if (u.role === undefined) u.role = getRoleByLevel(u.level ?? 0)
  if (u.limit === undefined) u.limit = 10
  if (u.premiumTime === undefined) u.premiumTime = 0
  if (u.mysticcoins === undefined) u.mysticcoins = 0
  if (u.lunaCoins === undefined) u.lunaCoins = 0
  if (u.joincount === undefined) u.joincount = 0
  if (u.money === undefined) u.money = 0
  if (u.exp === undefined) u.exp = 0
  if (u.level === undefined) u.level = 0
  // Ensure RPG defaults
  if (u.gender === undefined) u.gender = 'indefinido'
  if (u.characterClass === undefined) u.characterClass = 'civil'
  if (u.hp === undefined) u.hp = 100
  if (u.maxHp === undefined) u.maxHp = 100
  if (u.armor === undefined) u.armor = { type: 'ninguna', defense: 0, durability: 0, maxDurability: 0 }
  if (u.bountyStars === undefined) u.bountyStars = 0
  if (u.bountyFine === undefined) u.bountyFine = 0
  if (u.wantedReason === undefined) u.wantedReason = ''
  if (u.isCaptured === undefined) u.isCaptured = false
  if (u.rescueRequest === undefined) u.rescueRequest = { active: false, helper: null, penalty: 0 }
  if (u.vigilanteActive === undefined) u.vigilanteActive = false
  if (u.lastCrime === undefined) u.lastCrime = 0
  if (u.crimeCooldown === undefined) u.crimeCooldown = 0
  if (u.runAttempts === undefined) u.runAttempts = 0
  if (u.protectActive === undefined) u.protectActive = false
  if (u.protectExpires === undefined) u.protectExpires = 0
  if (u.escapeChance === undefined) u.escapeChance = 0
  if (u.deathCount === undefined) u.deathCount = 0
  if (u.lastBattle === undefined) u.lastBattle = 0
  if (u.hackTools === undefined) u.hackTools = 0
  // Hunter system defaults
  if (u.hunterTracking === undefined) u.hunterTracking = {
    gainExp: 0, gainMoney: 0, windowStart: 0,
    hunterActive: false, hunterSince: 0, escapedAt: 0,
    capturedByHunter: false, escapeAttempts: 0
  }
  if (u.hunterTracking.capturedByHunter === undefined) u.hunterTracking.capturedByHunter = false
  if (u.hunterTracking.escapeAttempts === undefined) u.hunterTracking.escapeAttempts = 0
  // Inventory defaults
  if (u.inventory === undefined) u.inventory = {
    totem: 0, pocion_menor: 0, pocion_media: 0, pocion_mayor: 0,
    carne_asada: 0, elixir_del_bosque: 0, festin_real: 0
  }
  if (!Array.isArray(u.activeBuffs)) u.activeBuffs = []
  if (u.deathPenaltyActive === undefined) u.deathPenaltyActive = false
  if (u.savedProgress === undefined) u.savedProgress = null
  if (u.npcState === undefined) u.npcState = {}

  return u
}

export function setUserStats(id, data) {
  const normalizedId = normalizeId(id)
  if (!normalizedId) {
    console.warn('[stats] No se puede establecer stats con ID inválido:', id)
    return
  }
  db[normalizedId] = { ...getUserStats(id), ...data }
  saveStats()
}

export function addExp(id, amount) {
  const user = getUserStats(id)
  if (!user) return
  user.exp += amount
  while (canLevelUp(user.level, user.exp)) {
    const { max } = xpRange(user.level)
    if (user.exp >= max) {
      user.level += 1
      user.exp -= max
      user.role = getRoleByLevel(user.level)
    } else break
  }
  setUserStats(id, user)
}

export function removeExp(id, amount) {
  const user = getUserStats(id)
  if (!user) return
  user.exp = Math.max(0, user.exp - amount)
  setUserStats(id, user)
}

export function getExp(id) {
  return getUserStats(id)?.exp || 0
}

export function addMoney(id, amount) {
  const user = getUserStats(id)
  if (!user) return
  user.money += amount
  setUserStats(id, user)
}

export function addLunaCoins(id, amount) {
  const user = getUserStats(id)
  if (!user) return
  user.lunaCoins += amount
  setUserStats(id, user)
}

export function getMoney(id) {
  return getUserStats(id)?.money || 0
}

export function removeMoney(id, amount) {
  const user = getUserStats(id)
  if (!user) return
  user.money = Math.max(0, user.money - amount)
  setUserStats(id, user)
}

export function spendExp(id, amount) { removeExp(id, amount) }
export function spendMoney(id, amount) { removeMoney(id, amount) }

export function getLunaCoins(id) {
  return getUserStats(id)?.lunaCoins || 0
}

export function removeLunaCoins(id, amount) {
  const user = getUserStats(id)
  if (!user) return
  user.lunaCoins = Math.max(0, user.lunaCoins - amount)
  setUserStats(id, user)
}

export function spendLunaCoins(id, amount) { removeLunaCoins(id, amount) }

export function getRoleByLevel(level) {
  if (level >= 500) return '🌌 Dios Cósmico'
  if (level >= 400) return '⭐ Entidad Suprema'
  if (level >= 300) return '🌟 Ser Celestial'
  if (level >= 200) return '👑 Emperador Divino'
  if (level >= 150) return '🔱 Titán'
  if (level >= 120) return '⚡ Semidiós'
  if (level >= 100) return '🏆 Campeón Supremo'
  if (level >= 80) return '🦅 Fénix'
  if (level >= 70) return '🐉 Dragón'
  if (level >= 60) return '👹 Demonio'
  if (level >= 50) return '💎 Leyenda'
  if (level >= 30) return '🔥 Maestro'
  if (level >= 20) return '⚔️ Épico'
  if (level >= 10) return '🏅 Avanzado'
  if (level >= 5) return '📘 Intermedio'
  return '🧰 Novato'
}

export function getLevel(id) {
  return getUserStats(id)?.level || 0
}

export function addMysticCoins(id, amount) {
  const user = getUserStats(id)
  if (!user) return
  user.mysticcoins += amount
  setUserStats(id, user)
}

export function getMysticCoins(id) {
  return getUserStats(id)?.mysticcoins || 0
}

export function removeMysticCoins(id, amount) {
  const user = getUserStats(id)
  if (!user) return
  user.mysticcoins = Math.max(0, user.mysticcoins - amount)
  setUserStats(id, user)
}

export function spendMysticCoins(id, amount) { removeMysticCoins(id, amount) }

export function addJoinCount(id, amount = 1) {
  const user = getUserStats(id)
  if (!user) return
  user.joincount += amount
  setUserStats(id, user)
}

export function getJoinCount(id) {
  return getUserStats(id)?.joincount || 0
}

// --- RPG helper functions ---
export function getPlayerState(id) {
  return getUserStats(id)
}

export function setPlayerState(id, data) {
  return setUserStats(id, data)
}

export function addHp(id, amount) {
  const u = getUserStats(id)
  if (!u) return
  u.hp = Math.min(u.maxHp || 100, (u.hp || 0) + amount)
  setUserStats(id, u)
  return u.hp
}

export function removeHp(id, amount) {
  const u = getUserStats(id)
  if (!u) return
  u.hp = Math.max(0, (u.hp || 0) - amount)
  setUserStats(id, u)
  return u.hp
}

export function healHp(id, amount) { return addHp(id, amount) }

export function setArmor(id, armorData) {
  const u = getUserStats(id)
  if (!u) return
  u.armor = { ...u.armor, ...armorData }
  setUserStats(id, u)
}

export function damageArmor(id, amount) {
  const u = getUserStats(id)
  if (!u) return
  u.armor = u.armor || { type: 'ninguna', defense: 0, durability: 0, maxDurability: 0 }
  u.armor.durability = Math.max(0, (u.armor.durability || 0) - amount)
  if (u.armor.durability === 0) {
    u.armor.type = 'ninguna'
    u.armor.defense = 0
  }
  setUserStats(id, u)
  return u.armor.durability
}

export function breakArmor(id) {
  const u = getUserStats(id)
  if (!u) return
  u.armor = { type: 'ninguna', defense: 0, durability: 0, maxDurability: 0 }
  setUserStats(id, u)
}

export function getArmorStats(id) {
  return getUserStats(id)?.armor || { type: 'ninguna', defense: 0, durability: 0, maxDurability: 0 }
}

export function hasArmor(id) {
  const a = getArmorStats(id)
  return a && a.type && a.type !== 'ninguna' && (a.durability || 0) > 0
}

export function setBounty(id, stars, fine, reason) {
  const u = getUserStats(id)
  if (!u) return
  u.bountyStars = Math.min(5, Math.max(0, stars || 0))
  u.bountyFine = fine || 0
  u.wantedReason = reason || ''
  setUserStats(id, u)
}

export function increaseBounty(id, amountStars, amountFine, reason) {
  const u = getUserStats(id)
  if (!u) return
  u.bountyStars = Math.min(5, (u.bountyStars || 0) + (amountStars || 0))
  u.bountyFine = (u.bountyFine || 0) + (amountFine || 0)
  if (reason) u.wantedReason = reason
  setUserStats(id, u)
}

export function clearBounty(id) {
  const u = getUserStats(id)
  if (!u) return
  u.bountyStars = 0
  u.bountyFine = 0
  u.wantedReason = ''
  setUserStats(id, u)
}

export function capturePlayer(id, reason) {
  const u = getUserStats(id)
  if (!u) return
  u.isCaptured = true
  if (reason) u.wantedReason = reason
  setUserStats(id, u)
}

export function releasePlayer(id) {
  const u = getUserStats(id)
  if (!u) return
  u.isCaptured = false
  u.rescueRequest = { active: false, helper: null, penalty: 0 }
  setUserStats(id, u)
}

export function requestRescue(id, helperId) {
  const u = getUserStats(id)
  if (!u) return
  u.rescueRequest = { active: true, helper: helperId, penalty: u.bountyFine || 0 }
  setUserStats(id, u)
}

export function payFine(id) {
  const u = getUserStats(id)
  if (!u) return false
  const fine = u.bountyFine || 0
  if (fine <= 0) return false
  if (u.hunterTracking?.capturedByHunter) return false
  u.money = Math.max(0, (u.money || 0) - fine)
  u.isCaptured = false
  u.rescueRequest = { active: false, helper: null, penalty: 0 }
  clearBounty(id)
  setUserStats(id, u)
  return true
}

export function isPlayerCaptured(id) { return !!getUserStats(id)?.isCaptured }

export function applyDeathPenalty(id) {
  const u = getUserStats(id)
  if (!u) return null
  const hasTotem = (u.inventory?.totem || 0) > 0
  let lostExp, lostMoney, totemUsed = false

  if (hasTotem) {
    // Tótem: pérdida reducida al 25%, armadura igual se pierde
    lostExp = Math.floor((u.exp || 0) * 0.25)
    lostMoney = Math.floor((u.money || 0) * 0.25)
    u.inventory.totem = Math.max(0, u.inventory.totem - 1)
    totemUsed = true
  } else {
    // Muerte total: pérdida del 50%
    lostExp = Math.floor((u.exp || 0) * 0.5)
    lostMoney = Math.floor((u.money || 0) * 0.5)
  }

  u.exp = Math.max(0, (u.exp || 0) - lostExp)
  u.money = Math.max(0, (u.money || 0) - lostMoney)
  u.hp = u.maxHp || 100
  u.armor = { type: 'ninguna', defense: 0, durability: 0, maxDurability: 0 }
  u.deathCount = (u.deathCount || 0) + 1
  u.deathPenaltyActive = !totemUsed
  setUserStats(id, u)
  return { lostExp, lostMoney, totemUsed }
}

export function getCharacterSummary(id) {
  const u = getUserStats(id)
  if (!u) return null
  return {
    id,
    level: u.level,
    exp: u.exp,
    hp: u.hp,
    maxHp: u.maxHp,
    armor: u.armor,
    bountyStars: u.bountyStars,
    bountyFine: u.bountyFine,
    isCaptured: u.isCaptured
  }
}

// --- Inventory helpers ---
export function getInventory(id) {
  return getUserStats(id)?.inventory || {}
}

export function addItem(id, item, amount = 1) {
  const u = getUserStats(id)
  if (!u) return
  if (!u.inventory) u.inventory = {}
  u.inventory[item] = (u.inventory[item] || 0) + amount
  setUserStats(id, u)
}

export function removeItem(id, item, amount = 1) {
  const u = getUserStats(id)
  if (!u) return false
  if (!u.inventory) return false
  if ((u.inventory[item] || 0) < amount) return false
  u.inventory[item] = Math.max(0, u.inventory[item] - amount)
  setUserStats(id, u)
  return true
}

export function hasItem(id, item, amount = 1) {
  return (getUserStats(id)?.inventory?.[item] || 0) >= amount
}

// --- Buff helpers ---
export function addBuff(id, type, value, durationMs) {
  const u = getUserStats(id)
  if (!u) return
  if (!Array.isArray(u.activeBuffs)) u.activeBuffs = []
  u.activeBuffs = u.activeBuffs.filter(b => b.type !== type)
  u.activeBuffs.push({ type, value, expiresAt: Date.now() + durationMs })
  setUserStats(id, u)
}

export function getActiveBuff(id, type) {
  const u = getUserStats(id)
  if (!u || !Array.isArray(u.activeBuffs)) return null
  const buff = u.activeBuffs.find(b => b.type === type && b.expiresAt > Date.now())
  return buff || null
}

export function cleanExpiredBuffs(id) {
  const u = getUserStats(id)
  if (!u || !Array.isArray(u.activeBuffs)) return
  u.activeBuffs = u.activeBuffs.filter(b => b.expiresAt > Date.now())
  setUserStats(id, u)
}

// --- Hunter helpers ---
export function getHunterTracking(id) {
  return getUserStats(id)?.hunterTracking || {}
}

export function trackGain(id, expGained = 0, moneyGained = 0) {
  const u = getUserStats(id)
  if (!u) return
  if (!u.hunterTracking) u.hunterTracking = {
    gainExp: 0, gainMoney: 0, windowStart: 0,
    hunterActive: false, hunterSince: 0, escapedAt: 0,
    capturedByHunter: false, escapeAttempts: 0
  }
  const h = u.hunterTracking
  const WINDOW_MS = 30 * 60 * 1000
  const now = Date.now()
  if (!h.windowStart || (now - h.windowStart) > WINDOW_MS) {
    h.gainExp = 0
    h.gainMoney = 0
    h.windowStart = now
  }
  h.gainExp += expGained
  h.gainMoney += moneyGained
  setUserStats(id, u)
  return { gainExp: h.gainExp, gainMoney: h.gainMoney }
}

export function setHunterActive(id, active) {
  const u = getUserStats(id)
  if (!u) return
  if (!u.hunterTracking) u.hunterTracking = {}
  u.hunterTracking.hunterActive = active
  if (active) u.hunterTracking.hunterSince = Date.now()
  setUserStats(id, u)
}

export function capturedByHunter(id) {
  const u = getUserStats(id)
  if (!u) return
  u.isCaptured = true
  if (!u.hunterTracking) u.hunterTracking = {}
  u.hunterTracking.capturedByHunter = true
  u.hunterTracking.hunterActive = false
  u.wantedReason = 'Capturado por el Cazador'
  setUserStats(id, u)
}

export function releaseFromHunter(id) {
  const u = getUserStats(id)
  if (!u) return
  u.isCaptured = false
  u.rescueRequest = { active: false, helper: null, penalty: 0 }
  if (u.hunterTracking) {
    u.hunterTracking.capturedByHunter = false
    u.hunterTracking.hunterActive = false
    u.hunterTracking.gainExp = 0
    u.hunterTracking.gainMoney = 0
    u.hunterTracking.windowStart = 0
    u.hunterTracking.escapeAttempts = 0
  }
  setUserStats(id, u)
}

export function isHunterActive(id) {
  return !!getUserStats(id)?.hunterTracking?.hunterActive
}

export function isCapturedByHunter(id) {
  return !!getUserStats(id)?.hunterTracking?.capturedByHunter
}

export function getLidMapping(lid) {
  if (!lid) return null
  return resolveJid(lid.toString().replace('@lid', '').replace(/[^0-9]/g, ''))
}
