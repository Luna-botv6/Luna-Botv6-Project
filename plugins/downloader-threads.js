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
const TIMEOUT = 45000

const ocultar = (m) => String(m || '').replace(/https?:\/\/\S+/g, '[enlace oculto]').replace(/key=\w+/gi, 'key=[oculta]')

const ft = async (url, options = {}) => {
  const c = new AbortController()
  const t = setTimeout(() => c.abort(), TIMEOUT)
  try { const r = await fetch(url, { ...options, signal: c.signal }); clearTimeout(t); return r }
  catch (e) { clearTimeout(t); throw e }
}

const handler = async (m, { conn, args, command, usedPrefix }) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es')
  const t = _tr?.plugins?.downloader_threads || {}
  if (!args[0]) throw (t.sin_enlace || '*Ingresa un enlace de Threads*')
  try {
    const res = await ft(`${SERVER_URL}/api/social/threads?url=${encodeURIComponent(args[0].trim())}`, { headers: DL_HEADERS })
    const j = await res.json()
    if (j.status && j.data?.media?.length) {
      const media = j.data.media
      const txtresthreads = (t.info ? t.info
        .replace('{usuario}', j.data.username || '-')
        .replace('{descripcion}', j.data.description || '-')
        .replace('{likes}', j.data.likes || '-')
        .replace('{verificado}', j.data.is_verified ? '√' : '×')
        .replace('{archivos}', media.length || '-')
        .replace('{enlace}', args[0].trim()) : null) ||
        `亗 T H R E A D S\n\n*Usuario :* ${j.data.username || '-'}\n*Descripción :* ${j.data.description || '-'}\n*Likes :* ${j.data.likes || '-'}\n*Verificado :* ${j.data.is_verified ? '√' : '×'}\n*Archivos :* ${media.length || '-'}\n*Enlace :* ${ocultar(args[0].trim())}`
      await conn.sendMessage(m.chat, { text: txtresthreads }, { quoted: m })
      for (const item of media) {
        if (item.type === 'image') {
          await conn.sendMessage(m.chat, { image: { url: item.url } }, { quoted: m })
        } else if (item.type === 'video') {
          await conn.sendMessage(m.chat, { video: { url: item.url } }, { quoted: m })
        }
      }
    } else {
      await conn.sendMessage(m.chat, { text: (t.sin_resultados?.replace('{enlace}', args[0]) || '*🍟 Sin resultados para :* ' + args[0]) }, { quoted: m })
    }
  } catch (err) {
    console.log(new Error(err).message)
  }
}

handler.command = /^(threadsd|threads|threaddl|thread)$/i

export default handler