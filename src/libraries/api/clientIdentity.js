import { resolveJidToPhone, isLidJid } from '../../../lib/funcion/lid-resolver.js'

const NOMBRE_FALLBACK = 'luna-bot-v6'

function soloDigitos(valor) {
  const numero = String(valor || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '')
  return numero || null
}

export function numeroBot(conn = global.conn) {
  const propio = conn?.user?.id || conn?.user?.jid || null
  if (propio) {
    const numero = isLidJid(propio) ? resolveJidToPhone(propio, conn) : soloDigitos(propio)
    if (numero) return soloDigitos(numero)
  }
  return soloDigitos(global.botnumber)
}

export function nombreClienteDescarga(conn = global.conn) {
  const numero = numeroBot(conn)
  return numero ? 'luna-bot-' + numero : NOMBRE_FALLBACK
}

export function cabecerasDescarga(apiKey, opciones = {}) {
  const cabeceras = { 'X-API-Key': apiKey }
  if (opciones.json) cabeceras['Content-Type'] = 'application/json'
  Object.defineProperty(cabeceras, 'X-Client-Name', {
    enumerable: true,
    configurable: true,
    get: () => nombreClienteDescarga()
  })
  return cabeceras
}

export function cabecerasUsuario(m, conn = global.conn) {
  const cabeceras = {}
  const telefono = resolveJidToPhone(m?.sender, conn)
  if (telefono) cabeceras['X-User-Id'] = telefono
  const nombre = String(m?.pushName || '').trim().slice(0, 60)
  if (nombre) cabeceras['X-User-Name'] = encodeURIComponent(nombre)
  return cabeceras
}
