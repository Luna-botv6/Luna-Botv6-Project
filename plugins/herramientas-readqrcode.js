import fs from 'fs'
import fetch from 'node-fetch'
import { obtenerMenuIuman, verificarMenuIuman } from '../src/assets/images/menu/languages/es/menu-img.js'
import { cargarOGenerarAPIKey } from '../src/libraries/api/apiKeyManager.js'

const configContent = fs.readFileSync('./config.js', 'utf-8')
if (!configContent.includes('Luna-Botv6')) throw new Error('Handler bloqueado')
try { verificarMenuIuman() } catch { throw new Error('Archivo de configuracion faltante o invalido') }

const SERVER_URL = obtenerMenuIuman()
const API_KEY = cargarOGenerarAPIKey()
const DL_HEADERS = { 'X-Client-Name': 'luna-bot-v6', 'X-API-Key': API_KEY, 'Content-Type': 'application/json' }
const TIMEOUT = 30000

const ocultar = (m) => String(m || '').replace(/https?:\/\/\S+/g, '[enlace oculto]').replace(/key=\w+/gi, 'key=[oculta]')

const ft = async (url, options = {}) => {
  const c = new AbortController()
  const t = setTimeout(() => c.abort(), TIMEOUT)
  try { const r = await fetch(url, { ...options, signal: c.signal }); clearTimeout(t); return r }
  catch (e) { clearTimeout(t); throw e }
}

const handler = async (m, { conn }) => {
  const datas = global
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`))
  const tradutor = _translate.plugins.herramientas_readqrcode

  const q = m.quoted ? m.quoted : m
  const mime = (q.msg || q).mimetype || ''
  if (!/^image\//i.test(mime)) throw tradutor.texto1
  const img = await q.download?.()
  if (!img) throw tradutor.texto1

  try {
    const res = await ft(SERVER_URL + '/api/qr', {
      method: 'POST',
      headers: DL_HEADERS,
      body: JSON.stringify({ image: img.toString('base64') })
    })
    if (!res.ok) throw new Error('Error del servidor')
    const data = await res.json()
    if (!data.status || !data.text) throw new Error(data.error || 'QR no detectado')
    await m.reply(`${tradutor.texto2} ${data.text}`)
  } catch (e) {
    throw tradutor.texto1 + '\n' + ocultar(e.message || e)
  }
}
handler.command = /^(readqr)$/i
export default handler