import fs from 'fs'
import path from 'path'

const dir = './database'
const file = path.join(dir, 'waifuusuarios.json')

let db = {}

function ensureDB() {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(file)) fs.writeFileSync(file, '{}')
}

function loadDB() {
  ensureDB()
  try {
    db = JSON.parse(fs.readFileSync(file))
  } catch {
    db = {}
  }
}

function saveDB() {
  ensureDB()
  fs.writeFileSync(file, JSON.stringify(db, null, 2))
}

loadDB()

export function getUserData(id) {
  if (!db[id]) {
    db[id] = {
      rollsToday: 0,
      lastRoll: null,
      harem: [],
      lastReward: 0,
      votes: {}
    }
    saveDB()
  }
  db[id] = {
    rollsToday: db[id].rollsToday ?? 0,
    lastRoll: db[id].lastRoll ?? null,
    harem: db[id].harem ?? [],
    lastReward: db[id].lastReward ?? 0,
    votes: db[id].votes ?? {}
  }
  return db[id]
}

export function setUserData(id, data) {
  db[id] = { ...getUserData(id), ...data }
  saveDB()
}

export function setUserWaifuData(id, waifu) {
  const user = getUserData(id)
  user.lastRoll = waifu
  setUserData(id, user)
}

export function getUserWaifuData(id) {
  return getUserData(id).lastRoll
}

export function updateRolls(id, count = 1) {
  const user = getUserData(id)
  user.rollsToday += count
  setUserData(id, user)
}

export function saveWaifuClaim(id, waifu) {
  const user = getUserData(id)
  user.harem.push(waifu)
  user.lastRoll = null
  setUserData(id, user)
}

export function getHarem(id) {
  return getUserData(id).harem
}

export function addVote(id, waifuName, vote) {
  const user = getUserData(id)
  if (!user.votes) user.votes = {}
  user.votes[waifuName] = vote
  setUserData(id, user)
}

export function resetDailyRolls() {
  for (const id in db) db[id].rollsToday = 0
  saveDB()
}

console.log('✅ Sistema completo de datos de waifus cargado correctamente.')
