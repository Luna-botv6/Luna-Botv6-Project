import fs from 'fs'
import { idCanonico, mismoUsuario } from './identidad.js'

const CLAN_DIR = './database'
const CLAN_FILE = './database/clanes.json'

if (!fs.existsSync(CLAN_DIR)) fs.mkdirSync(CLAN_DIR, { recursive: true })
if (!fs.existsSync(CLAN_FILE)) fs.writeFileSync(CLAN_FILE, '{}')

let clanes = {}
export function recargarClanes() {
  try { clanes = JSON.parse(fs.readFileSync(CLAN_FILE, 'utf8')) } catch { clanes = {} }
  migrarIdentidades()
  return clanes
}
recargarClanes()

function migrarIdentidades() {
  let cambiado = false
  for (const clan of Object.values(clanes)) {
    const lider = idCanonico(clan.lider) || clan.lider
    if (lider !== clan.lider) { clan.lider = lider; cambiado = true }
    if (!Array.isArray(clan.miembros)) continue
    const miembros = []
    for (const id of clan.miembros) {
      const canonico = idCanonico(id) || id
      if (canonico !== id) cambiado = true
      if (!miembros.some((x) => mismoUsuario(x, canonico))) miembros.push(canonico)
      else cambiado = true
    }
    if (miembros.length !== clan.miembros.length) cambiado = true
    clan.miembros = miembros
  }
  if (cambiado) guardarClanes()
}

export function getClanes() { return clanes }

export function guardarClanes() {
  try { fs.writeFileSync(CLAN_FILE, JSON.stringify(clanes, null, 2)) } catch {}
}

export function getClanDeUsuario(userId) {
  for (const [nombre, clan] of Object.entries(clanes)) {
    if (clan.miembros && clan.miembros.some((x) => mismoUsuario(x, userId))) return { nombre, clan }
  }
  return null
}

export function addToClanFund(userId, amount) {
  if (!amount || amount <= 0) return false
  const info = getClanDeUsuario(userId)
  if (!info) return false
  info.clan.fondo = (info.clan.fondo || 0) + Math.floor(amount)
  info.clan.nivel = Math.floor(info.clan.fondo / 5000) + 1
  guardarClanes()
  return true
}

export function getClanBonus(userId) {
  const info = getClanDeUsuario(userId)
  if (!info) return 0
  return (info.clan.fondo || 0) >= 1000 ? 0.05 : 0
}

export function quitarUsuarioDeClanes(userId) {
  const info = getClanDeUsuario(userId)
  if (!info) return null
  const { nombre, clan } = info
  const eraLider = mismoUsuario(clan.lider, userId)
  clan.miembros = clan.miembros.filter((x) => !mismoUsuario(x, userId))
  if (clan.miembros.length === 0) {
    delete clanes[nombre]
    guardarClanes()
    return { nombre, eraLider: true, disuelto: true, nuevoLider: null }
  }
  if (eraLider) clan.lider = clan.miembros[0]
  guardarClanes()
  return { nombre, eraLider, disuelto: false, nuevoLider: clan.lider }
}

export function resetTodosLosClanes() {
  clanes = {}
  guardarClanes()
}

export function reemplazarClanes(data) {
  clanes = data && typeof data === 'object' && !Array.isArray(data) ? data : {}
  guardarClanes()
}

export function restaurarClanUsuario(nombre, userId, eraLider = false, snapshot = null) {
  const id = idCanonico(userId) || userId
  if (!clanes[nombre] && snapshot && typeof snapshot === 'object') {
    try { clanes[nombre] = JSON.parse(JSON.stringify(snapshot)) } catch {}
  }
  const clan = clanes[nombre]
  if (!clan || typeof clan !== 'object') return false
  if (!Array.isArray(clan.miembros)) clan.miembros = []
  if (!clan.miembros.some((x) => mismoUsuario(x, id))) clan.miembros.push(id)
  if (eraLider) clan.lider = id
  guardarClanes()
  return true
}
