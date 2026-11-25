import fetch from 'node-fetch'
import { obtenerMenuChat } from '../src/assets/images/menu/languages/es/menu-img.js'
import { cargarOGenerarAPIKey } from '../src/libraries/api/apiKeyManager.js'

function numeroDe(id) {
  return String(id || '').split('@')[0].replace(/\D/g, '')
}

async function avisar(ruta, id, motivo) {
  if (process.env.LUNA_SIN_AVISO_ECONOMIA === '1') return false
  const userId = numeroDe(id)
  if (!userId) return false
  const base = obtenerMenuChat()
  if (!base) return false
  const control = new AbortController()
  const corte = setTimeout(() => control.abort(), 8000)
  try {
    const res = await fetch(`${String(base).replace(/\/+$/, '')}${ruta}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': cargarOGenerarAPIKey() },
      body: JSON.stringify({ userId, motivo }),
      signal: control.signal
    })
    return res.ok
  } catch {
    return false
  } finally {
    clearTimeout(corte)
  }
}

export function notificarResetEconomia(id, motivo = 'resetuser') {
  return avisar('/economia/reset-user', id, motivo)
}

export function notificarRestauracionEconomia(id, motivo = 'restoreuser') {
  return avisar('/economia/restaurar-user', id, motivo)
}
