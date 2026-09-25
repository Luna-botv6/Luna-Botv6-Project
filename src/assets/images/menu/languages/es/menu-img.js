const _d = (v) => Buffer.from(v, 'base64').toString('utf-8')

const _a = _d('YXBsLmJveG1pbmUueHl6')
const _b = _d('cHJvamVjdC12aWEuYm94bWluZS54eXo=')
const _p = _d('bHVuYS1ib3QtdjYuYm94bWluZS54eXo=')

const _h = 'https://'
const _s = 'https://'
const _w = 'wss://'

const c = {
  x: _h + _a,
  y: 90000,
  z: '5.0.0',
  a: _s + _b,
  p: _p,
  q: _w + _p,
  r: _s + _p
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

export function obtenerMenuChat() {
  return c.a
}

export function verificarMenuChat() {
  if (!d(c.a)) {
    throw new Error('Configuración inválida')
  }
  return true
}

export function obtenerMenuPanelWs() {
  return c.q
}

export function obtenerMenuPanelHttp() {
  return c.r
}

export function verificarMenuPanel() {
  if (!d(c.q) || !d(c.r)) {
    throw new Error('Configuración inválida')
  }
  return true
}
