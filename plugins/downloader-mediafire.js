import axios from 'axios'
import fs from 'fs'
import fetch from 'node-fetch'
import { obtenerMenuIuman, verificarMenuIuman } from '../src/assets/images/menu/languages/es/menu-img.js'
import { cargarOGenerarAPIKey } from '../src/libraries/api/apiKeyManager.js'

const configContent = fs.readFileSync('./config.js', 'utf-8')
if (!configContent.includes('Luna-Botv6')) throw new Error('Handler bloqueado')
try { verificarMenuIuman() } catch { throw new Error('Archivo de configuracion faltante o invalido') }

const SERVER_URL = obtenerMenuIuman()
const API_KEY = cargarOGenerarAPIKey()
const DL_HEADERS = { 'X-Client-Name': 'luna-bot-v6', 'X-API-Key': API_KEY }
const TIMEOUT = 30000

const ft = async (url, headers = {}) => {
	const c = new AbortController()
	const t = setTimeout(() => c.abort(), TIMEOUT)
	try { const r = await fetch(url, { signal: c.signal, headers }); clearTimeout(t); return r }
	catch (e) { clearTimeout(t); throw e }
}

const handler = async (m, { conn, args, usedPrefix, command }) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es')
  const t = _tr?.plugins?.downloader_mediafire || {}
  if (!args[0]) {
    const ejemplo = usedPrefix + command
    throw t.uso?.replace('{ejemplo}', ejemplo) || `_*< DESCARGAS - MEDIAFIRE />*_\n\n*[ ℹ️ ] Ingresa un enlace de MediaFire.*\n\n*[ 💡 ] Ejemplo:* ${ejemplo} http://www.mediafire.com/file/7a28wroqlhtfws7/archivo.jpeg`
  }

  const url = args[0].trim()

  if (!/^https?:\/\/(www\.)?mediafire\.com\/file\//i.test(url)) {
    return m.reply(t.url_invalida || '❌ *Ese no es un enlace válido de MediaFire.*\n\nDebe tener el formato:\nhttp://www.mediafire.com/file/xxxxx/nombre.ext')
  }

  let statusMsg

  try {
    statusMsg = await conn.sendMessage(m.chat, { text: t.buscando?.replace('{barra}', barraProgreso(0)) || `🔎 *Buscando el enlace de descarga...*\n${barraProgreso(0)}` }, { quoted: m })

    const info = await mediafireDl(url)

    await editarEstado(conn, m, statusMsg, t.iniciando?.replace('{nombre}', info.name).replace('{tamano}', info.size).replace('{barra}', barraProgreso(0)) || `📄 *${info.name}*\n📦 ${info.size}\n\n⬇️ *Iniciando descarga...*\n${barraProgreso(0)}`)

    let ultimoPorcentaje = 0
    const buffer = await descargarArchivo(info.link, async (porcentaje) => {
      if (porcentaje - ultimoPorcentaje >= 10 || porcentaje === 100) {
        ultimoPorcentaje = porcentaje
        await editarEstado(conn, m, statusMsg, t.descargando?.replace('{nombre}', info.name).replace('{tamano}', info.size).replace('{barra}', barraProgreso(porcentaje)) || `📄 *${info.name}*\n📦 ${info.size}\n\n⬇️ *Descargando...*\n${barraProgreso(porcentaje)}`)
      }
    })

    if (!buffer || buffer.length === 0) {
      throw new Error('El archivo descargado está vacío')
    }

    await editarEstado(conn, m, statusMsg, t.enviando?.replace('{nombre}', info.name).replace('{tamano}', info.size).replace('{barra}', barraProgreso(100)) || `📄 *${info.name}*\n📦 ${info.size}\n\n📤 *Enviando archivo...*\n${barraProgreso(100)}`)

    const caption = t.caption?.replace('{nombre}', info.name).replace('{tamano}', info.size).replace('{fecha}', info.date).replace('{mime}', info.mime) || `*✅ DESCARGA COMPLETA - MEDIAFIRE*\n\n📄 *Nombre:* ${info.name}\n📦 *Tamaño:* ${info.size}\n🗓️ *Fecha:* ${info.date}\n🧬 *Tipo:* ${info.mime}`

    await conn.sendFile(m.chat, buffer, info.name, caption, m, null, { mimetype: info.mime, asDocument: true })

    await editarEstado(conn, m, statusMsg, t.enviado?.replace('{nombre}', info.name).replace('{barra}', barraProgreso(100)) || `✅ *${info.name}* enviado correctamente.\n${barraProgreso(100)}`)

  } catch (error) {
    const textoError = t.error?.replace('{error}', error.message) || `❌ *No se pudo procesar el enlace de MediaFire.*\n\n🧾 *Detalle:* ${error.message}`
    if (statusMsg) {
      await editarEstado(conn, m, statusMsg, textoError)
    } else {
      await m.reply(textoError)
    }
  }
}

function barraProgreso(porcentaje) {
  const totalBloques = 10
  const llenos = Math.round((porcentaje / 100) * totalBloques)
  const vacios = totalBloques - llenos
  return `🟩`.repeat(llenos) + `⬜`.repeat(vacios) + ` ${porcentaje}%`
}

async function editarEstado(conn, m, statusMsg, texto) {
  try {
    await conn.sendMessage(m.chat, { text: texto, edit: statusMsg.key })
  } catch (error) {
    await m.reply(texto)
  }
}

handler.command = /^(mediafire|mediafiredl|dlmediafire)$/i
export default handler

async function mediafireDl(url) {
  const res = await ft(SERVER_URL + '/api/mediafire?url=' + encodeURIComponent(url), DL_HEADERS)
  const data = await res.json()
  if (!data.status) throw new Error(data.error || 'No se pudo resolver el enlace de MediaFire')
  return { name: data.name, size: data.size, date: data.date, mime: data.mime, link: data.link }
}

async function descargarArchivo(link, onProgreso) {
  const response = await axios.get(link, {
    responseType: 'arraybuffer',
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
    timeout: 60000,
    maxContentLength: 200 * 1024 * 1024,
    maxBodyLength: 200 * 1024 * 1024,
    onDownloadProgress: (progressEvent) => {
      if (progressEvent.total && onProgreso) {
        const porcentaje = Math.floor((progressEvent.loaded / progressEvent.total) * 100)
        onProgreso(porcentaje)
      }
    }
  })
  return Buffer.from(response.data)
}