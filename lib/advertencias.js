import fs from 'fs'

const folder = './database'
const file = `${folder}/advertencias.json`

if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true })
if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify({ users: {} }, null, 2))

function readDB() {
  return JSON.parse(fs.readFileSync(file, 'utf-8'))
}

function writeDB(data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2))
}

export async function getWarnings(userId) {
  const data = readDB()
  return data.users[userId]?.warn || 0
}

export async function addWarning(userId, reason = '') {
  const data = readDB()
  data.users[userId] ||= { warn: 0, reasons: [] }
  if (!data.users[userId].reasons) data.users[userId].reasons = []
  data.users[userId].warn++
  data.users[userId].reasons.push(reason)
  writeDB(data)
  return data.users[userId].warn
}

export async function removeWarning(userId) {
  const data = readDB()
  data.users[userId] ||= { warn: 0, reasons: [] }
  if (!data.users[userId].reasons) data.users[userId].reasons = []
  if (data.users[userId].warn > 0) {
    data.users[userId].warn--
    data.users[userId].reasons.pop()
  }
  writeDB(data)
  return data.users[userId].warn
}

export async function resetWarnings(userId) {
  const data = readDB()
  data.users[userId] = { warn: 0, reasons: [] }
  writeDB(data)
}

export async function listWarnings() {
  const data = readDB()
  return Object.entries(data.users)
    .filter(([_, u]) => u.warn > 0)
    .map(([id, u]) => ({ id, warns: u.warn, reasons: u.reasons || [] }))
}
