import fs from 'fs'
import { Low, JSONFile } from 'lowdb'

const folder = './database'
const file = `${folder}/advertencias.json`

if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true })
if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify({ users: {} }, null, 2))

const db = new Low(new JSONFile(file))

async function loadDB() {
  await db.read()
  db.data ||= { users: {} }
  return db
}

export async function getWarnings(userId) {
  const db = await loadDB()
  return db.data.users[userId]?.warn || 0
}

export async function addWarning(userId) {
  const db = await loadDB()
  db.data.users[userId] ||= { warn: 0 }
  db.data.users[userId].warn++
  await db.write()
  return db.data.users[userId].warn
}

export async function removeWarning(userId) {
  const db = await loadDB()
  db.data.users[userId] ||= { warn: 0 }
  if (db.data.users[userId].warn > 0) db.data.users[userId].warn--
  await db.write()
  return db.data.users[userId].warn
}

export async function resetWarnings(userId) {
  const db = await loadDB()
  db.data.users[userId] ||= { warn: 0 }
  db.data.users[userId].warn = 0
  await db.write()
}

export async function listWarnings() {
  const db = await loadDB()
  return Object.entries(db.data.users)
    .filter(([_, data]) => data.warn > 0)
    .map(([id, data]) => ({ id, warns: data.warn }))
}
