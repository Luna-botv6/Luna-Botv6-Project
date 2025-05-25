import fs from 'fs'
import path from 'path'

const dbFile = path.resolve('./database/ppt.json')

let db = {
  users: {}
}

// Carga base o crea archivo
function load() {
  try {
    if (fs.existsSync(dbFile)) {
      const data = fs.readFileSync(dbFile, 'utf-8')
      db = JSON.parse(data)
    } else {
      save()
    }
  } catch (e) {
    console.error('Error loading ppt database:', e)
    db = { users: {} }
  }
}

// Guarda la base
function save() {
  try {
    fs.writeFileSync(dbFile, JSON.stringify(db, null, 2))
  } catch (e) {
    console.error('Error saving ppt database:', e)
  }
}

// Obtener datos usuario o crear si no existe
function getUser(id) {
  if (!db.users[id]) {
    db.users[id] = {
      exp: 0,
      level: 1
    }
    save()
  }
  return db.users[id]
}

// Calcular la exp necesaria para subir al siguiente nivel
function expToLevel(level) {
  return 1000 * level
}

// Agregar experiencia a usuario y subir nivel si corresponde
function addExp(id, amount) {
  const user = getUser(id)
  user.exp += amount
  let leveledUp = false
  while (user.exp >= expToLevel(user.level)) {
    user.exp -= expToLevel(user.level)
    user.level += 1
    leveledUp = true
  }
  save()
  return {
    leveledUp,
    level: user.level,
    exp: user.exp
  }
}

// Remover experiencia
function removeExp(id, amount) {
  const user = getUser(id)
  user.exp = Math.max(0, user.exp - amount)
  save()
}

// Obtener nivel y exp actual
function getLevel(id) {
  const user = getUser(id)
  return { level: user.level, exp: user.exp }
}

// Control de espera
const waitMap = new Map()

function setwait(id, tiempo = 60000) {
  waitMap.set(id, Date.now() + tiempo)
}

function canPlay(id) {
  const now = Date.now()
  if (!waitMap.has(id)) return true
  if (now > waitMap.get(id)) {
    waitMap.delete(id)
    return true
  }
  return false
}

load()

export {
  getUser,
  getLevel,
  addExp,
  removeExp,
  canPlay,
  setwait
}