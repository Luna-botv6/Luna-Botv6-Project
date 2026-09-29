import fs from 'fs'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const API_KEY_FILE = join(dirname(fileURLToPath(import.meta.url)), '../../../api-key.json')

function generarAPIKey() {
  return crypto.randomBytes(32).toString('hex')
}

function cargarOGenerarAPIKey() {
  try {
    if (fs.existsSync(API_KEY_FILE)) {
      const data = JSON.parse(fs.readFileSync(API_KEY_FILE, 'utf-8'))
      if (data.apiKey && data.apiKey.length > 0) {
       // console.log('[API-KEY] Clave cargada correctamente')
        registrarAPIKey(data.apiKey)
        return data.apiKey
      }
    }

    const nuevoAPIKey = generarAPIKey()
    fs.writeFileSync(API_KEY_FILE, JSON.stringify({ apiKey: nuevoAPIKey, createdAt: new Date().toISOString() }, null, 2))
   // console.log('[API-KEY] Nueva clave generada y guardada en api-key.json')
    registrarAPIKey(nuevoAPIKey)
    return nuevoAPIKey
  } catch (err) {
    console.error('[API-KEY] Error:', err.message)
    const fallbackKey = generarAPIKey()
    fs.writeFileSync(API_KEY_FILE, JSON.stringify({ apiKey: fallbackKey, createdAt: new Date().toISOString() }, null, 2))
    registrarAPIKey(fallbackKey)
    return fallbackKey
  }
}

function registrarAPIKey(key) {
  if (!key || typeof key !== 'string') return
  if (!global.APIKeys || typeof global.APIKeys !== 'object') global.APIKeys = {}
  global.APIKeys[key] = true
}

function registrarAPIKeyDeArchivos(rutas) {
  for (const ruta of rutas) {
    try {
      if (!fs.existsSync(ruta)) continue
      const data = JSON.parse(fs.readFileSync(ruta, 'utf-8'))
      if (!data || typeof data !== 'object') continue
      for (const v of Object.values(data)) {
        if (typeof v === 'string' && v.length >= 16) registrarAPIKey(v)
      }
    } catch {}
  }
}

export { cargarOGenerarAPIKey, generarAPIKey, registrarAPIKey, registrarAPIKeyDeArchivos }
