import fs from 'fs'
import path from 'path'

const dir = './database'
const file = path.join(dir, 'afk.json')

function ensureDB() {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir)
  }
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, '{}')
  }
}

export function loadAFK() {
  ensureDB()
  try {
    return JSON.parse(fs.readFileSync(file))
  } catch {
    return {}
  }
}

export function saveAFK(data) {
  ensureDB()
  fs.writeFileSync(file, JSON.stringify(data, null, 2))
}