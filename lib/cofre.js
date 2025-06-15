import fs from 'fs'

const file = './database/cofre.json'

let db = {}

function ensureDB() {
  if (!fs.existsSync('./database')) fs.mkdirSync('./database')
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
  fs.writeFileSync(file, JSON.stringify(db, null, 2))
}

loadDB()

export function getLastCofreTime(id) {
  return db[id] || 0
}

export function setLastCofreTime(id, timestamp) {
  db[id] = timestamp
  saveDB()
}

export function initCofreUser(id) {
  if (!db[id]) {
    db[id] = 0
    saveDB()
  }
}