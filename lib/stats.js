import fs from 'fs'
import path from 'path'
import { canLevelUp, xpRange } from '../lib/levelling.js'

const dir = './database'
const file = path.join(dir, 'stats.json')

let db = {}

function ensureDB() {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir)
  if (!fs.existsSync(file)) fs.writeFileSync(file, '{}')
}

function loadStats() {
  ensureDB()
  try {
    db = JSON.parse(fs.readFileSync(file))
  } catch {
    db = {}
  }
}

function saveStats() {
  ensureDB()
  fs.writeFileSync(file, JSON.stringify(db, null, 2))
}

loadStats()

export function getUserStats(id) {
  if (!db[id]) {
    db[id] = {
      exp: 0,
      level: 0,
      money: 0,
      joincount: 0,
      premiumTime: 0,
      mysticcoins: 0,
      lunaCoins: 0, // Se añadió para evitar errores
      role: getRoleByLevel(0),
      limit: 10
    }
    saveStats()
  }

  // Asegurar que todos los campos estén siempre presentes aunque el usuario ya exista
  db[id] = {
    exp: db[id].exp ?? 0,
    level: db[id].level ?? 0,
    money: db[id].money ?? 0,
    joincount: db[id].joincount ?? 0,
    premiumTime: db[id].premiumTime ?? 0,
    mysticcoins: db[id].mysticcoins ?? 0,
    lunaCoins: db[id].lunaCoins ?? 0,
    role: db[id].role ?? getRoleByLevel(db[id].level ?? 0),
    limit: db[id].limit ?? 10
  }

  return db[id]
}

export function setUserStats(id, data) {
  db[id] = { ...getUserStats(id), ...data }
  saveStats()
}

export function addExp(id, amount) {
  const user = getUserStats(id)
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
  user.exp = Math.max(0, user.exp - amount)
  setUserStats(id, user)
}

export function getExp(id) {
  const user = getUserStats(id)
  return user.exp || 0
}

export function addMoney(id, amount) {
  const user = getUserStats(id)
  user.money += amount
  setUserStats(id, user)
}

export function addLunaCoins(id, amount) {
  const user = getUserStats(id)
  user.lunaCoins += amount
  setUserStats(id, user)
}

export function getMoney(id) {
  const user = getUserStats(id)
  return user.money || 0
}

export function removeMoney(id, amount) {
  const user = getUserStats(id)
  user.money = Math.max(0, user.money - amount)
  setUserStats(id, user)
}

export function spendExp(id, amount) {
  removeExp(id, amount)
}

export function spendMoney(id, amount) {
  removeMoney(id, amount)
}

export function getRoleByLevel(level) {
  if (level >= 500) return '🌌 Dios Cósmico'
  if (level >= 400) return '⭐ Entidad Suprema'
  if (level >= 300) return '🌟 Ser Celestial'
  if (level >= 200) return '👑 Emperador Divino'
  
  // Niveles Muy Altos (100-199)
  if (level >= 150) return '🔱 Titán'
  if (level >= 120) return '⚡ Semidiós'
  if (level >= 100) return '🏆 Campeón Supremo'
  
  // Niveles Altos (50-99)
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