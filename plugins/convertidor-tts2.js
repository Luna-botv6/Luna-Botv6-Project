import fs from 'fs'
import fetch from 'node-fetch'
import { obtenerMenuIuman, verificarMenuIuman } from '../src/assets/images/menu/languages/es/menu-img.js'
import { cargarOGenerarAPIKey } from '../src/libraries/api/apiKeyManager.js'
import { mp3BufferToOggOpus } from '../lib/funcion/ttsHelper.js'

const configContent = fs.readFileSync('./config.js', 'utf-8')
if (!configContent.includes('Luna-Botv6')) throw new Error('Handler bloqueado')
try { verificarMenuIuman() } catch { throw new Error('Archivo de configuracion o clave faltante') }

const SERVER_URL = obtenerMenuIuman()
const API_KEY = cargarOGenerarAPIKey()
const DL_HEADERS = { 'X-Client-Name': 'luna-bot-v6', 'X-API-Key': API_KEY }
const TIMEOUT = 45000

const VOCES = [
  { id: 'es-AR-TomasNeural', alias: ['tomas', 'tomi', 'arg'], nombre: 'Tomás 🇦🇷' },
  { id: 'es-AR-ElenaNeural', alias: ['elena', 'argentina'], nombre: 'Elena 🇦🇷' },
  { id: 'es-MX-JorgeNeural', alias: ['jorge', 'mex'], nombre: 'Jorge 🇲🇽' },
  { id: 'es-MX-DaliaNeural', alias: ['dalia', 'mexico'], nombre: 'Dalia 🇲🇽' },
  { id: 'es-ES-AlvaroNeural', alias: ['alvaro', 'esp'], nombre: 'Álvaro 🇪🇸' },
  { id: 'es-ES-ElviraNeural', alias: ['elvira', 'espana'], nombre: 'Elvira 🇪🇸' },
  { id: 'es-CO-SalomeNeural', alias: ['salome', 'col'], nombre: 'Salomé 🇨🇴' },
  { id: 'es-CL-CatalinaNeural', alias: ['catalina', 'chile'], nombre: 'Catalina 🇨🇱' },
  { id: 'en-US-AriaNeural', alias: ['aria', 'ingles'], nombre: 'Aria 🇺🇸' },
  { id: 'en-US-GuyNeural', alias: ['guy', 'english'], nombre: 'Guy 🇺🇸' },
  { id: 'pt-BR-FranciscaNeural', alias: ['francisca', 'brasil'], nombre: 'Francisca 🇧🇷' },
  { id: 'pt-BR-AntonioNeural', alias: ['antonio', 'portugues'], nombre: 'Antonio 🇧🇷' },
]
const VOZ_DEFECTO = 'es-AR-TomasNeural'

const ft = async (url, headers = {}) => {
  const c = new AbortController()
  const timer = setTimeout(() => c.abort(), TIMEOUT)
  try { const r = await fetch(url, { signal: c.signal, headers }); clearTimeout(timer); return r }
  catch (e) { clearTimeout(timer); throw e }
}

const handler = async (m, { conn, usedPrefix, command, text }) => {
  const idioma = global.db.data.users[m.sender]?.language || global.defaultLenguaje
  let t = {}
  try {
    const _tr = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`))
    t = _tr.plugins?.convertidor_tts2 || {}
  } catch {}

  const entrada = (text || m.quoted?.text || '').trim()
  const lista = VOCES.map(v => `◉ *${v.alias[0]}* — ${v.nombre}`).join('\n')

  if (!entrada) {
    return conn.sendMessage(m.chat, {
      text: `${t.titulo || '🎙️ *Texto a voz (Luna)*'}\n\n${t.uso || '*Uso:*'} *${usedPrefix + command} <voz> | <texto>*\n${t.ejemplo || '*Ejemplo:*'} *${usedPrefix + command} elena | ¡Hola, soy Luna!*\n\n${t.voces || '*Voces disponibles:*'}\n${lista}`
    }, { quoted: m })
  }

  let voz = VOZ_DEFECTO
  let contenido = entrada
  const partes = entrada.split('|')
  if (partes.length >= 2) {
    const clave = partes[0].trim().toLowerCase()
    const enc = VOCES.find(v => v.alias.includes(clave) || v.id.toLowerCase() === clave)
    if (enc) {
      voz = enc.id
      contenido = partes.slice(1).join('|').trim()
    }
  }

  if (!contenido) {
    return conn.sendMessage(m.chat, { text: t.faltaTexto || '❌ Falta el texto a convertir.' }, { quoted: m })
  }

  let buffer
  try {
    const res = await ft(`${SERVER_URL}/api/tts?text=${encodeURIComponent(contenido)}&voice=${encodeURIComponent(voz)}`, DL_HEADERS)
    if (!res.ok) throw new Error('HTTP ' + res.status)
    const tipo = res.headers.get('content-type') || ''
    if (!/audio|mpeg|octet-stream/i.test(tipo)) throw new Error('Respuesta invalida')
    buffer = Buffer.from(await res.arrayBuffer())
    if (buffer.length < 1000) throw new Error('Audio vacio')
    buffer = await mp3BufferToOggOpus(buffer)
  } catch {
    throw (t.error || '❌ No se pudo generar el audio. Intenta de nuevo en un momento.')
  }

  await conn.sendMessage(m.chat, { audio: buffer, mimetype: 'audio/ogg; codecs=opus', ptt: true }, { quoted: m })
}

handler.help = ['tts2 <voz> | <texto>', 'tts2', 'tts', 'gtts', 'voz', 'tts3', 'ttsc']
handler.tags = ['tools']
handler.command = /^(g?tts2?|voz|tts3|ttsc)$/i
export default handler
