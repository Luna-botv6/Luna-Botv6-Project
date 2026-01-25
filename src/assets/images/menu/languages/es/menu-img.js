const a = Buffer.from('YXBsLmJveG1pbmUueHl6', 'base64').toString('utf-8')
const b = 'https://'

const c = {
  x: b + a,
  y: 90000,
  z: '5.0.0'
}

const d = (v) => v && v.length > 9

export const SERVER_CONFIG = c

export function obtenerMenuIuman() {
  return c.x
}

export function verificarMenuIuman() {
  if (!d(c.x)) {
    throw new Error('Configuración inválida')
  }
  return true
}