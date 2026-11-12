const MAX = 200
const TTL = 30 * 60 * 1000

function mapa() {
  if (!global.__viewOnceCache) global.__viewOnceCache = new Map()
  return global.__viewOnceCache
}

export function guardarViewOnce(id, revelado) {
  if (!id || !revelado) return false
  const m = mapa()
  m.set(String(id), {
    tipo: revelado.tipo,
    media: revelado.media,
    viewOnce: revelado.viewOnce,
    descargable: !!revelado.descargable,
    at: Date.now()
  })
  while (m.size > MAX) m.delete(m.keys().next().value)
  return true
}

export function leerViewOnce(id) {
  if (!id) return null
  const m = mapa()
  const clave = String(id)
  const dato = m.get(clave)
  if (!dato) return null
  if (Date.now() - dato.at > TTL) {
    m.delete(clave)
    return null
  }
  return dato
}

export function limpiarViewOnce() {
  mapa().clear()
}
