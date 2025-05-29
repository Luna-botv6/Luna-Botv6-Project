import fs from 'fs'
import path from 'path'
import { getUserStats, setUserStats } from './stats.js'

const DURACION_PROTECCION_MS = 2 * 60 * 60 * 1000 // 2 horas
const COSTO_MYSTICCOINS = 5

const dir = './database'
const file = path.join(dir, 'proteccion.json')

let proteccionesActivas = {}

// Cargar protecciones desde archivo
function loadProtecciones() {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir)
  if (!fs.existsSync(file)) fs.writeFileSync(file, '{}')

  try {
    const data = fs.readFileSync(file, 'utf-8')
    proteccionesActivas = JSON.parse(data)
  } catch {
    proteccionesActivas = {}
  }

  limpiarProtecciones()
}

// Guardar protecciones en archivo
function saveProtecciones() {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir)
  fs.writeFileSync(file, JSON.stringify(proteccionesActivas, null, 2))
}

// Limpiar protecciones expiradas
function limpiarProtecciones() {
  const ahora = Date.now()
  for (const id in proteccionesActivas) {
    if (proteccionesActivas[id].expira <= ahora) {
      delete proteccionesActivas[id]
    }
  }
  saveProtecciones()
}

loadProtecciones()

export function tieneProteccion(id) {
  limpiarProtecciones()
  return proteccionesActivas[id] !== undefined
}

export async function usarProteccion(m, conn) {
  const userId = m.sender

  const userStats = getUserStats(userId)
  if (userStats.mysticcoins < COSTO_MYSTICCOINS) {
    await conn.sendMessage(userId, { text: `❌ No tienes suficientes mysticcoins para activar la protección. Te faltan ${COSTO_MYSTICCOINS - userStats.mysticcoins} mysticcoins.` })
    return
  }

  // Descontar mysticcoins
  userStats.mysticcoins -= COSTO_MYSTICCOINS
  setUserStats(userId, userStats)

  // Activar protección
  proteccionesActivas[userId] = {
    expira: Date.now() + DURACION_PROTECCION_MS
  }

  saveProtecciones()

  await conn.sendMessage(userId, { text: `✅ Protección activada por 2 horas. Nadie podrá robarte XP ni diamantes.` })
}
