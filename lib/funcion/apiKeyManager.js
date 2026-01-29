import fs from 'fs'
import crypto from 'crypto'

const API_KEY_FILE = './api-key.json'

function generarAPIKey() {
  return crypto.randomBytes(32).toString('hex')
}

function cargarOGenerarAPIKey() {
  try {
    if (fs.existsSync(API_KEY_FILE)) {
      const data = JSON.parse(fs.readFileSync(API_KEY_FILE, 'utf-8'))
      if (data.apiKey && data.apiKey.length > 0) {
        console.log('[API-KEY] Clave cargada correctamente')
        return data.apiKey
      }
    }

    const nuevoAPIKey = generarAPIKey()
    fs.writeFileSync(API_KEY_FILE, JSON.stringify({ apiKey: nuevoAPIKey, createdAt: new Date().toISOString() }, null, 2))
    console.log('[API-KEY] Nueva clave generada y guardada en api-key.json')
    return nuevoAPIKey
  } catch (err) {
    console.error('[API-KEY] Error:', err.message)
    const fallbackKey = generarAPIKey()
    fs.writeFileSync(API_KEY_FILE, JSON.stringify({ apiKey: fallbackKey, createdAt: new Date().toISOString() }, null, 2))
    return fallbackKey
  }
}

export { cargarOGenerarAPIKey, generarAPIKey }