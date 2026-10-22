import fs from 'fs'
import path from 'path'

const DIR = './database'
const FILE = path.join(DIR, 'anticheat.json')

export const LIMITES = {
  money: 100000000,
  exp: 100000000,
  level: 2000,
  lunaCoins: 10000000,
  mysticcoins: 10000000
}

export const BASELINE = {
  money: 1000,
  exp: 0,
  level: 1,
  lunaCoins: 0,
  mysticcoins: 0
}

export const TOPE_CONCESION = {
  money: 2000000,
  exp: 500000,
  lunaCoins: 100000,
  mysticcoins: 100000
}

const CAMPOS = Object.keys(LIMITES)

let estado = null

function cargar() {
  if (estado) return estado
  try {
    estado = JSON.parse(fs.readFileSync(FILE, 'utf8'))
  } catch {
    estado = { version: 1, sancionados: {}, concesiones: [] }
  }
  if (!estado.sancionados) estado.sancionados = {}
  if (!Array.isArray(estado.concesiones)) estado.concesiones = []
  return estado
}

function guardar() {
  try {
    if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true })
    fs.writeFileSync(FILE, JSON.stringify(estado, null, 2))
  } catch {}
}

function resumenValores(u) {
  const out = {}
  for (const c of CAMPOS) out[c] = u?.[c]
  return out
}

function esAnomalo(valor, campo) {
  if (valor === undefined || valor === null) return false
  if (typeof valor !== 'number') return true
  if (!Number.isFinite(valor)) return true
  if (valor < 0) return true
  return valor > LIMITES[campo]
}

export function esSancionado(userId) {
  return !!cargar().sancionados[userId]
}

export function estadoSancion(userId) {
  return cargar().sancionados[userId] || null
}

export function sanearUsuario(userId, user, origen = 'desconocido') {
  if (!user || typeof user !== 'object') return { cambiado: false, sancionado: false }
  const motivos = []
  for (const c of CAMPOS) {
    if (esAnomalo(user[c], c)) motivos.push(`${c}=${user[c]}`)
  }
  if (!motivos.length) return { cambiado: false, sancionado: false }

  const antes = resumenValores(user)
  for (const c of CAMPOS) user[c] = BASELINE[c]
  user.tramposo = true
  user.sancionadoAt = Date.now()
  user.sancionMotivo = motivos.join(', ').slice(0, 300)

  const e = cargar()
  e.sancionados[userId] = {
    motivo: user.sancionMotivo,
    origen,
    at: user.sancionadoAt,
    antes,
    despues: { ...BASELINE }
  }
  guardar()
  return { cambiado: true, sancionado: true, motivo: user.sancionMotivo, antes }
}

export function sancionarManual(userId, user, motivo = 'sancion manual') {
  if (!user) return null
  const antes = resumenValores(user)
  for (const c of CAMPOS) user[c] = BASELINE[c]
  user.tramposo = true
  user.sancionadoAt = Date.now()
  user.sancionMotivo = motivo
  const e = cargar()
  e.sancionados[userId] = { motivo, origen: 'manual', at: user.sancionadoAt, antes, despues: { ...BASELINE } }
  guardar()
  return antes
}

export function limitarConcesion(tipo, monto, otorgante = 'desconocido', receptor = null) {
  const tope = TOPE_CONCESION[tipo]
  if (!tope) return { permitido: monto, rechazado: false }
  if (!Number.isFinite(monto) || monto <= 0) return { permitido: 0, rechazado: true }
  const permitido = Math.min(monto, tope)
  const rechazado = permitido !== monto
  const e = cargar()
  e.concesiones.push({ at: Date.now(), otorgante, receptor, tipo, pedido: monto, permitido, rechazado })
  if (e.concesiones.length > 500) e.concesiones = e.concesiones.slice(-500)
  guardar()
  return { permitido, rechazado }
}

export function resumen() {
  const e = cargar()
  return {
    sancionados: Object.keys(e.sancionados).length,
    ultimos: Object.entries(e.sancionados).slice(-10).map(([id, d]) => ({ id, ...d })),
    concesiones: e.concesiones.slice(-10)
  }
}
