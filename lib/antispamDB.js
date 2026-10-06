import fs from 'fs'

const PATH = './database/antispam.json'
const INTERVALO_MS = 15000
const MAX_ENTRADAS = 3000
const IDLE_MS = 60 * 60 * 1000

if (!fs.existsSync(PATH)) fs.writeFileSync(PATH, JSON.stringify({}))

let cache = null
let pendiente = false
let ultimoGuardado = 0

function leerDisco() {
  try {
    return JSON.parse(fs.readFileSync(PATH))
  } catch {
    return {}
  }
}

function purgar() {
  if (!cache) return false
  const antes = Object.keys(cache).length
  const ahora = Date.now()
  for (const [k, v] of Object.entries(cache)) {
    if (!v || typeof v !== 'object') { delete cache[k]; continue }
    if ((v.warns || 0) === 0 && ahora - (v.lastTime || 0) > IDLE_MS) delete cache[k]
  }
  let claves = Object.keys(cache)
  if (claves.length > MAX_ENTRADAS) {
    claves.sort((a, b) => (cache[a]?.lastTime || 0) - (cache[b]?.lastTime || 0))
    for (const k of claves) {
      if (Object.keys(cache).length <= MAX_ENTRADAS) break
      if ((cache[k]?.warns || 0) === 0) delete cache[k]
    }
  }
  return Object.keys(cache).length !== antes
}
function guardarDisco() {
  purgar()
  try {
    fs.writeFileSync(PATH, JSON.stringify(cache, null, 2))
    ultimoGuardado = Date.now()
    pendiente = false
  } catch {}
}

export function loadAntiSpam() {
  if (!cache) {
    cache = leerDisco()
    if (purgar()) pendiente = true
    ultimoGuardado = Date.now()
  }
  return cache
}

export function saveAntiSpam(data) {
  cache = data
  pendiente = true
  if (Date.now() - ultimoGuardado >= INTERVALO_MS) guardarDisco()
}

export function flushAntiSpam() {
  if (pendiente) guardarDisco()
}

try {
  const intervalo = setInterval(() => {
    if (!cache) return
    const cambio = purgar()
    if (pendiente || cambio) guardarDisco()
  }, INTERVALO_MS)
  if (typeof intervalo.unref === 'function') intervalo.unref()
} catch {}
