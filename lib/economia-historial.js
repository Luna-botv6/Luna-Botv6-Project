import fs from 'fs'
import path from 'path'

const DIR = './database'
const FILE = path.join(DIR, 'registro-economia.json')
const CAMPOS = ['money', 'exp', 'mysticcoins', 'lunaCoins', 'banco.money', 'banco.exp', 'banco.mysticcoins', 'banco.lunaCoins']
const MAX_MOVS = 15
const MAX_INCIDENCIAS = 5
const DIAS_INACTIVO = 30
const FLUSH_MS = 15000

let estado = null
let timer = null

function vacio() {
  return { version: 1, usuarios: {} }
}

function cargar() {
  if (estado) return estado
  try {
    estado = JSON.parse(fs.readFileSync(FILE, 'utf8'))
  } catch {
    estado = vacio()
  }
  if (!estado || typeof estado !== 'object') estado = vacio()
  if (!estado.usuarios || typeof estado.usuarios !== 'object') estado.usuarios = {}
  return estado
}

function entrada(id) {
  const e = cargar()
  const clave = String(id)
  if (!e.usuarios[clave]) e.usuarios[clave] = { saldo: {}, movs: [], incidencias: [], ultimoChat: null, actualizado: 0 }
  const u = e.usuarios[clave]
  if (!u.saldo || typeof u.saldo !== 'object') u.saldo = {}
  if (!Array.isArray(u.movs)) u.movs = []
  if (!Array.isArray(u.incidencias)) u.incidencias = []
  return u
}

export function valorEconomia(user, campo) {
  if (campo.startsWith('banco.')) return Number(user?.banco?.[campo.slice(6)] || 0)
  return Number(user?.[campo] || 0)
}

export function asegurarSaldo(id, user) {
  const u = entrada(id)
  let cambio = false
  for (const campo of CAMPOS) {
    if (Number.isFinite(u.saldo[campo])) continue
    const valor = valorEconomia(user, campo)
    u.saldo[campo] = Number.isFinite(valor) ? valor : 0
    cambio = true
  }
  if (cambio) programarGuardado()
  return u.saldo
}

export function fijarSaldo(id, user) {
  const u = entrada(id)
  for (const campo of CAMPOS) {
    const valor = valorEconomia(user, campo)
    u.saldo[campo] = Number.isFinite(valor) ? valor : 0
  }
  u.actualizado = Date.now()
  programarGuardado()
}

export function saldoDe(id) {
  return { ...entrada(id).saldo }
}

export function registrarCambios(id, cambios, origen = 'interno') {
  if (!Array.isArray(cambios) || !cambios.length) return
  const u = entrada(id)
  const ahora = Date.now()
  const etiqueta = String(origen || 'interno').slice(0, 40)
  for (const cambio of cambios) {
    const campo = cambio?.campo
    const despues = Number(cambio?.despues)
    if (!CAMPOS.includes(campo) || !Number.isFinite(despues)) continue
    const antes = Number.isFinite(u.saldo[campo]) ? u.saldo[campo] : despues
    u.saldo[campo] = despues
    if (antes === despues) continue
    u.movs.push([ahora, campo, antes, despues, etiqueta])
  }
  if (u.movs.length > MAX_MOVS) u.movs = u.movs.slice(-MAX_MOVS)
  u.actualizado = ahora
  programarGuardado()
}

export function verificarIntegridad(id, user, origen = 'arranque', mtimeStats = null) {
  const u = entrada(id)
  const ahora = Date.now()
  const externo = !Number.isFinite(mtimeStats) || mtimeStats > (u.actualizado || 0) + 3000
  const diferencias = []
  for (const campo of CAMPOS) {
    const actual = valorEconomia(user, campo)
    if (!Number.isFinite(actual)) continue
    if (!Number.isFinite(u.saldo[campo])) {
      u.saldo[campo] = actual
      continue
    }
    if (u.saldo[campo] !== actual) diferencias.push({ campo, antes: u.saldo[campo], ahora: actual })
  }
  if (!diferencias.length) return []
  if (externo) {
    u.incidencias.push([ahora, String(origen || 'arranque').slice(0, 40), diferencias.map((d) => `${d.campo} ${d.antes} -> ${d.ahora}`).join(', ').slice(0, 300)])
    if (u.incidencias.length > MAX_INCIDENCIAS) u.incidencias = u.incidencias.slice(-MAX_INCIDENCIAS)
  }
  for (const d of diferencias) u.saldo[d.campo] = Number.isFinite(d.ahora) ? d.ahora : 0
  u.actualizado = ahora
  programarGuardado()
  return externo ? diferencias : []
}

export function registrarChat(id, chat) {
  if (!id || !chat || !String(chat).endsWith('@g.us')) return
  const u = entrada(id)
  if (u.ultimoChat === chat) return
  u.ultimoChat = chat
  u.actualizado = Date.now()
  programarGuardado()
}

export function ultimoChat(id) {
  return entrada(id).ultimoChat || null
}

export function movimientos(id, limite = 10) {
  return entrada(id).movs.slice(-Math.max(1, limite)).reverse()
}

export function incidencias(id, limite = 5) {
  return entrada(id).incidencias.slice(-Math.max(1, limite)).reverse()
}

export function resumenHistorial(id) {
  const u = entrada(id)
  return { saldo: { ...u.saldo }, movimientos: movimientos(id, 10), incidencias: incidencias(id, 5), ultimoChat: u.ultimoChat || null }
}

function podar() {
  const corte = Date.now() - DIAS_INACTIVO * 24 * 60 * 60 * 1000
  const e = cargar()
  for (const [clave, datos] of Object.entries(e.usuarios)) {
    if (!datos || !datos.actualizado || datos.actualizado < corte) {
      const tieneSaldo = datos?.saldo && Object.values(datos.saldo).some((v) => Number(v) > 0)
      if (!tieneSaldo) delete e.usuarios[clave]
    }
  }
}

export function guardarAhora() {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  if (!estado) return
  try {
    if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true })
    const tmp = FILE + '.tmp'
    fs.writeFileSync(tmp, JSON.stringify(estado))
    fs.renameSync(tmp, FILE)
  } catch {}
}

function programarGuardado() {
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    timer = null
    podar()
    guardarAhora()
  }, FLUSH_MS)
  if (timer.unref) timer.unref()
}

process.on('exit', guardarAhora)
process.on('SIGINT', guardarAhora)
process.on('SIGTERM', guardarAhora)
