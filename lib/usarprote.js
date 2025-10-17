import fs from 'fs'
import path from 'path'
import { getUserStats, setUserStats } from './stats.js'

const DURACIONES = {
  '5': { tiempo: 5 * 60 * 60 * 1000, costo: 10 },
  '12': { tiempo: 12 * 60 * 60 * 1000, costo: 15 },
  '24': { tiempo: 24 * 60 * 60 * 1000, costo: 20 }
}
const DURACION_NORMAL = 2 * 60 * 60 * 1000
const COSTO_NORMAL = 5

const dir = './database'
const file = path.join(dir, 'proteccion.json')

let proteccionesActivas = {}

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

function saveProtecciones() {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir)
  fs.writeFileSync(file, JSON.stringify(proteccionesActivas, null, 2))
}

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
  if (proteccionesActivas[id]) {
    return {
      activa: true,
      expira: proteccionesActivas[id].expira,
      duracionHoras: proteccionesActivas[id].duracion || 2
    }
  } else {
    return { activa: false }
  }
}

export async function activarProteccion(m, conn, duracionKey) {
  const userId = m.sender
  const userStats = getUserStats(userId)

  let tiempo, costo

  if (duracionKey && DURACIONES[duracionKey]) {
    tiempo = DURACIONES[duracionKey].tiempo
    costo = DURACIONES[duracionKey].costo
  } else {
    tiempo = DURACION_NORMAL
    costo = COSTO_NORMAL
  }

  if (userStats.mysticcoins < costo) {
    await conn.sendMessage(m.chat, {
      text: `❌ No tienes suficientes mysticcoins para esta protección.\nTe faltan ${costo - userStats.mysticcoins} mysticcoins.`
    })
    return
  }

  userStats.mysticcoins -= costo
  setUserStats(userId, userStats)

  proteccionesActivas[userId] = {
    expira: Date.now() + tiempo,
    duracion: tiempo / (60 * 60 * 1000)
  }

  saveProtecciones()

  await conn.sendMessage(m.chat, {
    text: `✅ Protección activada por ${tiempo / (60 * 60 * 1000)} horas. Nadie podrá robarte XP ni diamantes.`
  })
}

export function getProteccionesDisponibles() {
  return [
    { horas: 2, costo: COSTO_NORMAL },
    { horas: 5, costo: DURACIONES['5'].costo },
    { horas: 12, costo: DURACIONES['12'].costo },
    { horas: 24, costo: DURACIONES['24'].costo }
  ]
}

export function getProteccionRestante(id) {
  limpiarProtecciones()
  if (!proteccionesActivas[id]) return 0
  const ahora = Date.now()
  const restante = proteccionesActivas[id].expira - ahora
  return Math.max(0, restante)
}