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
      lunaCoins: 0,
      hackTools: 0, // FIX: Inicializar siempre en 0
      role: getRoleByLevel(0),
      limit: 10
    }
    saveStats()
  }

  // FIX: Asegurar que TODOS los campos estén siempre presentes y con valores válidos
  db[id] = {
    exp: Number(db[id].exp) || 0,
    level: Number(db[id].level) || 0,
    money: Number(db[id].money) || 0,
    joincount: Number(db[id].joincount) || 0,
    premiumTime: Number(db[id].premiumTime) || 0,
    mysticcoins: Number(db[id].mysticcoins) || 0,
    lunaCoins: Number(db[id].lunaCoins) || 0,
    hackTools: Number(db[id].hackTools) || 0, // FIX: Asegurar que sea número
    role: db[id].role ?? getRoleByLevel(Number(db[id].level) || 0),
    limit: Number(db[id].limit) || 10
  }

  // Guardar los cambios inmediatamente para evitar inconsistencias
  saveStats()

  return db[id]
}

export function setUserStats(id, data) {
  // FIX: Asegurar que todos los números sean válidos antes de guardar
  const currentStats = getUserStats(id)
  const newData = {}
  
  for (const key in data) {
    if (typeof data[key] === 'number' || ['exp', 'level', 'money', 'joincount', 'premiumTime', 'mysticcoins', 'lunaCoins', 'hackTools', 'limit'].includes(key)) {
      newData[key] = Number(data[key]) || 0
    } else {
      newData[key] = data[key]
    }
  }
  
  db[id] = { ...currentStats, ...newData }
  saveStats()
}

export function addExp(id, amount) {
  const user = getUserStats(id)
  user.exp += Number(amount) || 0

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
  user.exp = Math.max(0, user.exp - (Number(amount) || 0))
  setUserStats(id, user)
}

export function getExp(id) {
  const user = getUserStats(id)
  return Number(user.exp) || 0
}

export function addMoney(id, amount) {
  const user = getUserStats(id)
  user.money += Number(amount) || 0
  setUserStats(id, user)
}

export function addLunaCoins(id, amount) {
  const user = getUserStats(id)
  user.lunaCoins += Number(amount) || 0
  setUserStats(id, user)
}

export function getMoney(id) {
  const user = getUserStats(id)
  return Number(user.money) || 0
}

export function removeMoney(id, amount) {
  const user = getUserStats(id)
  user.money = Math.max(0, user.money - (Number(amount) || 0))
  setUserStats(id, user)
}

export function spendExp(id, amount) {
  removeExp(id, amount)
}

export function spendMoney(id, amount) {
  removeMoney(id, amount)
}

export function getRoleByLevel(level) {
  const lvl = Number(level) || 0
  if (lvl >= 50) return '💎 Leyenda'
  if (lvl >= 30) return '🔥 Maestro'
  if (lvl >= 20) return '⚔️ Épico'
  if (lvl >= 10) return '🏅 Avanzado'
  if (lvl >= 5) return '📘 Intermedio'
  return '🧰 Novato'
}

export function addHackTools(id, amount) {
  const user = getUserStats(id)
  user.hackTools += Number(amount) || 0
  setUserStats(id, user)
}

export function removeHackTools(id, amount) {
  const user = getUserStats(id)
  user.hackTools = Math.max(0, user.hackTools - (Number(amount) || 0))
  setUserStats(id, user)
}

export function getHackTools(id) {
  const user = getUserStats(id)
  return Number(user.hackTools) || 0
}