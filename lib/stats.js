import fs from 'fs'
import path from 'path'
import { canLevelUp, xpRange } from '../lib/levelling.js'

const dir = './database'
const file = path.join(dir, 'stats.json')

let db = {}

const lidToRealMap = {}

export function registerLidMapping(lid, realJid) {
  if (!lid || !realJid) return
  const lidClean = lid.toString().replace('@lid', '').replace(/[^0-9]/g, '')
  const realClean = realJid.toString().replace('@s.whatsapp.net', '').replace(/[^0-9]/g, '')
  if (!lidClean || !realClean) return
  if (lidToRealMap[lidClean] === realClean) return
  lidToRealMap[lidClean] = realClean
  migrateLidInDB(lidClean, realClean)
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
  saveStats()
}

function normalizeId(id) {
  if (!id) return null
  let normalized = id.toString().trim()
  const isLid = normalized.includes('@lid')
  normalized = normalized.replace('@s.whatsapp.net', '').replace('@lid', '').replace(/[^0-9]/g, '')
  if (!normalized) return null
  if (isLid && lidToRealMap[normalized]) return lidToRealMap[normalized]
  return normalized
}

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
    console.error('Error al cargar stats.json:', e.message)
    db = {}
  }
}

function saveStats() {
  try {
    ensureDB()
    fs.writeFileSync(file, JSON.stringify(db, null, 2))
  } catch (e) {
    console.error('Error al guardar stats.json:', e.message)
  }
}

loadStats()

export function getUserStats(id) {
  const normalizedId = normalizeId(id)
  
  if (!normalizedId) {
    console.warn('ID inválido recibido:', id)
    return {
      exp: 0,
      level: 0,
      money: 0,
      joincount: 0,
      premiumTime: 0,
      mysticcoins: 0,
      lunaCoins: 0,
      role: getRoleByLevel(0),
      limit: 10
    }
  }

  if (!db[normalizedId]) {
    db[normalizedId] = {
      exp: 0,
      level: 0,
      money: 0,
      joincount: 0,
      premiumTime: 0,
      mysticcoins: 0,
      lunaCoins: 0,
      role: getRoleByLevel(0),
      limit: 10
    }
    saveStats()
  }

  db[normalizedId] = {
    exp: db[normalizedId].exp ?? 0,
    level: db[normalizedId].level ?? 0,
    money: db[normalizedId].money ?? 0,
    joincount: db[normalizedId].joincount ?? 0,
    premiumTime: db[normalizedId].premiumTime ?? 0,
    mysticcoins: db[normalizedId].mysticcoins ?? 0,
    lunaCoins: db[normalizedId].lunaCoins ?? 0,
    role: db[normalizedId].role ?? getRoleByLevel(db[normalizedId].level ?? 0),
    limit: db[normalizedId].limit ?? 10
  }

  return db[normalizedId]
}

export function setUserStats(id, data) {
  const normalizedId = normalizeId(id)
  if (!normalizedId) {
    console.warn('No se puede establecer stats con ID inválido:', id)
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
  const user = getUserStats(id)
  return user?.exp || 0
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
  const user = getUserStats(id)
  return user?.money || 0
}

export function removeMoney(id, amount) {
  const user = getUserStats(id)
  if (!user) return
  
  user.money = Math.max(0, user.money - amount)
  setUserStats(id, user)
}

export function spendExp(id, amount) {
  removeExp(id, amount)
}

export function spendMoney(id, amount) {
  removeMoney(id, amount)
}

export function getLunaCoins(id) {
  const user = getUserStats(id)
  return user?.lunaCoins || 0
}

export function removeLunaCoins(id, amount) {
  const user = getUserStats(id)
  if (!user) return
  
  user.lunaCoins = Math.max(0, user.lunaCoins - amount)
  setUserStats(id, user)
}

export function spendLunaCoins(id, amount) {
  removeLunaCoins(id, amount)
}

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
  const user = getUserStats(id)
  return user?.level || 0
}

export function addMysticCoins(id, amount) {
  const user = getUserStats(id)
  if (!user) return
  
  user.mysticcoins += amount
  setUserStats(id, user)
}

export function getMysticCoins(id) {
  const user = getUserStats(id)
  return user?.mysticcoins || 0
}

export function removeMysticCoins(id, amount) {
  const user = getUserStats(id)
  if (!user) return
  
  user.mysticcoins = Math.max(0, user.mysticcoins - amount)
  setUserStats(id, user)
}

export function spendMysticCoins(id, amount) {
  removeMysticCoins(id, amount)
}

export function addJoinCount(id, amount = 1) {
  const user = getUserStats(id)
  if (!user) return
  
  user.joincount += amount
  setUserStats(id, user)
}

export function getJoinCount(id) {
  const user = getUserStats(id)
  return user?.joincount || 0
}