import fetch from 'node-fetch'
import { obtenerMenuIuman } from '../assets/images/menu/languages/es/menu-img.js'
import { cargarOGenerarAPIKey } from './api/apiKeyManager.js'

const SERVER_URL = obtenerMenuIuman()
const API_KEY = cargarOGenerarAPIKey()
const DL_HEADERS = { 'X-Client-Name': 'luna-bot-v6', 'X-API-Key': API_KEY, 'Content-Type': 'application/json' }
const TIMEOUT = 30000

const ft = async (url, options = {}) => {
  const c = new AbortController()
  const t = setTimeout(() => c.abort(), TIMEOUT)
  try { const r = await fetch(url, { ...options, signal: c.signal }); clearTimeout(t); return r }
  catch (e) { clearTimeout(t); throw e }
}

async function traerFuente(source) {
  if (typeof source === 'string' && /https?:\/\//.test(source)) {
    const res = await ft(source)
    if (res.status !== 200) throw new Error('No se pudo descargar la fuente')
    return await res.buffer()
  }
  if (!Buffer.isBuffer(source) || !source.length) throw new Error('Fuente invalida')
  return source
}

async function webp2mp4(source) {
  const buffer = await traerFuente(source)
  const res = await ft(SERVER_URL + '/api/utils/webp2mp4', {
    method: 'POST',
    headers: DL_HEADERS,
    body: JSON.stringify({ image: buffer.toString('base64') })
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(txt || `Servidor respondio ${res.status}`)
  }
  const buf = Buffer.from(await res.arrayBuffer())
  if (!buf.length) throw new Error('Respuesta vacia del servidor')
  return buf
}

async function webp2png(source) {
  const buffer = await traerFuente(source)
  const res = await ft(SERVER_URL + '/api/utils/webp2png', {
    method: 'POST',
    headers: DL_HEADERS,
    body: JSON.stringify({ image: buffer.toString('base64') })
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(txt || `Servidor respondio ${res.status}`)
  }
  const data = await res.json()
  if (!data.status || !data.image) throw new Error(data.error || 'Conversion fallida')
  return Buffer.from(data.image, 'base64')
}

export {
  webp2mp4,
  webp2png
}