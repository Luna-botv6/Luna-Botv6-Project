import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'

const file = './database/minarmystic.json'
let db = {}

function ensureDB() {
  if (!existsSync('./database')) mkdirSync('./database')
  if (!existsSync(file)) writeFileSync(file, '{}')
}

function loadDB() {
  ensureDB()
  try {
    db = JSON.parse(readFileSync(file))
  } catch {
    db = {}
  }
}

function saveDB() {
  writeFileSync(file, JSON.stringify(db, null, 2))
}

loadDB()

export function getLastMysticMiningTime(id) {
  return db[id] || 0
}

export function setLastMysticMiningTime(id, timestamp) {
  db[id] = timestamp
  saveDB()
}

export function initMysticMiningUser(id) {
  if (!db[id]) {
    db[id] = 0
    saveDB()
  }
}
