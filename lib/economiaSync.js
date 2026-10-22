import fs from 'fs'
import fetch from 'node-fetch'
import { obtenerMenuChat } from '../src/assets/images/menu/languages/es/menu-img.js'
import { cargarOGenerarAPIKey } from '../src/libraries/api/apiKeyManager.js'
import { getActivos, getTodosLosUsuarios, setUserStats } from './stats.js'

const CAMPOS = ['money', 'exp', 'level', 'lunaCoins', 'mysticcoins']
const INTERVALO_MS = 60000
const notificados = new Set()
let timer = null
let enCurso = false

function idiomaDe(id) {
  try {
    return global.db?.data?.users?.[id]?.language || global.defaultLenguaje || 'es'
  } catch {
    return 'es'
  }
}

function textoSancion(id) {
  const idioma = idiomaDe(id)
  try {
    const j = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`, 'utf8'))
    return j?.anticheat?.texto1 || null
  } catch {
    return null
  }
}

async function notificarSancion(id, fila) {
  if (notificados.has(id)) return
  notificados.add(id)
  const conn = global.conn
  if (!conn?.sendMessage) return
  const jid = `${id}@s.whatsapp.net`
  const texto = textoSancion(id) || '🕵️ *El Inquisidor* revisó tus cuentas y detectó valores imposibles. Tus recursos fueron reseteados.'
  try {
    await conn.sendMessage(jid, { text: texto })
  } catch {}
  if (fila?.sancionMotivo) console.warn(`[anticheat] ${id} sancionado: ${fila.sancionMotivo}`)
}

function armarPayload(ids) {
  const db = getTodosLosUsuarios()
  const out = []
  for (const id of ids) {
    const u = db[id]
    if (!u || typeof u !== 'object') continue
    const fila = { id }
    for (const c of CAMPOS) fila[c] = Number.isFinite(u[c]) ? u[c] : null
    out.push(fila)
    if (out.length >= 500) break
  }
  return out
}

function aplicar(data) {
  const db = getTodosLosUsuarios()
  const usuarios = data?.usuarios || {}
  for (const [id, fila] of Object.entries(usuarios)) {
    const u = db[id]
    if (!u) continue
    let cambio = false
    for (const c of CAMPOS) {
      if (fila[c] === undefined || fila[c] === null) continue
      if (fila[c] === u[c]) continue
      if (!fila.tramposo && fila[c] < u[c]) continue
      u[c] = fila[c]
      cambio = true
    }
    if (cambio) setUserStats(id, u)
    if (fila.tramposo) {
      if (!u.tramposo) {
        u.tramposo = true
        setUserStats(id, u)
      }
      notificarSancion(id, fila)
    }
  }
}

export async function sincronizarEconomia(ids = getActivos()) {
  if (enCurso || !ids.length) return
  let url
  try {
    url = obtenerMenuChat()
    if (!url) return
  } catch {
    return
  }
  const payload = armarPayload(ids)
  if (!payload.length) return
  enCurso = true
  const control = new AbortController()
  const corte = setTimeout(() => control.abort(), 20000)
  try {
    const apiKey = cargarOGenerarAPIKey()
    const res = await fetch(`${String(url).replace(/\/+$/, '')}/economia/sync`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify({ usuarios: payload }),
      signal: control.signal
    })
    if (!res.ok) return
    aplicar(await res.json())
  } catch (e) {
    if (!global._economiaSyncAvisado) {
      global._economiaSyncAvisado = true
      console.warn('[economia] sync no disponible:', e.message)
    }
  } finally {
    clearTimeout(corte)
    enCurso = false
  }
}

export function iniciarEconomiaSync() {
  if (timer) return timer
  timer = setInterval(() => { sincronizarEconomia() }, INTERVALO_MS)
  if (timer.unref) timer.unref()
  setTimeout(() => { sincronizarEconomia(getActivos(30 * 60 * 1000)) }, 15000)
  return timer
}

export function detenerEconomiaSync() {
  if (timer) clearInterval(timer)
  timer = null
}
