import { isFunctionEnabled } from '../lib/owner-funciones.js'

export const isGlobalBefore = true

export async function before(m, { conn, isOwner, isROwner }) {
  try {
    const modoPublico = isFunctionEnabled('modopublico')
    global.opts['self'] = !modoPublico
  } catch (e) {
    global.opts['self'] = false
  }
  
  return false
}